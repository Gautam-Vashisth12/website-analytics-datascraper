function calculatePerformanceScore(data) {
  let score = 100;

  if (data.loadTime > 5000) {
    score -= 40;
  } else if (data.loadTime > 3000) {
    score -= 20;
  }

  if (data.imageCount > 50) {
    score -= 20;
  } else if (data.imageCount > 20) {
    score -= 10;
  }

  return Math.max(score, 0);
}

function calculateSEOScore(data) {
  let score = 100;

  if (!data.title) {
    score -= 30;
  }

  if (!data.description) {
    score -= 25;
  }

  if (!data.headers.h1) {
    score -= 20;
  }

  return Math.max(score, 0);
}

function calculateSecurityScore(data) {
  let score = 100;

  if (!data.usesHttps) {
    score -= 40;
  }

  if (!data.securityHeaders.csp) {
    score -= 20;
  }

  if (!data.securityHeaders.xFrame) {
    score -= 10;
  }

  return Math.max(score, 0);
}

module.exports = {
  calculatePerformanceScore,
  calculateSEOScore,
  calculateSecurityScore,
};