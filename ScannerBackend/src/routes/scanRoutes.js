const express = require("express");

const { ScrapeError, scrapeWebsite } = require("../services/scraperService");
const { analyzePerformance } = require("../services/analyzers/performanceAnalyzer");
const { analyzeSEO } = require("../services/analyzers/seoAnalyzer");
const { analyzeSecurity } = require("../services/analyzers/securityAnalyzer");
const { analyzeTechnologies } = require("../services/analyzers/technologyAnalyzer");
const { createRisks } = require("../services/riskEngine");
const { calculateScanScores } = require("../services/scoreService");

const router = express.Router();

router.post("/", async (req, res) => {
  const scanStartedAt = new Date();
  const scanStartTime = Date.now();

  try {
    const { url } = req.body;
    let parsedUrl;

    try {
      parsedUrl = new URL(url);
    } catch {
      parsedUrl = null;
    }

    if (
      typeof url !== "string" ||
      !parsedUrl ||
      !["http:", "https:"].includes(parsedUrl.protocol)
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

    console.log("Scanning:", url);

    const rawData = await scrapeWebsite(url);
    const seo = analyzeSEO(rawData);
    const security = analyzeSecurity(rawData);
    const performance = analyzePerformance(rawData);
    const technologies = analyzeTechnologies(rawData);
    const risks = createRisks({
      seo,
      security,
      performance,
    });
    const scores = calculateScanScores({
      seo,
      security,
      performance,
      risks,
    });
    const scanDuration = Date.now() - scanStartTime;
    const overview = {
      scannedUrl: url,
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

      // Compatibility fields for the current frontend.
      title: seo.title,
      description: seo.description,
      loadTime: performance.loadTime,
      imageCount: performance.imageCount,
      linkCount: performance.linkCount,
      headers: {
        h1: seo.h1Texts[0] || null,
      },
      securityHeaders: {
        csp: security.csp,
        xFrame: security.xFrame,
      },
      usesHttps: security.usesHttps,
    };

    res.json({
      success: true,
      overview,
      seo,
      security,
      performance,
      technologies,
      risks,
      scores,
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