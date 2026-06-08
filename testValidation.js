const net = require("net");
const dns = require("dns").promises;

class ResolverError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "ResolverError";
    this.code = code;
  }
}

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

function isValidHostname(hostname) {
  if (!hostname || typeof hostname !== "string") return false;
  if (hostname.includes("..") || hostname.startsWith(".") || hostname.endsWith(".")) {
    return false;
  }

  if (net.isIP(hostname)) {
    return true; 
  }

  const parts = hostname.split(".");
  if (parts.length < 2) return false; 

  const tld = parts[parts.length - 1];
  if (!/^[a-zA-Z]{2,}$/.test(tld)) return false;

  const restrictedTlds = ["local", "localhost", "test", "invalid", "internal", "lan"];
  if (restrictedTlds.includes(tld.toLowerCase())) return false;

  return true;
}

function getRestrictedIpMessage(ip) {
  if (ip.startsWith("127.") || ip === "::1" || ip === "0:0:0:0:0:0:0:1" || ip.toLowerCase().startsWith("::ffff:127.")) {
    return "Local addresses cannot be scanned.";
  } else if (ip.startsWith("10.") || ip.startsWith("192.168.") || (ip.startsWith("172.") && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31)) {
    return "Private network addresses cannot be scanned.";
  }
  return "Restricted address cannot be scanned.";
}

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

async function runTests() {
  const tests = [
    "localhost", "127.0.0.1", "10.0.0.1", "169.254.169.254", "test", "invalid..domain", "google.com", "example.com"
  ];
  for (const t of tests) {
    try {
      await validateHost(t);
      console.log(`[PASS] ${t} is valid`);
    } catch(e) {
      console.log(`[FAIL] ${t}: ${e.message} (${e.code})`);
    }
  }
}
runTests();