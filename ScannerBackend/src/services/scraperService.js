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

async function scrapeWebsite(url, options = {}) {
  const timeout = options.timeout || 30000;
  const maxRetries = options.retries ?? 1;
  let browser;

  try {
    console.log("STEP 1");

    browser = await chromium.launch({
      headless: true,
      args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
    });

    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      let page;
      const documentResponses = [];

      try {
        console.log("STEP 2");

        page = await browser.newPage();

        console.log("STEP 2.1: newPage successful");

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
            console.error("Response capture error:", err);
          }
        });

        const start = Date.now();
        console.log("STEP 3");
        console.log("URL:", url);
        console.log("Timeout:", timeout);
        console.log("Attempt:", attempt);

        const response = await page.goto(url, {
          waitUntil: "commit",
          timeout,
          

        });

        console.log("STEP 4");


        const loadTime = Date.now() - start;
        const responseHeaders = response ? normalizeHeaders(response.headers()) : {};
        const status = response ? response.status() : null;
        const firstDocumentResponse = documentResponses[0] || null;
        const finalDocumentResponse =
          documentResponses[documentResponses.length - 1] || null;
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
            content: (script.innerText || script.textContent || "").slice(0, 500),
            async: script.async,
            defer: script.defer,
            type: script.type || null,
          }));

          const stylesheets = Array.from(
            document.querySelectorAll('link[rel="stylesheet"]')
          ).map((stylesheet) => ({
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
            hasVueDevToolsHook: Boolean(window.__VUE_DEVTOOLS_GLOBAL_HOOK__),
            hasNg: Boolean(window.ng),
            hasAngular:
              Boolean(window.angular) ||
              Boolean(window.getAllAngularRootElements) ||
              Boolean(document.querySelector("[ng-version]")),
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
            html: document.documentElement.outerHTML,
            h1Texts: Array.from(document.querySelectorAll("h1")).map((heading) =>
              heading.innerText.trim()
            ),
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

        const finalUrl = page.url();
        await page.close();

        return {
          url,
          finalUrl,
          loadTime,
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
          ...pageData,
        };
      } catch (error) {
        console.error("========== SCRAPE ATTEMPT FAILED ==========");
        console.error("Attempt:", attempt);
        console.error("URL:", url);
        console.error("Timeout:", timeout);
        console.error(error);
        console.error(error.stack);
        lastError = error;
        await page?.close().catch(() => {});
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
