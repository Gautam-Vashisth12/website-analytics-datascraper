const express = require('express');
const scanRoutes = require('./src/routes/scanRoutes');
const scraperService = require('./src/services/scraperService');
const urlResolver = require('./src/services/urlResolver');

const app = express();
app.use(express.json());
app.use('/api/scan', scanRoutes);

async function runTests() {
  const server = app.listen(3002);
  console.log("Server running on 3002 for tests");

  // Mock resolveUrl to pass through
  const originalResolve = urlResolver.resolveUrl;
  urlResolver.resolveUrl = async (url) => {
    return { userInput: url, resolvedUrl: url };
  };

  // Mock scraper for Scenario A (timeout)
  const originalScrape = scraperService.scrapeWebsite;
  scraperService.scrapeWebsite = async (url) => {
    if (url === "http://timeout.local") {
      return {
        url,
        finalUrl: url,
        loadTime: 30000,
        status: null,
        redirectCount: 0,
        headers: {},
        documentResponses: [],
        firstDocumentResponse: null,
        finalDocumentResponse: null,
        finalHeaders: {},
        redirectChain: [],
        securityDebug: {},
        scrapeAttempts: 1,
        warnings: [{ code: "NAVIGATION_TIMEOUT", message: "Timeout" }],
        title: null, html: "", h1Texts: [], canonicalUrl: null, images: [], links: [],
        scripts: [], stylesheets: [], classNames: [], iframes: [], metaTags: [], forms: [], icons: [], windowGlobals: {}
      };
    }
    return originalScrape(url);
  };

  // Run Scenario A
  console.log("--- Scenario A: Navigation Timeout ---");
  let res = await fetch("http://localhost:3002/api/scan", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: "http://timeout.local" })
  });
  let data = await res.json();
  console.log(`Success: ${data.success}`);
  if (!data.success) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(`Warnings: ${data.warnings.map(w => w.code).join(', ')}`);
  }

  // Scenario B: Technology Analyzer throws
  const techAnalyzer = require('./src/services/analyzers/technologyAnalyzer');
  const origTech = techAnalyzer.analyzeTechnologies;
  techAnalyzer.analyzeTechnologies = () => { throw new Error("Tech analyzer crashed"); };
  
  console.log("--- Scenario B: Tech Analyzer Fails ---");
  scraperService.scrapeWebsite = async (url) => {
    return {
      url, finalUrl: url, loadTime: 100, status: 200, redirectCount: 0, headers: {},
      documentResponses: [], firstDocumentResponse: null, finalDocumentResponse: null,
      finalHeaders: {}, redirectChain: [], securityDebug: {}, scrapeAttempts: 1, warnings: [],
      title: "Test", html: "<html></html>", h1Texts: [], canonicalUrl: null, images: [], links: [],
      scripts: [], stylesheets: [], classNames: [], iframes: [], metaTags: [], forms: [], icons: [], windowGlobals: {}
    };
  };

  res = await fetch("http://localhost:3002/api/scan", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: "http://example.com" })
  });
  data = await res.json();
  console.log(`Success: ${data.success}`);
  console.log(`Warnings: ${data.warnings.map(w => w.code).join(', ')}`);
  
  // Cleanup
  server.close();
  process.exit(0);
}

runTests();