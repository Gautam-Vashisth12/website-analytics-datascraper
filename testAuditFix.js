const { resolveUrl } = require('./ScannerBackend/src/services/urlResolver');

async function runTests() {
  const tests = [
    "google.com",
    "github.com",
    "azure.microsoft.com",
    "cloudflare.com",
    "docs.github.com",
    "blog.cloudflare.com"
  ];

  console.log("--- Validation Tests ---");
  for (const url of tests) {
    try {
      const result = await resolveUrl(url);
      console.log(`[PASS] ${url} resolved to ${result.resolvedUrl}`);
    } catch (e) {
      console.log(`[FAIL] ${url}: ${e.message} (${e.code})`);
    }
  }
}

runTests();