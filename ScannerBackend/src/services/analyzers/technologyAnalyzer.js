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
  const generator = (rawData.metaTags || []).find(
    (meta) => normalize(meta.name) === "generator"
  );

  return generator?.content || "";
}

function createSources(rawData) {
  const scripts = rawData.scripts || [];
  const metaTags = rawData.metaTags || [];
  const scriptUrls = scripts.map((script) => script.src).join(" ");
  const scriptContent = scripts.map((script) => script.content).join(" ");
  const metaText = metaTags
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

function calculateConfidence(signalCount) {
  if (signalCount >= 3) {
    return "high";
  }

  if (signalCount === 2) {
    return "medium";
  }

  return "low";
}

function confidenceFromEvidence(evidenceCount) {
  if (evidenceCount >= 2) {
    return "high";
  }

  return "medium";
}

function runChecks(checks, sources) {
  return [...new Set(checks.map((check) => check(sources)).filter(Boolean))];
}

function calculateRuleConfidence(rule, evidence) {
  const confidence = calculateConfidence(evidence.length);

  if (
    rule.highConfidenceSignals?.some((signal) => evidence.includes(signal)) ||
    rule.highConfidenceSignalGroups?.some((signals) =>
      signals.every((signal) => evidence.includes(signal))
    ) ||
    (rule.highConfidenceSignalCount &&
      evidence.length >= rule.highConfidenceSignalCount)
  ) {
    return "high";
  }

  if (
    confidence === "low" &&
    rule.mediumConfidenceSignals?.some((signal) => evidence.includes(signal))
  ) {
    return "medium";
  }

  return confidence;
}

const detectionRules = [
  {
    key: "react",
    name: "React",
    category: "framework",
    highConfidenceSignalCount: 2,
    mediumConfidenceSignals: [
      "__REACT_DEVTOOLS_GLOBAL_HOOK__",
      "data-reactroot attribute",
      "react.production.min.js",
      "react-dom.production.min.js",
      "react.development.js",
      "react-dom.development.js",
    ],
    checks: [
      // React devtools hook is a strong browser-global signal.
      (sources) =>
        sources.globals.hasReactDevToolsHook
          ? "__REACT_DEVTOOLS_GLOBAL_HOOK__"
          : null,
      // React DOM markers reduce false positives from pages merely mentioning React.
      (sources) =>
        includesAny(sources.html, ['id="root"', "id='root'"])
          ? 'id="root"'
          : null,
      (sources) =>
        includesAny(sources.html, ["data-reactroot"])
          ? "data-reactroot attribute"
          : null,
      (sources) =>
        includesAny(sources.scriptUrls, ["react.production.min.js"])
          ? "react.production.min.js"
          : null,
      (sources) =>
        includesAny(sources.scriptUrls, ["react-dom.production.min.js"])
          ? "react-dom.production.min.js"
          : null,
      (sources) =>
        includesAny(sources.scriptUrls, ["react.development.js"])
          ? "react.development.js"
          : null,
      (sources) =>
        includesAny(sources.scriptUrls, ["react-dom.development.js"])
          ? "react-dom.development.js"
          : null,
      // Preserve the broader legacy React markers.
      (sources) =>
        includesAny(sources.html, ["reactroot", "__react"]) &&
        !includesAny(sources.html, ["data-reactroot"])
          ? "React DOM marker"
          : null,
      (sources) =>
        includesAny(sources.scriptUrls, ["react", "react-dom"]) &&
        !includesAny(sources.scriptUrls, [
          "react.production.min.js",
          "react-dom.production.min.js",
          "react.development.js",
          "react-dom.development.js",
        ])
          ? "React script URL"
          : null,
    ],
  },
  {
    key: "nextjs",
    name: "Next.js",
    category: "framework",
    highConfidenceSignals: ["__NEXT_DATA__"],
    highConfidenceSignalGroups: [["/_next/static/", "/_next/image"]],
    checks: [
      // __NEXT_DATA__ is a direct Next.js runtime marker.
      (sources) => (sources.globals.hasNextData ? "__NEXT_DATA__" : null),
      (sources) =>
        includesAny(sources.html, ['id="__next"', "id='__next'"])
          ? 'id="__next"'
          : null,
      (sources) =>
        /<script[^>]+id=(["'])__next_data__\1/i.test(sources.html)
          ? "script#__NEXT_DATA__"
          : null,
      (sources) =>
        includesAny(sources.allText, ["/_next/static/"])
          ? "/_next/static/"
          : null,
      (sources) =>
        includesAny(sources.allText, ["/_next/image"])
          ? "/_next/image"
          : null,
      (sources) =>
        /"x-powered-by"\s*:\s*"[^"]*next\.js/i.test(sources.headers)
          ? "x-powered-by: Next.js"
          : null,
      // Preserve the broader legacy Next.js marker.
      (sources) =>
        includesAny(sources.allText, ["_next/static", "__next_data__"]) &&
        !includesAny(sources.allText, ["/_next/static/"]) &&
        !/<script[^>]+id=(["'])__next_data__\1/i.test(sources.html)
          ? "Next.js asset or data marker"
          : null,
    ],
  },
  {
    key: "vuejs",
    name: "Vue.js",
    category: "framework",
    highConfidenceSignals: ["__VUE_DEVTOOLS_GLOBAL_HOOK__"],
    highConfidenceSignalCount: 2,
    checks: [
      (sources) => (sources.globals.hasVue ? "Vue global" : null),
      (sources) =>
        sources.globals.hasVueDevToolsHook
          ? "__VUE_DEVTOOLS_GLOBAL_HOOK__"
          : null,
      (sources) =>
        includesAny(sources.html, ["data-v-"])
          ? "data-v-* attribute"
          : null,
      (sources) =>
        includesAny(sources.scriptUrls, ["vue.runtime"])
          ? "vue.runtime script"
          : null,
      (sources) =>
        includesAny(sources.scriptUrls, ["vue.global"])
          ? "vue.global script"
          : null,
      (sources) =>
        includesAny(sources.scriptUrls, ["vue.min.js"])
          ? "vue.min.js"
          : null,
      // Preserve the broader legacy Vue markers.
      (sources) =>
        includesAny(sources.html, ["__vue__"])
          ? "Vue DOM marker"
          : null,
      (sources) =>
        includesAny(sources.scriptUrls, ["vue.js", "vue.runtime"]) &&
        !includesAny(sources.scriptUrls, ["vue.runtime", "vue.global", "vue.min.js"])
          ? "Vue script URL"
          : null,
    ],
  },
  {
    key: "angular",
    name: "Angular",
    category: "framework",
    highConfidenceSignals: ["ng-version attribute"],
    highConfidenceSignalCount: 2,
    checks: [
      (sources) => (sources.globals.hasNg ? "window.ng" : null),
      (sources) =>
        includesAny(sources.html, ["ng-version"])
          ? "ng-version attribute"
          : null,
      (sources) =>
        includesAny(sources.html, ["ng-app"])
          ? "ng-app attribute"
          : null,
      (sources) =>
        includesAny(sources.scriptUrls, ["polyfills-es2015"])
          ? "polyfills-es2015 script"
          : null,
      (sources) =>
        includesAny(sources.scriptUrls, ["main-es2015"])
          ? "main-es2015 script"
          : null,
      (sources) =>
        includesAny(sources.scriptUrls, ["runtime-es2015"])
          ? "runtime-es2015 script"
          : null,
      // Preserve the broader legacy Angular markers.
      (sources) =>
        sources.globals.hasAngular &&
        !sources.globals.hasNg &&
        !includesAny(sources.html, ["ng-version"])
          ? "Angular global or [ng-version] marker"
          : null,
      (sources) =>
        includesAny(sources.allText, ["ng-version", "angular.js", "@angular/"]) &&
        !includesAny(sources.html, ["ng-version"]) &&
        !includesAny(sources.scriptUrls, [
          "polyfills-es2015",
          "main-es2015",
          "runtime-es2015",
        ])
          ? "Angular DOM or script pattern"
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
  const frameworkSignals = {
    react: [],
    nextjs: [],
    vue: [],
    angular: [],
  };
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

    if (rule.category === "framework") {
      const debugKey = rule.key === "vuejs" ? "vue" : rule.key;
      frameworkSignals[debugKey] = evidence;
    }

    result[categoryKey].push({
      key: rule.key,
      name: rule.name,
      category: rule.category,
      confidence:
        rule.category === "framework"
          ? calculateRuleConfidence(rule, evidence)
          : confidenceFromEvidence(evidence.length),
      evidence,
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
    technologyDebug: {
      frameworkSignals,
    },
  };
}

module.exports = {
  analyzeTechnologies,
  calculateConfidence,
};
