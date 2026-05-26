function calculatePerformanceScore(performance) {
  let score = 100;

  if (performance.loadTime > 5000) {
    score -= 40;
  } else if (performance.loadTime > 3000) {
    score -= 20;
  }

  if (performance.imageCount > 50) {
    score -= 20;
  } else if (performance.imageCount > 20) {
    score -= 10;
  }

  if (performance.renderBlockingScriptCount > 0) {
    score -= Math.min(performance.renderBlockingScriptCount * 5, 20);
  }

  if (performance.estimatedHeavyAssetUsage) {
    score -= 15;
  }

  if (performance.imageCount > 10 && performance.lazyLoadingCoverage < 50) {
    score -= 10;
  }

  return Math.max(score, 0);
}

function calculateSEOScore(seo) {
  let score = 100;

  if (!seo.hasTitle) {
    score -= 30;
  }

  if (!seo.hasMetaDescription) {
    score -= 25;
  }

  if (seo.h1Count === 0) {
    score -= 20;
  }

  if (seo.imageAltCoverage < 80) {
    score -= 10;
  }

  if (seo.hasMultipleH1) {
    score -= 10;
  }

  if (!seo.hasCanonical) {
    score -= 5;
  }

  if (!seo.hasOpenGraph) {
    score -= 5;
  }

  if (!seo.hasFavicon) {
    score -= 5;
  }

  return Math.max(score, 0);
}

function calculateSecurityScore(security) {
  let score = 100;

  if (!security.usesHttps) {
    score -= 40;
  }

  if (!security.hasCsp) {
    score -= 20;
  }

  if (!security.hasXFrameOptions) {
    score -= 10;
  }

  if (security.usesHttps && !security.hasHsts) {
    score -= 10;
  }

  if (!security.hasContentTypeOptions) {
    score -= 5;
  }

  if (security.insecureFormCount > 0) {
    score -= 10;
  }

  if (security.mixedContentCount > 0) {
    score -= 20;
  }

  if (security.suspiciousScriptCount > 0) {
    score -= 10;
  }

  return Math.max(score, 0);
}

function calculateRiskScore(risks = []) {
  const penalties = {
    critical: 35,
    high: 20,
    medium: 10,
    low: 4,
    informational: 1,
  };

  const totalPenalty = risks.reduce(
    (sum, risk) => sum + (penalties[risk.severity] || 0),
    0
  );

  return Math.max(100 - totalPenalty, 0);
}

function calculateScanScores({ seo, security, performance, risks = [] }) {
  const scores = {
    performanceScore: calculatePerformanceScore(performance),
    seoScore: calculateSEOScore(seo),
    securityScore: calculateSecurityScore(security),
    riskScore: calculateRiskScore(risks),
  };

  scores.overallScore = Math.round(
    (scores.performanceScore + scores.seoScore + scores.securityScore + scores.riskScore) /
      4
  );

  return scores;
}

module.exports = {
  calculatePerformanceScore,
  calculateRiskScore,
  calculateSEOScore,
  calculateSecurityScore,
  calculateScanScores,
};
