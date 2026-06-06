const CATEGORY_KEYS = {
  framework: "frameworks",
  uiFramework: "uiFrameworks",
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

function getNormalizedHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers || {}).map(([key, value]) => {
      const normalizedKey = normalize(key);
      const normalizedValue = Array.isArray(value)
        ? value.map((v) => (typeof v === "string" ? normalize(v) : v))
        : typeof value === "string"
        ? normalize(value)
        : value;

      return [normalizedKey, normalizedValue];
    })
  );
}

function createSources(rawData) {
  const scripts = rawData.scripts || [];
  const stylesheets = rawData.stylesheets || [];
  const metaTags = rawData.metaTags || [];
  const scriptUrls = scripts.map((script) => script.src).join(" ");
  const scriptContent = scripts.map((script) => script.content).join(" ");
  const stylesheetUrls = stylesheets.map((stylesheet) => stylesheet.href).join(" ");
  const metaText = metaTags
    .map((meta) => `${meta.name || ""} ${meta.property || ""} ${meta.content || ""}`)
    .join(" ");
  const normalizedHeaders = getNormalizedHeaders(rawData.headers);
  const headerKeys = Object.keys(normalizedHeaders);
  const classNames = [...new Set(rawData.classNames || [])];

  return {
    scriptUrls,
    scriptContent,
    stylesheetUrls,
    classNames,
    metaText,
    normalizedHeaders,
    headerKeys,
    html: rawData.html || "",
    allText: `${scriptUrls} ${scriptContent} ${stylesheetUrls} ${metaText} ${JSON.stringify(rawData.headers || {})} ${rawData.html || ""}`,
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

function matchesUrlFilename(urls, filenames) {
  return filenames.some((filename) => {
    const escapedFilename = filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|/)${escapedFilename}(?:[?#]|\\s|$)`, "i").test(urls);
  });
}

function hasTailwindStylesheet(sources) {
  return matchesUrlFilename(sources.stylesheetUrls, [
    "tailwind.css",
    "tailwind.min.css",
  ]);
}

function hasBootstrapAsset(sources) {
  return (
    matchesUrlFilename(sources.stylesheetUrls, [
      "bootstrap.css",
      "bootstrap.min.css",
    ]) ||
    matchesUrlFilename(sources.scriptUrls, [
      "bootstrap.bundle.js",
      "bootstrap.bundle.min.js",
    ])
  );
}

function getTailwindUtilityClasses(classNames) {
  const utilityPattern =
    /^(?:flex|grid|items-center|justify-center|(?:gap|space-x|space-y|bg|text|rounded|px|py|mx|my|w|h)-.+)$/;

  return classNames.filter((className) =>
    utilityPattern.test(className.split(":").pop())
  );
}

function getTailwindResponsivePrefixes(classNames) {
  return ["sm", "md", "lg", "xl", "2xl"].filter((prefix) =>
    classNames.some((className) => className.startsWith(`${prefix}:`))
  );
}

function getBootstrapClasses(classNames) {
  const bootstrapClassPattern =
    /^(?:container|container-fluid|row|btn|btn-primary|btn-secondary|navbar|modal|alert|card|col-(?:auto|\d+|(?:sm|md|lg|xl|xxl)(?:-(?:auto|\d+))?)|navbar-expand(?:-.+)?)$/;

  return classNames.filter((className) => bootstrapClassPattern.test(className));
}

function hasBootstrapSpecificClass(classNames) {
  return classNames.some((className) =>
    /^(?:container-fluid|col-(?:auto|\d+|(?:sm|md|lg|xl|xxl)(?:-(?:auto|\d+))?)|btn-primary|btn-secondary|navbar-expand(?:-.+)?)$/.test(className)
  );
}

function getMuiClasses(classNames) {
  return classNames.filter((className) =>
    /^Mui(?:Button|Typography|Container|Box|Paper|Grid)-root(?:-.+)?$/.test(className)
  );
}

function hasMuiSupportingSignal(sources) {
  return (
    includesAny(`${sources.stylesheetUrls} ${sources.scriptUrls}`, [
      "material-ui",
      "@mui",
      "/mui",
      "mui.",
      "mui-",
    ]) ||
    /\bdata-mui(?:-[\w-]+)?(?:=|\s|>)/i.test(sources.html) ||
    includesAny(sources.html, ["data-emotion", "emotion-cache", "createcache"]) ||
    /<style[^>]+(?:data-emotion|id)=(["'])[^"']*mui[^"']*\1/i.test(sources.html)
  );
}

function hasGoogleAnalyticsMeasurementId(source) {
  return /\b(?:G-[A-Z0-9]{10}|UA-\d+(?:-\d+)+)\b/.test(source);
}

function hasGoogleTagManagerContainerId(source) {
  return /\bGTM-[A-Z0-9]+\b/i.test(source);
}

function hasFbqInitCall(source) {
  return /\bfbq\s*\(\s*["']init["']/i.test(source);
}

function hasGoogleAnalyticsContext(sources) {
  return (
    includesAny(sources.scriptUrls, [
      "googletagmanager.com/gtag/js",
      "google-analytics.com",
    ]) ||
    hasGoogleAnalyticsMeasurementId(sources.allText) ||
    sources.globals.hasGtag ||
    sources.globals.hasGoogleAnalytics
  );
}

function hasGoogleTagManagerContext(sources) {
  return (
    includesAny(sources.scriptUrls, ["googletagmanager.com/gtm.js"]) ||
    hasGoogleTagManagerContainerId(sources.allText) ||
    /<noscript[\s\S]*?googletagmanager\.com\/ns\.html/i.test(sources.html) ||
    sources.globals.hasGoogleTagManagerGlobal ||
    (!Object.prototype.hasOwnProperty.call(sources.globals, "hasDataLayer") &&
      sources.globals.hasGoogleTagManager)
  );
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
        sources.normalizedHeaders["x-powered-by"]?.includes("next.js")
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
    key: "tailwind",
    name: "Tailwind CSS",
    category: "uiFramework",
    calculateConfidence: (sources) => {
      if (hasTailwindStylesheet(sources)) {
        return calculateConfidence(3);
      }

      const utilityCount = getTailwindUtilityClasses(sources.classNames).length;

      if (utilityCount >= 10) {
        return calculateConfidence(3);
      }

      if (utilityCount >= 5) {
        return calculateConfidence(2);
      }

      return calculateConfidence(1);
    },
    checks: [
      (sources) =>
        hasTailwindStylesheet(sources) ? "Tailwind stylesheet" : null,
      (sources) => {
        const utilityCount = getTailwindUtilityClasses(sources.classNames).length;
        const responsivePrefixes = getTailwindResponsivePrefixes(sources.classNames);
        return utilityCount >= 2 &&
          (!hasBootstrapAsset(sources) || responsivePrefixes.length > 0)
          ? `${utilityCount} Tailwind utility classes detected`
          : null;
      },
      (sources) => {
        const prefixes = getTailwindResponsivePrefixes(sources.classNames);
        return (
          getTailwindUtilityClasses(sources.classNames).length >= 2 &&
          prefixes.length > 0
        )
          ? `${prefixes.join(", ")}:* responsive utilities`
          : null;
      },
    ],
  },
  {
    key: "bootstrap",
    name: "Bootstrap",
    category: "uiFramework",
    calculateConfidence: (sources) => {
      if (hasBootstrapAsset(sources)) {
        return calculateConfidence(3);
      }

      return calculateConfidence(
        getBootstrapClasses(sources.classNames).length >= 3 ? 2 : 1
      );
    },
    checks: [
      (sources) =>
        matchesUrlFilename(sources.stylesheetUrls, [
          "bootstrap.css",
          "bootstrap.min.css",
        ])
          ? "Bootstrap stylesheet"
          : null,
      (sources) =>
        matchesUrlFilename(sources.scriptUrls, [
          "bootstrap.bundle.js",
          "bootstrap.bundle.min.js",
        ])
          ? "Bootstrap bundle script"
          : null,
      (sources) => {
        const classCount = getBootstrapClasses(sources.classNames).length;
        return classCount > 0 && hasBootstrapSpecificClass(sources.classNames)
          ? `${classCount} Bootstrap classes detected`
          : null;
      },
    ],
  },
  {
    key: "mui",
    name: "Material UI",
    category: "uiFramework",
    calculateConfidence: (sources) => {
      const muiClassCount = getMuiClasses(sources.classNames).length;

      if (muiClassCount >= 2) {
        return calculateConfidence(3);
      }

      if (muiClassCount === 1 && hasMuiSupportingSignal(sources)) {
        return calculateConfidence(2);
      }

      return calculateConfidence(1);
    },
    checks: [
      (sources) => {
        const classCount = getMuiClasses(sources.classNames).length;
        return classCount > 0 ? `${classCount} Mui* classes detected` : null;
      },
      (sources) =>
        includesAny(`${sources.stylesheetUrls} ${sources.scriptUrls}`, [
          "material-ui",
          "@mui",
          "/mui",
          "mui.",
          "mui-",
        ])
          ? "MUI asset reference"
          : null,
      (sources) =>
        /\bdata-mui(?:-[\w-]+)?(?:=|\s|>)/i.test(sources.html)
          ? "data-mui attribute"
          : null,
      (sources) =>
        includesAny(sources.html, ["data-emotion", "emotion-cache", "createcache"])
          ? "Emotion cache reference"
          : null,
      (sources) =>
        /<style[^>]+(?:data-emotion|id)=(["'])[^"']*mui[^"']*\1/i.test(sources.html)
          ? "MUI style tag"
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
    calculateConfidence: (sources, evidence) => calculateConfidence(evidence.length),
    checks: [
      (sources) =>
        sources.headerKeys.includes("cf-ray") ? "cf-ray header" : null,
      (sources) =>
        sources.headerKeys.includes("cf-cache-status") ? "cf-cache-status header" : null,
      (sources) =>
        includesAny(sources.allText, ["cloudflare"]) ? "cloudflare resource" : null,
    ],
  },
  {
    key: "aws",
    name: "AWS",
    category: "infrastructure",
    calculateConfidence: (sources, evidence) => calculateConfidence(evidence.length),
    checks: [
      (sources) =>
        sources.headerKeys.some((k) => k.startsWith("x-amz-")) ? "x-amz header" : null,
      (sources) =>
        includesAny(sources.allText, ["amazonaws.com"]) ? "amazonaws.com resource" : null,
    ],
  },
  {
    key: "cloudfront",
    name: "CloudFront",
    category: "infrastructure",
    calculateConfidence: (sources, evidence) => calculateConfidence(evidence.length),
    checks: [
      (sources) =>
        includesAny(sources.allText, ["cloudfront.net"]) ? "cloudfront.net asset" : null,
      (sources) =>
        sources.headerKeys.includes("x-cache") ? "x-cache header" : null,
    ],
  },
  {
    key: "fastly",
    name: "Fastly",
    category: "infrastructure",
    calculateConfidence: (sources, evidence) => calculateConfidence(evidence.length),
    checks: [
      (sources) =>
        sources.headerKeys.some((k) => k === "x-served-by" || k === "x-fastly-request-id") ? "Fastly response header" : null,
    ],
  },
  {
    key: "azure",
    name: "Azure",
    category: "infrastructure",
    calculateConfidence: (sources, evidence) => calculateConfidence(evidence.length),
    checks: [
      (sources) =>
        includesAny(sources.allText, ["azurewebsites.net"]) ? "azurewebsites.net resource" : null,
      (sources) =>
        sources.headerKeys.includes("x-azure-ref") ? "x-azure-ref header" : null,
    ],
  },
  {
    key: "gcp",
    name: "Google Cloud Platform",
    category: "infrastructure",
    calculateConfidence: (sources, evidence) => calculateConfidence(evidence.length),
    checks: [
      (sources) =>
        includesAny(sources.allText, ["googleusercontent.com", "storage.googleapis.com"]) ? "Google Cloud asset" : null,
      (sources) =>
        sources.headerKeys.some((k) => k.startsWith("x-goog-")) ? "x-goog header" : null,
    ],
  },
  {
    key: "vercel",
    name: "Vercel",
    category: "infrastructure",
    checks: [
      (sources) =>
        sources.headerKeys.includes("x-vercel-id") ||
        sources.headerKeys.includes("x-vercel-cache") ||
        sources.normalizedHeaders["server"]?.includes("vercel")
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
        sources.headerKeys.includes("x-nf-request-id") ||
        sources.normalizedHeaders["server"]?.includes("netlify")
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
    calculateConfidence: (sources, evidence) => {
      if (
        (evidence.includes("gtag.js loaded") ||
          evidence.includes("Google Analytics script loaded")) &&
        evidence.includes("GA measurement ID detected")
      ) {
        return calculateConfidence(3);
      }

      return calculateConfidence(evidence.length);
    },
    checks: [
      (sources) =>
        includesAny(sources.scriptUrls, ["googletagmanager.com/gtag/js"])
          ? "gtag.js loaded"
          : null,
      (sources) =>
        includesAny(sources.scriptUrls, ["google-analytics.com"])
          ? "Google Analytics script loaded"
          : null,
      (sources) =>
        hasGoogleAnalyticsMeasurementId(sources.allText)
          ? "GA measurement ID detected"
          : null,
      (sources) =>
        sources.globals.hasGtag
          ? "gtag global detected"
          : null,
      (sources) =>
        !sources.globals.hasGtag && sources.globals.hasGoogleAnalytics
          ? "Google Analytics global detected"
          : null,
      (sources) =>
        sources.globals.hasDataLayer && hasGoogleAnalyticsContext(sources)
          ? "dataLayer present"
          : null,
    ],
  },
  {
    key: "googleTagManager",
    name: "Google Tag Manager",
    category: "analytics",
    calculateConfidence: (sources, evidence) => calculateConfidence(evidence.length),
    checks: [
      (sources) =>
        includesAny(sources.scriptUrls, ["googletagmanager.com/gtm.js"])
          ? "GTM script loaded"
          : null,
      (sources) =>
        hasGoogleTagManagerContainerId(sources.allText)
          ? "GTM container detected"
          : null,
      (sources) =>
        sources.globals.hasDataLayer && hasGoogleTagManagerContext(sources)
          ? "dataLayer found"
          : null,
      (sources) =>
        sources.globals.hasGoogleTagManagerGlobal ||
        (!Object.prototype.hasOwnProperty.call(sources.globals, "hasDataLayer") &&
          sources.globals.hasGoogleTagManager)
          ? "Google Tag Manager global detected"
          : null,
      (sources) =>
        /<noscript[\s\S]*?googletagmanager\.com\/ns\.html/i.test(sources.html)
          ? "GTM noscript iframe detected"
          : null,
    ],
  },
  {
    key: "metaPixel",
    name: "Meta Pixel",
    category: "analytics",
    calculateConfidence: (sources, evidence) => calculateConfidence(evidence.length),
    checks: [
      (sources) =>
        includesAny(sources.scriptUrls, ["connect.facebook.net"])
          ? "Facebook tracking script"
          : null,
      (sources) =>
        sources.globals.hasFbq || sources.globals.hasMetaPixel
          ? "fbq global detected"
          : null,
      (sources) =>
        hasFbqInitCall(sources.allText)
          ? "fbq init call detected"
          : null,
    ],
  },
  {
    key: "hotjar",
    name: "Hotjar",
    category: "analytics",
    calculateConfidence: (sources, evidence) => calculateConfidence(evidence.length),
    checks: [
      (sources) =>
        includesAny(sources.scriptUrls, ["hotjar.com", "static.hotjar.com"])
          ? "Hotjar script"
          : null,
      (sources) =>
        sources.globals.hasHj
          ? "hj global detected"
          : null,
      (sources) =>
        sources.globals.hasHjSettings
          ? "hjSettings detected"
          : null,
      (sources) =>
        !sources.globals.hasHj &&
        !sources.globals.hasHjSettings &&
        sources.globals.hasHotjar
          ? "Hotjar global detected"
          : null,
    ],
  },
  {
    key: "linkedInInsight",
    name: "LinkedIn Insight Tag",
    category: "analytics",
    calculateConfidence: (sources, evidence) => calculateConfidence(evidence.length),
    checks: [
      (sources) =>
        includesAny(sources.scriptUrls, ["snap.licdn.com"])
          ? "LinkedIn Insight script"
          : null,
      (sources) =>
        sources.globals.hasLinkedInPartnerId
          ? "_linkedin_partner_id detected"
          : null,
      (sources) =>
        sources.globals.hasLinkedInDataPartnerIds
          ? "_linkedin_data_partner_ids detected"
          : null,
      (sources) =>
        sources.globals.hasLintrk
          ? "lintrk global detected"
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
  const uiFrameworkSignals = {
    tailwind: [],
    bootstrap: [],
    mui: [],
  };
  const analyticsSignals = {
    googleAnalytics: [],
    googleTagManager: [],
    metaPixel: [],
    hotjar: [],
    linkedInInsight: [],
  };
  const infrastructureSignals = {};
  const result = {
    frameworks: [],
    uiFrameworks: [],
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

    if (rule.category === "uiFramework") {
      uiFrameworkSignals[rule.key] = evidence;
    }

    if (rule.category === "analytics") {
      analyticsSignals[rule.key] = evidence;
    }

    if (rule.category === "infrastructure") {
      infrastructureSignals[rule.key] = {
        matchedSignals: evidence,
        rawCount: evidence.length,
      };
    }

    result[categoryKey].push({
      key: rule.key,
      name: rule.name,
      category: rule.category,
      confidence:
        rule.calculateConfidence
          ? rule.calculateConfidence(sources, evidence)
          : rule.category === "framework"
          ? calculateRuleConfidence(rule, evidence)
          : confidenceFromEvidence(evidence.length),
      evidence,
      evidenceSources: evidence,
    });
  });

  const technologies = [
    ...result.frameworks,
    ...result.uiFrameworks,
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
      uiFrameworkSignals,
      analyticsSignals,
      infrastructureSignals,
    },
  };
}

module.exports = {
  analyzeTechnologies,
  calculateConfidence,
};
