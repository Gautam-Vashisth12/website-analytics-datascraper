/**
 * Performs a lightweight reachability check on a given URL.
 * Uses a HEAD request initially, falling back to a lightweight GET request
 * if HEAD is rejected (e.g., 405 Method Not Allowed) or fails.
 * 
 * @param {string} url - The URL to test
 * @returns {Promise<boolean>} - True if the server responds with a successful status, false otherwise
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

  let response;
  try {
    response = await performRequest("HEAD");
    if (response.status === 405) {
      response = await performRequest("GET");
    }
  } catch (error) {
    try {
      response = await performRequest("GET");
    } catch (fallbackError) {
      return false;
    }
  }

  // Explicitly check for successful reachability status codes
  const validStatuses = [200, 201, 202, 204, 301, 302, 307, 308, 401, 403];
  return validStatuses.includes(response.status);
}

/**
 * Takes a user-provided URL string and determines the correct reachable URL
 * (preferring HTTPS over HTTP) without performing a full page scrape.
 * 
 * @param {string} inputUrl - The raw URL string from the frontend
 * @returns {Promise<{userInput: string, resolvedUrl: string}>} - The resolved, reachable URL object
 * @throws {Error} - If no candidates are reachable
 */
async function resolveUrl(inputUrl) {
  const trimmed = (inputUrl || "").toString().trim();

  const candidates = /^https?:\/\//i.test(trimmed)
    ? [trimmed]
    : [`https://${trimmed}`, `http://${trimmed}`];

  for (const candidate of candidates) {
    let parsedUrl;
    try {
      parsedUrl = new URL(candidate);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        continue;
      }
    } catch (e) {
      continue; // Skip invalid generated candidates
    }

    const isReachable = await checkReachability(candidate);
    if (isReachable) {
      return {
        userInput: inputUrl,
        resolvedUrl: candidate
      };
    }
  }

  throw new Error("Unable to reach website.");
}

module.exports = {
  resolveUrl,
  checkReachability,
};
