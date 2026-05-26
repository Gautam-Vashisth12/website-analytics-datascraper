const SEVERITY = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  INFORMATIONAL: "informational",
};

function createRisk({ severity, title, description, category, recommendation }) {
  return {
    severity,
    title,
    description,
    category,
    recommendation,
  };
}

function addSecurityRisks(risks, security) {
  if (!security.usesHttps) {
    risks.push(
      createRisk({
        // Critical: no HTTPS exposes all traffic to interception and tampering.
        // This follows browser security expectations and OWASP transport protection guidance.
        severity: SEVERITY.CRITICAL,
        title: "HTTPS Not Enabled",
        description: "Website traffic can be intercepted or modified in transit.",
        category: "security",
        recommendation: "Serve the site over HTTPS and redirect all HTTP traffic to HTTPS.",
      })
    );
  }

  if (!security.hasCsp) {
    risks.push(
      createRisk({
        // High: CSP is a major XSS damage-reduction control. Missing CSP increases impact
        // if any injection point exists, which is common enough to make this high priority.
        severity: SEVERITY.HIGH,
        title: "Missing Content Security Policy",
        description: "Website may be more exposed to cross-site scripting impact.",
        category: "security",
        recommendation: "Add a CSP header to restrict script execution and trusted asset sources.",
      })
    );
  }

  if (security.mixedContentCount > 0) {
    risks.push(
      createRisk({
        // High: mixed active/passive content weakens HTTPS and can create browser blocking
        // or downgrade opportunities depending on the asset type.
        severity: SEVERITY.HIGH,
        title: "Mixed Content Detected",
        description: `${security.mixedContentCount} asset(s) are loaded over insecure HTTP.`,
        category: "security",
        recommendation: "Load all images, scripts, styles, and iframes through HTTPS URLs.",
      })
    );
  }

  if (security.insecureFormCount > 0) {
    risks.push(
      createRisk({
        // High: forms can carry credentials or personal data, so HTTP form actions create
        // direct user-data exposure with realistic exploitability on shared networks.
        severity: SEVERITY.HIGH,
        title: "Insecure Form Action",
        description: `${security.insecureFormCount} form(s) submit to insecure HTTP endpoints.`,
        category: "security",
        recommendation: "Update form actions to HTTPS endpoints and enforce secure redirects.",
      })
    );
  }

  if (!security.hasXFrameOptions) {
    risks.push(
      createRisk({
        // Medium: clickjacking requires user interaction and framing context, but browser
        // frame controls are a standard defensive baseline.
        severity: SEVERITY.MEDIUM,
        title: "Missing X-Frame-Options",
        description: "Website may be embeddable in hostile pages, increasing clickjacking risk.",
        category: "security",
        recommendation: "Add X-Frame-Options or a CSP frame-ancestors directive.",
      })
    );
  }

  if (security.usesHttps && !security.hasHsts) {
    risks.push(
      createRisk({
        // Medium: HSTS reduces SSL stripping and downgrade attacks after first secure visit.
        severity: SEVERITY.MEDIUM,
        title: "Missing Strict-Transport-Security",
        description: "Browsers are not instructed to keep future visits on HTTPS.",
        category: "security",
        recommendation: "Add a Strict-Transport-Security header with an appropriate max-age.",
      })
    );
  }

  if (!security.hasContentTypeOptions) {
    risks.push(
      createRisk({
        // Low: MIME sniffing protections reduce browser ambiguity, but impact is usually
        // contextual and lower than transport or script execution controls.
        severity: SEVERITY.LOW,
        title: "Missing X-Content-Type-Options",
        description: "Browser MIME sniffing protection is not explicitly enabled.",
        category: "security",
        recommendation: "Add X-Content-Type-Options: nosniff.",
      })
    );
  }

  if (security.inlineScriptCount > 10) {
    risks.push(
      createRisk({
        // Medium: many inline scripts enlarge the script execution surface and make strict
        // CSP adoption harder, increasing practical XSS blast radius.
        severity: SEVERITY.MEDIUM,
        title: "Heavy Inline Script Usage",
        description: `${security.inlineScriptCount} inline script block(s) were found.`,
        category: "security",
        recommendation: "Move inline scripts to trusted external files and use CSP nonces where needed.",
      })
    );
  }

  if (security.suspiciousScriptCount > 0) {
    risks.push(
      createRisk({
        // Medium: suspicious third-party scripts increase supply-chain and privacy exposure,
        // but require manual review before treating as a confirmed vulnerability.
        severity: SEVERITY.MEDIUM,
        title: "Suspicious Third-Party Scripts",
        description: `${security.suspiciousScriptCount} third-party script source(s) need review.`,
        category: "security",
        recommendation: "Audit third-party scripts and remove vendors that are not required.",
      })
    );
  }
}

