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

function normalizeHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );
}

let globalBrowser = null;
let browserUseCount = 0;
const MAX_BROWSER_USES = 50;

async function getBrowser() {
  if (!globalBrowser || browserUseCount >= MAX_BROWSER_USES) {
    if (globalBrowser) {
      await globalBrowser.close().catch(() => {});
    }
    console.log("[SCAN] Stage: BrowserLaunch Duration: N/A (Launching new instance)");
    globalBrowser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
    browserUseCount = 0;
  }
  browserUseCount += 1;
  return globalBrowser;
}

async function scrapeWebsite(url, options = {}) {
  const initialTimeout = options.timeout || 25000;
  const maxRetries = options.retries ?? 0; // Default to 0 retries to avoid blowing timeout
  
  const overallStartTime = Date.now();

  try {
    const browser = await getBrowser();
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const elapsed = Date.now() - overallStartTime;
      const timeRemaining = initialTimeout - elapsed;
      
      if (timeRemaining <= 2000) {
        throw new ScrapeError("Scan budget exhausted before attempt", { timeout: initialTimeout });
      }

      const gotoTimeout = Math.max(1000, timeRemaining - 3000); // Leave 3s buffer for extraction

      let context;
      let page;
      const documentResponses = [];

      try {
        context = await browser.newContext();
        page = await context.newPage();

        // Block unnecessary resources for performance without losing intelligence
        await page.route("**/*", (route) => {
          const resourceType = route.request().resourceType();
          if (["image", "media", "font", "other"].includes(resourceType)) {
            route.abort().catch(() => {});
          } else {
            route.continue().catch(() => {});
          }
        });

        page.on("response", async (response) => {
          try {
            const request = response.request();
            if (
              request.resourceType() === "document" &&
              request.frame() === page.mainFrame()
            ) {
              documentResponses.push({
                url: response.url(),
                status: response.status(),
                headers: normalizeHeaders(response.headers()),
              });
            }
          } catch (err) {
            // Ignore capture errors silently to improve performance
          }
        });

        const navStart = Date.now();
        let response = null;
        let navigationError = null;
        const warnings = [];

        try {
          // Use 'load' to ensure async scripts (GA, Pixel) execute and populate window globals.
          // The budget is enforced via gotoTimeout. If it times out, we catch and extract anyway.
          response = await page.goto(url, {
            waitUntil: "load",
            timeout: gotoTimeout,
          });
        } catch (err) {
          navigationError = err;
          let warningCode = "NAVIGATION_ERROR";
          if (err.message && err.message.includes("Timeout")) {
            warningCode = "NAVIGATION_TIMEOUT";
          } else if (err.message && err.message.includes("SSL")) {
            warningCode = "SSL_ERROR";
          } else if (err.message && (err.message.includes("net::") || err.message.includes("connection"))) {
            warningCode = "NETWORK_ERROR";
          }
          
          warnings.push({
            code: warningCode,
            message: `Page navigation incomplete: ${err.message}. Extracting partial results.`,
          });
          console.error(`[SCAN WARNING] Code: ${warningCode} URL: ${url}`);
        }

        const navDuration = Date.now() - navStart;
        console.log(`[SCAN] Stage: Navigation Duration: ${navDuration}ms`);

        const currentUrl = page.url();
        const hasData = documentResponses.length > 0 || (currentUrl && currentUrl !== "about:blank");

        if (!hasData && !response) {
          throw navigationError || new Error("Navigation failed and no data could be captured.");
        }

        const responseHeaders = response ? normalizeHeaders(response.headers()) : {};
        const status = response ? response.status() : (documentResponses.length > 0 ? documentResponses[0].status : null);
        const firstDocumentResponse = documentResponses[0] || null;
        const finalDocumentResponse = documentResponses[documentResponses.length - 1] || null;
        const finalHeaders = finalDocumentResponse?.headers || responseHeaders;
        const redirectChain = documentResponses.slice(0, -1).map((documentResponse) => ({
          url: documentResponse.url,
          status: documentResponse.status,
          headers: documentResponse.headers,
        }));
        const redirectCount = redirectChain.length || getRedirectCount(response);
        const headersFound = Object.keys(finalHeaders);
        const headersSeen = Array.from(
          new Set(
            (documentResponses.length ? documentResponses : [{ headers: finalHeaders }]).flatMap(
              (documentResponse) => Object.keys(documentResponse.headers || {})
            )
          )
        );

        let pageData = {};
        const extractStart = Date.now();
        
        try {
          pageData = await page.evaluate(() => {
            const getAbsoluteUrl = (value) => {
              if (!value) return null;
              try { return new URL(value, window.location.href).href; } catch { return value; }
            };

            // Unbounded collection: Ensure all elements are returned, but store only minimal required data
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
              content: script.innerText || script.textContent || "",
              async: script.async,
              defer: script.defer,
              type: script.type || null,
            }));

            const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((stylesheet) => ({
              href: getAbsoluteUrl(stylesheet.getAttribute("href")),
            }));
            
            const classNames = Array.from(
              new Set(
                Array.from(document.querySelectorAll("[class]")).flatMap((element) =>
                  Array.from(element.classList)
                )
              )
            );

            const iframes = Array.from(document.querySelectorAll("iframe")).map((iframe) => ({
              src: getAbsoluteUrl(iframe.getAttribute("src")),
              title: iframe.getAttribute("title"),
            }));

            const metaTags = Array.from(document.querySelectorAll("meta")).map((meta) => ({
              name: meta.getAttribute("name"),
              property: meta.getAttribute("property"),
              httpEquiv: meta.getAttribute("http-equiv"),
              content: meta.getAttribute("content"),
            }));

            const forms = Array.from(document.querySelectorAll("form")).map((form) => ({
              action: getAbsoluteUrl(form.getAttribute("action")) || window.location.href,
              method: form.method,
            }));

            const icons = Array.from(document.querySelectorAll('link[rel~="icon"], link[rel="shortcut icon"]')).map((icon) => ({
              href: getAbsoluteUrl(icon.getAttribute("href")),
              rel: icon.getAttribute("rel"),
            }));

            const canonical = document.querySelector('link[rel="canonical"]');
            
            // Collect minimal global vars for async scripts
            const windowGlobals = {
              hasReactDevToolsHook: Boolean(window.__REACT_DEVTOOLS_GLOBAL_HOOK__),
              hasNextData: Boolean(window.__NEXT_DATA__),
              hasVue: Boolean(window.Vue || window.__VUE__),
              hasVueDevToolsHook: Boolean(window.__VUE_DEVTOOLS_GLOBAL_HOOK__),
              hasNg: Boolean(window.ng),
              hasAngular: Boolean(window.angular) || Boolean(window.getAllAngularRootElements) || Boolean(document.querySelector("[ng-version]")),
              hasGtag: Boolean(window.gtag),
              hasDataLayer: Boolean(window.dataLayer),
              hasGoogleTagManagerGlobal: Boolean(window.google_tag_manager),
              hasGoogleTagManager: Boolean(window.google_tag_manager || window.dataLayer),
              hasGoogleAnalytics: Boolean(window.ga || window.gtag),
              hasFbq: Boolean(window.fbq),
              hasMetaPixel: Boolean(window.fbq),
              hasHj: Boolean(window.hj),
              hasHjSettings: Boolean(window.hjSettings || window._hjSettings),
              hasHotjar: Boolean(window.hj || window._hjSettings),
              hasLinkedInPartnerId: Boolean(window._linkedin_partner_id),
              hasLinkedInDataPartnerIds: Boolean(window._linkedin_data_partner_ids),
              hasLintrk: Boolean(window.lintrk),
              hasShopify: Boolean(window.Shopify),
            };

            return {
              title: document.title,
              html: document.documentElement.outerHTML, // Unbounded string to preserve regex signatures
              h1Texts: Array.from(document.querySelectorAll("h1")).map((heading) => heading.innerText.trim()),
              canonicalUrl: canonical ? getAbsoluteUrl(canonical.getAttribute("href")) : null,
              images,
              links,
              scripts,
              stylesheets,
              classNames,
              iframes,
              metaTags,
              forms,
              icons,
              windowGlobals,
            };
          });
        } catch (err) {
          warnings.push({
            code: "PARTIAL_SCAN",
            message: `Failed to extract full page data: ${err.message}. Results may be incomplete.`,
          });
          console.error(`[SCAN WARNING] Code: PARTIAL_SCAN URL: ${url}`);
          
          pageData = {
            title: null, html: "", h1Texts: [], canonicalUrl: null, images: [],
            links: [], scripts: [], stylesheets: [], classNames: [], iframes: [],
            metaTags: [], forms: [], icons: [], windowGlobals: {}
          };
        }

        const extractDuration = Date.now() - extractStart;
        console.log(`[SCAN] Stage: Extraction Duration: ${extractDuration}ms`);

        const finalUrl = page.url();
        await context.close();

        return {
          url,
          finalUrl,
          loadTime: navDuration,
          status,
          redirectCount,
          headers: finalHeaders,
          documentResponses,
          firstDocumentResponse,
          finalDocumentResponse,
          finalHeaders,
          redirectChain,
          securityDebug: {
            documentResponseCount: documentResponses.length,
            responseUrls: documentResponses.map((documentResponse) => documentResponse.url),
            headersFound,
            headersSeen,
          },
          scrapeAttempts: attempt + 1,
          warnings,
          ...pageData,
        };
      } catch (error) {
        lastError = error;
        await context?.close().catch(() => {});
        
        // If timeout was exhausted, do not retry
        const elapsed = Date.now() - overallStartTime;
        if (initialTimeout - elapsed <= 2000) {
          break; 
        }
      }
    }

    throw new ScrapeError("Website could not be scanned", {
      reason: lastError?.message || "Unknown Playwright failure",
      timeout: initialTimeout,
      attempts: maxRetries + 1,
    });
  } catch (error) {
    console.error("SCRAPER ERROR:", error.message);
    throw error;
  }
}

module.exports = {
  ScrapeError,
  scrapeWebsite,
};
