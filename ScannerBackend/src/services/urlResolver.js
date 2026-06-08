const net = require("net");
const dns = require("dns").promises;

class ResolverError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "ResolverError";
    this.code = code;
  }
}

/**
 * Checks if an IP is restricted (localhost, private network, cloud metadata).
 */
function isRestrictedIP(ip) {
  if (!net.isIP(ip)) return false;

  if (net.isIPv4(ip)) {
    if (ip === "255.255.255.255") return true;
    
    const parts = ip.split(".");
    const first = parseInt(parts[0], 10);
    const second = parseInt(parts[1], 10);

    if (first === 0) return true; // 0.0.0.0/8
    if (first === 127) return true; // 127.0.0.0/8
    if (first === 10) return true; // 10.0.0.0/8
    if (first === 172 && second >= 16 && second <= 31) return true; // 172.16.0.0/12
    if (first === 192 && second === 168) return true; // 192.168.0.0/16
    if (first === 169 && second === 254) return true; // 169.254.0.0/16
    
    return false;
  }

  if (net.isIPv6(ip)) {
    const lowerIP = ip.toLowerCase();
    if (lowerIP === "::1" || lowerIP === "0:0:0:0:0:0:0:1") return true;
    if (lowerIP.startsWith("fc") || lowerIP.startsWith("fd")) return true; // fc00::/7
    if (lowerIP.startsWith("fe8") || lowerIP.startsWith("fe9") || lowerIP.startsWith("fea") || lowerIP.startsWith("feb")) return true; // fe80::/10
    
    if (lowerIP.startsWith("::ffff:")) {
      const ipv4Part = lowerIP.substring(7);
      return isRestrictedIP(ipv4Part);
    }
    return false;
  }

  return false;
}

/**
 * Validates the basic hostname structure for a public domain.
 */
function isValidHostname(hostname) {
  if (!hostname || typeof hostname !== "string") return false;
  if (hostname.includes("..") || hostname.startsWith(".") || hostname.endsWith(".")) {
    return false;
  }

  if (net.isIP(hostname)) {
    return true; // We validate IP restriction separately
  }

  const parts = hostname.split(".");
  if (parts.length < 2) return false; // simple strings like 'localhost', 'test' rejected

  const tld = parts[parts.length - 1];
  if (!/^[a-zA-Z]{2,}$/.test(tld)) return false;

  // Additional checks to ensure public domain 
  // (we block 'localhost', 'internal', 'test' etc via the TLD and simple string check)
  const restrictedTlds = ["local", "localhost", "test", "invalid", "internal", "lan"];
  if (restrictedTlds.includes(tld.toLowerCase())) return false;

  return true;
}

/**
 * Returns specific error message based on the restricted IP.
 */
function getRestrictedIpMessage(ip) {
  if (ip.startsWith("127.") || ip === "::1" || ip === "0:0:0:0:0:0:0:1" || ip.toLowerCase().startsWith("::ffff:127.")) {
    return "Local addresses cannot be scanned.";
  } else if (ip.startsWith("10.") || ip.startsWith("192.168.") || (ip.startsWith("172.") && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31)) {
    return "Private network addresses cannot be scanned.";
  }
  return "Restricted address cannot be scanned.";
}

/**
 * Validates the host by checking DNS records and ensuring the resolved IPs are not restricted.
 */
async function validateHost(hostname) {
  const lowerHostname = hostname.toLowerCase();
  
  if (lowerHostname === "localhost") {
    throw new ResolverError("Local addresses cannot be scanned.", "RESTRICTED_TARGET");
  }

  if (!isValidHostname(hostname)) {
    throw new ResolverError("Please enter a valid public website.", "INVALID_HOSTNAME");
  }

  if (net.isIP(hostname)) {
    if (isRestrictedIP(hostname)) {
      throw new ResolverError(getRestrictedIpMessage(hostname), "RESTRICTED_TARGET");
    }
    return;
  }

  try {
    const records = await dns.lookup(hostname, { all: true });
    if (!records || records.length === 0) {
      throw new ResolverError("Domain does not resolve.", "DOMAIN_NOT_RESOLVED");
    }

    for (const record of records) {
      if (isRestrictedIP(record.address)) {
        throw new ResolverError(getRestrictedIpMessage(record.address), "RESTRICTED_TARGET");
      }
    }
  } catch (error) {
    if (error instanceof ResolverError) {
      throw error;
    }
    if (error.code === 'ENOTFOUND') {
      throw new ResolverError("Domain does not resolve.", "DOMAIN_NOT_RESOLVED");
    }
    throw new ResolverError("Error resolving domain.", "DOMAIN_RESOLUTION_ERROR");
  }
}

