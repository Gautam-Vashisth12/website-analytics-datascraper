const CATEGORY_KEYS = {
  framework: "frameworks",
  cms: "cms",
  infrastructure: "infrastructure",
  analytics: "analytics",
};

function normalize(value) {
  return String(value || "").toLowerCase();
}

function includesAny(source, patterns) {
  const normalizedSource = normalize(source);

  return patterns.some((pattern) => normalizedSource.includes(pattern));
}

function getMetaGenerator(rawData) {
  const generator = rawData.metaTags.find(
    (meta) => normalize(meta.name) === "generator"
  );

  return generator?.content || "";
}

function createSources(rawData) {
  const scriptUrls = rawData.scripts.map((script) => script.src).join(" ");
  const scriptContent = rawData.scripts.map((script) => script.content).join(" ");
  const metaText = rawData.metaTags
    .map((meta) => `${meta.name || ""} ${meta.property || ""} ${meta.content || ""}`)
    .join(" ");
  const headers = JSON.stringify(rawData.headers || {});

  return {
    scriptUrls,
    scriptContent,
    metaText,
    headers,
    html: rawData.html || "",
    allText: `${scriptUrls} ${scriptContent} ${metaText} ${headers} ${rawData.html || ""}`,
    generator: getMetaGenerator(rawData),
    globals: rawData.windowGlobals || {},
  };
}

function confidenceFromEvidence(evidenceCount) {
  if (evidenceCount >= 2) {
    return "high";
  }

  return "medium";
}

function runChecks(checks, sources) {
  return checks
    .map((check) => check(sources))
    .filter(Boolean);
}

