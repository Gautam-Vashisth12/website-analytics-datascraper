const express = require("express");

const { ScrapeError, scrapeWebsite } = require("../services/scraperService");
const { analyzePerformance } = require("../services/analyzers/performanceAnalyzer");
const { analyzeSEO } = require("../services/analyzers/seoAnalyzer");
const { analyzeSecurity } = require("../services/analyzers/securityAnalyzer");
const { analyzeTechnologies } = require("../services/analyzers/technologyAnalyzer");
const { createRisks } = require("../services/riskEngine");
const { calculateScanScores } = require("../services/scoreService");
const { resolveUrl } = require("../services/urlResolver");

function runAnalyzerSafely(name, analyzerFn, fallback) {
  try {
    return { data: analyzerFn(), warning: null };
  } catch (error) {
    console.error(`[SCAN WARNING] Code: ANALYZER_FAILED Analyzer: ${name}`);
    console.error(error.message);
    return {
      data: fallback,
      warning: {
        code: "ANALYZER_FAILED",
        message: `${name} analyzer failed: ${error.message}`,
      },
    };
  }
}

const router = express.Router();

router.post("/", async (req, res) => {
  const scanStartedAt = new Date();
  const scanStartTime = Date.now();

  try {
    const { url } = req.body;
    if (
      typeof url !== "string" ||
      !url.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid URL",
        error: {
          code: "INVALID_URL",
          message: "Invalid URL",
        },
      });
    }

    let resolution;
    try {
      resolution = await resolveUrl(url);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        error: {
          code: error.code || "UNREACHABLE_URL",
          message: error.message,
        },
      });
    }

    console.log(`Original URL: ${resolution.userInput} -> Resolved: ${resolution.resolvedUrl}`);

    const rawData = await scrapeWebsite(resolution.resolvedUrl);
    const warnings = [...(rawData.warnings || [])];

    const seoResult = runAnalyzerSafely("SEO", () => analyzeSEO(rawData), {
      hasTitle: false,
      hasMetaDescription: false,
      h1Count: 0,
      imageAltCoverage: 0,
      hasMultipleH1: false,
      hasCanonical: false,
      hasOpenGraph: false,
      hasFavicon: false,
      title: null,
      description: null,
      h1Texts: [],
    });
    if (seoResult.warning) warnings.push(seoResult.warning);
    const seo = seoResult.data;

    const securityResult = runAnalyzerSafely("Security", () => analyzeSecurity(rawData), {
      usesHttps: false,
      hasCsp: false,
      hasXFrameOptions: false,
      hasHsts: false,
      hasContentTypeOptions: false,
      insecureFormCount: 0,
      mixedContentCount: 0,
      suspiciousScriptCount: 0,
      score: 0,
      csp: null,
      xFrame: null,
      hsts: null,
      contentTypeOptions: null,
    });
    if (securityResult.warning) warnings.push(securityResult.warning);
    const security = securityResult.data;

    const performanceResult = runAnalyzerSafely("Performance", () => analyzePerformance(rawData), {
      loadTime: rawData.loadTime || 0,
      imageCount: 0,
      renderBlockingScriptCount: 0,
      estimatedHeavyAssetUsage: false,
      lazyLoadingCoverage: 0,
      linkCount: 0,
      score: 0,
    });
    if (performanceResult.warning) warnings.push(performanceResult.warning);
    const performance = performanceResult.data;

    const technologyResult = runAnalyzerSafely("Technology", () => analyzeTechnologies(rawData), {
      technologies: [],
      categories: {},
      technologyDebug: {},
    });
    if (technologyResult.warning) warnings.push(technologyResult.warning);
    const technologies = technologyResult.data;

    const riskResult = runAnalyzerSafely("Risk Engine", () => createRisks({
      seo,
      security,
      performance,
    }), []);
    if (riskResult.warning) warnings.push(riskResult.warning);
    const risks = riskResult.data;

    const scoreResult = runAnalyzerSafely("Score Engine", () => calculateScanScores({
      seo,
      security,
      performance,
      risks,
    }), { overallScore: 0, performanceScore: 0, seoScore: 0, securityScore: 0, riskScore: 0 });
    if (scoreResult.warning) warnings.push(scoreResult.warning);
    const scores = scoreResult.data;

    const scanDuration = Date.now() - scanStartTime;
    const overview = {
      scannedUrl: url,
      resolvedUrl: resolution.resolvedUrl,
      finalUrl: rawData.finalUrl,
      status: rawData.status,
      redirectCount: rawData.redirectCount,
      scanTimestamp: scanStartedAt.toISOString(),
      scanDuration,
      riskCount: risks.length,
      criticalRiskCount: risks.filter((risk) => risk.severity === "critical").length,
      highRiskCount: risks.filter((risk) => risk.severity === "high").length,
      overallScore: scores.overallScore,
    };
    const compatibilityData = {
      seo,
      security,
      performance,
      technologies,
      technologyDebug: technologies.technologyDebug,

      // Compatibility fields for the current frontend.
      title: seo.title,
      description: seo.description,
      loadTime: performance.loadTime,
      imageCount: performance.imageCount,
      linkCount: performance.linkCount,
      headers: {
        h1: seo.h1Texts[0] || null,
      },
      securityDebug: rawData.securityDebug,
      securityHeaders: {
        csp: security.csp,
        xFrame: security.xFrame,
      },
      usesHttps: security.usesHttps,
    };

    res.json({
      success: true,
      warnings,
      overview,
      seo,
      security,
      performance,
      technologies,
      risks,
      scores,
      securityDebug: rawData.securityDebug,
      technologyDebug: technologies.technologyDebug,
      data: compatibilityData,
    });
  } catch (error) {
    console.error("FULL SCAN ERROR:");
    console.error(error);
    console.error(error.stack);

    if (error instanceof ScrapeError) {
      return res.status(504).json({
        success: false,
        message: error.message,
        error: {
          code: "SCAN_FAILED",
          message: error.message,
          details: error.details,
        },
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Scan failed",
      error: {
        code: "INTERNAL_ERROR",
        message: error.message || "Scan failed",
      },
    });
  }
});
module.exports = router;
