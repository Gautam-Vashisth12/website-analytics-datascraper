const express = require("express");

const { scrapeWebsite } = require("../services/scraperService");
const {
  calculatePerformanceScore,
  calculateSEOScore,
  calculateSecurityScore,
} = require("../services/scoreService");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url.startsWith("http")) {
      return res.status(400).json({
        success: false,
        message: "Invalid URL",
      });
    }

    console.log("Scanning:", url);

    const result = await scrapeWebsite(url);
    const performanceScore =
        calculatePerformanceScore(result);

    const seoScore =
        calculateSEOScore(result);

    const securityScore =
        calculateSecurityScore(result);

    res.json({
      success: true,
      data: result,
        scores: {
        performanceScore,
        seoScore,
        securityScore,
     },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Scan failed",
    });
  }
});

module.exports = router;