function addSEORisks(risks, seo) {
  if (!seo.hasTitle) {
    risks.push(
      createRisk({
        severity: SEVERITY.MEDIUM,
        title: "Missing Page Title",
        description: "Search engines and browser tabs lack a primary page label.",
        category: "seo",
        recommendation: "Add a concise, descriptive title element.",
      })
    );
  } else if (seo.titleLengthStatus === "review") {
    risks.push(
      createRisk({
        severity: SEVERITY.LOW,
        title: "Title Length Needs Review",
        description: `Page title length is ${seo.titleLength} characters.`,
        category: "seo",
        recommendation: "Keep titles roughly 30 to 60 characters when practical.",
      })
    );
  }

  if (!seo.hasMetaDescription) {
    risks.push(
      createRisk({
        severity: SEVERITY.LOW,
        title: "Missing Meta Description",
        description: "Search previews may be less clear or auto-generated.",
        category: "seo",
        recommendation: "Add a useful meta description for the page.",
      })
    );
  }

  if (seo.hasMultipleH1) {
    risks.push(
      createRisk({
        // Low: multiple H1 tags rarely create direct user harm, but they can weaken document
        // hierarchy and search clarity.
        severity: SEVERITY.LOW,
        title: "Multiple H1 Tags",
        description: `${seo.h1Count} H1 tags were found on the page.`,
        category: "seo",
        recommendation: "Use one primary H1 and organize other headings with H2/H3 tags.",
      })
    );
  }

  if (seo.missingAltCount > 0) {
    risks.push(
      createRisk({
        severity: SEVERITY.LOW,
        title: "Images Missing Alt Text",
        description: `${seo.missingAltCount} image(s) are missing alt text.`,
        category: "seo",
        recommendation: "Add meaningful alt text to informative images.",
      })
    );
  }

  if (!seo.hasOpenGraph) {
    risks.push(
      createRisk({
        // Informational: OpenGraph is not a vulnerability, but it affects social previews
        // and brand presentation.
        severity: SEVERITY.INFORMATIONAL,
        title: "Missing OpenGraph Tags",
        description: "Social previews may not show optimized title, description, or image data.",
        category: "seo",
        recommendation: "Add og:title, og:description, and og:image tags.",
      })
    );
  }

  if (!seo.hasCanonical) {
    risks.push(
      createRisk({
        severity: SEVERITY.INFORMATIONAL,
        title: "Canonical URL Missing",
        description: "Duplicate URL variants may be harder for search engines to consolidate.",
        category: "seo",
        recommendation: "Add a canonical link tag when the page has a preferred URL.",
      })
    );
  }

  if (!seo.hasFavicon) {
    risks.push(
      createRisk({
        severity: SEVERITY.INFORMATIONAL,
        title: "Favicon Missing",
        description: "The page does not expose a favicon link.",
        category: "seo",
        recommendation: "Add a favicon for browser tabs and brand recognition.",
      })
    );
  }
}

function addPerformanceRisks(risks, performance) {
  if (performance.loadTime > 5000) {
    risks.push(
      createRisk({
        severity: SEVERITY.HIGH,
        title: "Slow Initial Load",
        description: `DOM content loaded in ${performance.loadTime} ms.`,
        category: "performance",
        recommendation: "Reduce render-blocking work, compress assets, and cache static resources.",
      })
    );
  } else if (performance.loadTime > 3000) {
    risks.push(
      createRisk({
        severity: SEVERITY.MEDIUM,
        title: "Moderate Initial Load Delay",
        description: `DOM content loaded in ${performance.loadTime} ms.`,
        category: "performance",
        recommendation: "Review large assets and blocking scripts.",
      })
    );
  }

  if (performance.renderBlockingScriptCount > 0) {
    risks.push(
      createRisk({
        severity: SEVERITY.MEDIUM,
        title: "Render-Blocking Scripts",
        description: `${performance.renderBlockingScriptCount} script(s) may block rendering.`,
        category: "performance",
        recommendation: "Add defer/async where safe or move non-critical scripts later.",
      })
    );
  }

  if (performance.estimatedHeavyAssetUsage) {
    risks.push(
      createRisk({
        severity: SEVERITY.MEDIUM,
        title: "Heavy Asset Usage",
        description: `${performance.totalAssetCount} page asset(s) were detected.`,
        category: "performance",
        recommendation: "Trim unused assets and lazy-load non-critical media.",
      })
    );
  }

  if (performance.imageCount > 10 && performance.lazyLoadingCoverage < 50) {
    risks.push(
      createRisk({
        severity: SEVERITY.LOW,
        title: "Low Lazy-Loading Coverage",
        description: `${performance.lazyLoadingCoverage}% of images use native lazy loading.`,
        category: "performance",
        recommendation: "Use loading=\"lazy\" for below-the-fold images.",
      })
    );
  }
}

function createRisks({ seo, security, performance }) {
  const risks = [];

  addSecurityRisks(risks, security);
  addSEORisks(risks, seo);
  addPerformanceRisks(risks, performance);

  const severityOrder = {
    [SEVERITY.CRITICAL]: 0,
    [SEVERITY.HIGH]: 1,
    [SEVERITY.MEDIUM]: 2,
    [SEVERITY.LOW]: 3,
    [SEVERITY.INFORMATIONAL]: 4,
  };

  return risks.sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity]);
}

module.exports = {
  SEVERITY,
  createRisks,
};