const detectionRules = [
  {
    key: "react",
    name: "React",
    category: "framework",
    checks: [
      // React devtools hook is a strong browser-global signal.
      (sources) =>
        sources.globals.hasReactDevToolsHook
          ? "window.__REACT_DEVTOOLS_GLOBAL_HOOK__ was present"
          : null,
      // React DOM markers reduce false positives from pages merely mentioning React.
      (sources) =>
        includesAny(sources.html, ["reactroot", "__react", "data-reactroot"])
          ? "React DOM marker was found"
          : null,
      (sources) =>
        includesAny(sources.scriptUrls, ["react", "react-dom"])
          ? "React script URL was found"
          : null,
    ],
  },
  {
    key: "nextjs",
    name: "Next.js",
    category: "framework",
    checks: [
      // __NEXT_DATA__ is a direct Next.js runtime marker.
      (sources) => (sources.globals.hasNextData ? "window.__NEXT_DATA__ was present" : null),
      (sources) =>
        includesAny(sources.allText, ["_next/static", "__next_data__"])
          ? "Next.js asset or data marker was found"
          : null,
    ],
  },
  {
    key: "vuejs",
    name: "Vue.js",
    category: "framework",
    checks: [
      (sources) => (sources.globals.hasVue ? "Vue global was present on window" : null),
      (sources) =>
        includesAny(sources.html, ["data-v-", "__vue__"])
          ? "Vue DOM marker was found"
          : null,
      (sources) =>
        includesAny(sources.scriptUrls, ["vue.js", "vue.runtime"])
          ? "Vue script URL was found"
          : null,
    ],
  },
  {
    key: "angular",
    name: "Angular",
    category: "framework",
    checks: [
      (sources) =>
        sources.globals.hasAngular ? "Angular global or [ng-version] marker was present" : null,
      (sources) =>
        includesAny(sources.allText, ["ng-version", "angular.js", "@angular/"])
          ? "Angular DOM or script pattern was found"
          : null,
    ],
  },
  {
    key: "wordpress",
    name: "WordPress",
    category: "cms",
    checks: [
      (sources) =>
        includesAny(sources.generator, ["wordpress"])
          ? "meta generator identified WordPress"
          : null,
      (sources) =>
        includesAny(sources.allText, ["wp-content", "wp-includes"])
          ? "WordPress asset path was found"
          : null,
    ],
  },
  {
    key: "shopify",
    name: "Shopify",
    category: "cms",
    checks: [
      (sources) => (sources.globals.hasShopify ? "window.Shopify was present" : null),
      (sources) =>
        includesAny(sources.allText, ["cdn.shopify.com", "myshopify.com", "shopify.theme"])
          ? "Shopify CDN or storefront marker was found"
          : null,
    ],
  },
  {
    key: "wix",
    name: "Wix",
    category: "cms",
    checks: [
      (sources) =>
        includesAny(sources.allText, ["wixstatic.com", "static.parastorage.com", "x-wix"])
          ? "Wix asset, script, or header marker was found"
          : null,
    ],
  },
  {
    key: "cloudflare",
    name: "Cloudflare",
    category: "infrastructure",
    checks: [
      // Cloudflare headers are stronger than HTML mentions and usually indicate real edge usage.
      (sources) =>
        includesAny(sources.headers, ["cf-ray", "cf-cache-status", "server\":\"cloudflare"])
          ? "Cloudflare response header marker was found"
          : null,
      (sources) =>
        includesAny(sources.allText, ["__cf_bm", "cloudflare"])
          ? "Cloudflare script or HTML marker was found"
          : null,
    ],
  },
  {
    key: "vercel",
    name: "Vercel",
    category: "infrastructure",
    checks: [
      (sources) =>
        includesAny(sources.headers, ["x-vercel-id", "x-vercel-cache", "server\":\"vercel"])
          ? "Vercel response header marker was found"
          : null,
      (sources) =>
        includesAny(sources.allText, ["vercel.app", "_vercel"])
          ? "Vercel hostname or asset marker was found"
          : null,
    ],
  },
  {
    key: "netlify",
    name: "Netlify",
    category: "infrastructure",
    checks: [
      (sources) =>
        includesAny(sources.headers, ["x-nf-request-id", "server\":\"netlify"])
          ? "Netlify response header marker was found"
          : null,
      (sources) =>
        includesAny(sources.allText, ["netlify.app", "netlify-identity-widget"])
          ? "Netlify hostname or script marker was found"
          : null,
    ],
  },
  {
    key: "googleAnalytics",
    name: "Google Analytics",
    category: "analytics",
    checks: [
      (sources) =>
        sources.globals.hasGoogleAnalytics
          ? "Google Analytics global function was present"
          : null,
      (sources) =>
        includesAny(sources.allText, [
          "google-analytics.com/analytics.js",
          "googletagmanager.com/gtag/js",
          "gtag(",
        ])
          ? "Google Analytics script or function call was found"
          : null,
    ],
  },
  {
    key: "googleTagManager",
    name: "Google Tag Manager",
    category: "analytics",
    checks: [
      (sources) =>
        sources.globals.hasGoogleTagManager
          ? "Google Tag Manager global or dataLayer was present"
          : null,
      (sources) =>
        includesAny(sources.allText, ["googletagmanager.com/gtm.js", "gtm-"])
          ? "Google Tag Manager script or container id was found"
          : null,
    ],
  },
  {
    key: "metaPixel",
    name: "Meta Pixel",
    category: "analytics",
    checks: [
      (sources) => (sources.globals.hasMetaPixel ? "Meta Pixel fbq global was present" : null),
      (sources) =>
        includesAny(sources.allText, ["connect.facebook.net", "fbevents.js", "fbq("])
          ? "Meta Pixel script or fbq call was found"
          : null,
    ],
  },
  {
    key: "hotjar",
    name: "Hotjar",
    category: "analytics",
    checks: [
      (sources) => (sources.globals.hasHotjar ? "Hotjar global was present" : null),
      (sources) =>
        includesAny(sources.allText, ["static.hotjar.com", "hotjar.com", "hj("])
          ? "Hotjar script or function call was found"
          : null,
    ],
  },
];

function analyzeTechnologies(rawData) {
  const sources = createSources(rawData);
  const result = {
    frameworks: [],
    cms: [],
    infrastructure: [],
    analytics: [],
  };

  detectionRules.forEach((rule) => {
    const evidence = runChecks(rule.checks, sources);

    if (evidence.length === 0) {
      return;
    }

    const categoryKey = CATEGORY_KEYS[rule.category];

    result[categoryKey].push({
      key: rule.key,
      name: rule.name,
      category: rule.category,
      confidence: confidenceFromEvidence(evidence.length),
      evidence: evidence.join("; "),
      evidenceSources: evidence,
    });
  });

  const technologies = [
    ...result.frameworks,
    ...result.cms,
    ...result.infrastructure,
    ...result.analytics,
  ];

  return {
    ...result,
    detected: technologies.reduce((detected, technology) => {
      detected[technology.key] = true;
      return detected;
    }, {}),
    names: technologies.map((technology) => technology.name),
  };
}

module.exports = {
  analyzeTechnologies,
};
