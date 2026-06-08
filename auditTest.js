const { resolveUrl } = require('./ScannerBackend/src/services/urlResolver');

async function testAudit() {
  const tests = [
    // 1. Legitimate public websites
    "google.com",
    "example.com",
    
    // 2. Public cloud-hosted websites & CDNs
    "vercel.com",
    "netlify.com",
    "aws.amazon.com",
    "azure.microsoft.com",
    "cloudflare.com",
    "fastly.com",
    
    // 3. Subdomains
    "blog.cloudflare.com",
    "www.example.com",
    "docs.github.com"
  ];

  console.log("--- URL Resolution Audit ---");
  for (const url of tests) {
    try {
      const result = await resolveUrl(url);
      console.log(`[PASS] ${url} resolved to ${result.resolvedUrl}`);
    } catch (e) {
      console.log(`[FAIL] ${url}: ${e.message} (${e.code})`);
    }
  }
}

testAudit();
