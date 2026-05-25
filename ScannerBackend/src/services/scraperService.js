const { chromium } = require("playwright");

async function scrapeWebsite(url) {
  const browser = await chromium.launch({headless: true, });

  const page = await browser.newPage();

  const start = Date.now();
  const response = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  });
  const loadTime = Date.now() - start;

  const securityHeaders = {
    csp:
      response.headers()["content-security-policy"] || null,

    xFrame:
      response.headers()["x-frame-options"] || null,
  };

  const usesHttps = url.startsWith("https");

  const title = await page.title();
  const imageCount = await page.locator("img").count();
  const linkCount = await page.locator("a").count();

  const headers = await page.evaluate(() => {
  return {
      h1: document.querySelector("h1")?.innerText || null,
    };
  });

  let description = null;

  const metaTag = await page.$('meta[name="description"]');

  if (metaTag) {
    description = await metaTag.getAttribute("content");
  }

  await browser.close();

  return {
    title,
    description,
    loadTime,
    imageCount,
    linkCount,
    headers,
    securityHeaders,
    usesHttps,
  };
}

module.exports = {
  scrapeWebsite,
};