/**
 * Performs a lightweight reachability check on a given URL.
 * Uses a HEAD request initially, falling back to a lightweight GET request
 * if HEAD is rejected (e.g., 405 Method Not Allowed) or fails.
 * 
 * @param {string} url - The URL to test
 * @returns {Promise<boolean>} - True if the server responds with a successful status, throws otherwise
 */
async function checkReachability(url) {
  const performRequest = async (method) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(url, {
        method,
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; WebsiteIntelligenceScanner/1.0)",
        },
      });
      // Abort response body download if it's GET
      if (method === "GET" && response.body && !response.bodyUsed) {
        try {
          // Some environments may not support body cancellation
          await response.body.cancel();
        } catch (e) {
          // Ignore cancellation errors
        }
      }
      return response;
    } finally {
      clearTimeout(id);
    }
  };

  // Explicitly check for successful reachability status codes
  const validStatuses = [200, 201, 202, 204, 301, 302, 307, 308, 401, 403];

  let response;
  try {
    response = await performRequest("HEAD");
    if (!validStatuses.includes(response.status)) {
      response = await performRequest("GET");
    }
  } catch (error) {
    if (error.name === "AbortError" || error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
      throw new ResolverError("Connection timed out.", "CONNECTION_TIMEOUT");
    }
    if (error.cause?.code === 'ECONNREFUSED') {
      throw new ResolverError("Connection refused.", "CONNECTION_REFUSED");
    }
    try {
      response = await performRequest("GET");
    } catch (fallbackError) {
      if (fallbackError.name === "AbortError" || fallbackError.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
        throw new ResolverError("Connection timed out.", "CONNECTION_TIMEOUT");
      }
      if (fallbackError.cause?.code === 'ECONNREFUSED') {
        throw new ResolverError("Connection refused.", "CONNECTION_REFUSED");
      }
      throw new ResolverError("Website is not publicly reachable.", "NOT_REACHABLE");
    }
  }

  if (response && validStatuses.includes(response.status)) {
    return true;
  }
  
  throw new ResolverError("Website is not publicly reachable.", "NOT_REACHABLE");
}

/**
 * Takes a user-provided URL string and determines the correct reachable URL
 * (preferring HTTPS over HTTP) without performing a full page scrape.
 * 
 * @param {string} inputUrl - The raw URL string from the frontend
 * @returns {Promise<{userInput: string, resolvedUrl: string}>} - The resolved, reachable URL object
 * @throws {Error} - If no candidates are reachable or input is invalid
 */
async function resolveUrl(inputUrl) {
  const trimmed = (inputUrl || "").toString().trim();

  if (!trimmed) {
    throw new ResolverError("Please enter a valid public website.", "INVALID_HOSTNAME");
  }

  let parsedUrl;
  try {
    const urlToParse = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    parsedUrl = new URL(urlToParse);
  } catch (error) {
    throw new ResolverError("Please enter a valid public website.", "INVALID_HOSTNAME");
  }

  // Perform SSRF checks before continuing
  await validateHost(parsedUrl.hostname);

  const candidates = /^https?:\/\//i.test(trimmed)
    ? [trimmed]
    : [`https://${trimmed}`, `http://${trimmed}`];

  let lastError = null;

  for (const candidate of candidates) {
    try {
      // Re-parse candidate to ensure protocol is valid before checking reachability
      const candidateUrl = new URL(candidate);
      if (!["http:", "https:"].includes(candidateUrl.protocol)) {
        continue;
      }
      
      const isReachable = await checkReachability(candidate);
      if (isReachable) {
        return {
          userInput: inputUrl,
          resolvedUrl: candidate
        };
      }
    } catch (error) {
      if (error instanceof ResolverError) {
        lastError = error;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new ResolverError("Unable to reach website.", "UNREACHABLE_URL");
}

module.exports = {
  resolveUrl,
  checkReachability,
  ResolverError
};
