const { chromium } = require("playwright");

class ScrapeError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ScrapeError";
    this.details = details;
  }
}

function getRedirectCount(response) {
  let count = 0;
  let request = response?.request();

  while (request?.redirectedFrom()) {
    count += 1;
    request = request.redirectedFrom();
  }

  return count;
}

async function scrapeWebsite(url, options = {}) {
  const timeout = options.timeout || 15000;
  const maxRetries = options.retries ?? 1;
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--single-process",
      "--no-zygote",
    ],
    });

    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const page = await browser.newPage();

      try {
        const start = Date.now();
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout,
        });
        const loadTime = Date.now() - start;
        const responseHeaders = response ? response.headers() : {};
        const status = response ? response.status() : null;
        const redirectCount = getRedirectCount(response);

        const pageData = await page.evaluate(() => {
          const getAbsoluteUrl = (value) => {
            if (!value) {
              return null;
            }

            try {
              return new URL(value, window.location.href).href;
            } catch {
              return value;
            }
          };

          const images = Array.from(document.querySelectorAll("img")).map((image) => ({
            alt: image.getAttribute("alt"),
            src: getAbsoluteUrl(image.getAttribute("src")),
            loading: image.getAttribute("loading"),
          }));

          const links = Array.from(document.querySelectorAll("a")).map((link) => ({
            href: link.href,
            text: link.innerText.trim(),
          }));

          const scripts = Array.from(document.querySelectorAll("script")).map((script) => ({
            src: getAbsoluteUrl(script.getAttribute("src")),
            content: script.innerText.slice(0, 500),
            async: script.async,
            defer: script.defer,
            type: script.type || null,
          }));

          const stylesheets = Array.from(
            document.querySelectorAll('link[rel="stylesheet"]')
          ).map((stylesheet) => ({
            href: getAbsoluteUrl(stylesheet.getAttribute("href")),
          }));

          const iframes = Array.from(document.querySelectorAll("iframe")).map((iframe) => ({
            src: getAbsoluteUrl(iframe.getAttribute("src")),
            title: iframe.getAttribute("title"),
          }));

          const metaTags = Array.from(document.querySelectorAll("meta")).map((meta) => ({
            name: meta.getAttribute("name"),
            property: meta.getAttribute("property"),
            content: meta.getAttribute("content"),
          }));

          const forms = Array.from(document.querySelectorAll("form")).map((form) => ({
            action: getAbsoluteUrl(form.getAttribute("action")) || window.location.href,
            method: form.method,
          }));

          const icons = Array.from(
            document.querySelectorAll('link[rel~="icon"], link[rel="shortcut icon"]')
          ).map((icon) => ({
            href: getAbsoluteUrl(icon.getAttribute("href")),
            rel: icon.getAttribute("rel"),
          }));

          const canonical = document.querySelector('link[rel="canonical"]');
          const windowGlobals = {
            hasReactDevToolsHook: Boolean(window.__REACT_DEVTOOLS_GLOBAL_HOOK__),
            hasNextData: Boolean(window.__NEXT_DATA__),
            hasVue: Boolean(window.Vue || window.__VUE__),
            hasAngular:
              Boolean(window.angular) ||
              Boolean(window.getAllAngularRootElements) ||
              Boolean(document.querySelector("[ng-version]")),
            hasGoogleTagManager: Boolean(window.google_tag_manager || window.dataLayer),
            hasGoogleAnalytics: Boolean(window.ga || window.gtag),
            hasMetaPixel: Boolean(window.fbq),
            hasHotjar: Boolean(window.hj || window._hjSettings),
            hasShopify: Boolean(window.Shopify),
          };

          return {
            title: document.title,
            html: document.documentElement.outerHTML,
            h1Texts: Array.from(document.querySelectorAll("h1")).map((heading) =>
              heading.innerText.trim()
            ),
            canonicalUrl: canonical ? getAbsoluteUrl(canonical.getAttribute("href")) : null,
            images,
            links,
            scripts,
            stylesheets,
            iframes,
            metaTags,
            forms,
            icons,
            windowGlobals,
          };
        });

        const finalUrl = page.url();
        await page.close();

        return {
          url,
          finalUrl,
          loadTime,
          status,
          redirectCount,
          headers: responseHeaders,
          scrapeAttempts: attempt + 1,
          ...pageData,
        };
      } catch (error) {
        lastError = error;
        await page.close().catch(() => {});
      }
    }

    throw new ScrapeError("Website could not be scanned", {
      reason: lastError?.message || "Unknown Playwright failure",
      timeout,
      attempts: maxRetries + 1,
    });
  } catch (error) {
    console.error("SCRAPER ERROR:", error);
    console.error("SCRAPER ERROR:");
    console.error(error);
    console.error(error.stack);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = {
  ScrapeError,
  scrapeWebsite,
};
