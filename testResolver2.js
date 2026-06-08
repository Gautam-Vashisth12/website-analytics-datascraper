const { resolveUrl } = require('./ScannerBackend/src/services/urlResolver');

async function run() {
  const urls = [
    'http://127.0.0.1',
    'localhost:8080',
    'abc',
    'http://169.254.169.254/latest/meta-data',
    'google.com'
  ];
  for (const u of urls) {
    try {
      const res = await resolveUrl(u);
      console.log(`[PASS] ${u} -> ${res.resolvedUrl}`);
    } catch(e) {
      console.log(`[FAIL] ${u}: ${e.message} (${e.code})`);
    }
  }
}
run();
