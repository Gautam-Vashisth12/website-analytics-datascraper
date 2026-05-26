function analyzePerformance(rawData) {
  const imageCount = rawData.images.length;
  const scriptCount = rawData.scripts.length;
  const stylesheetCount = rawData.stylesheets.length;
  const lazyLoadedImageCount = rawData.images.filter(
    (image) => image.loading?.toLowerCase() === "lazy"
  ).length;
  const lazyLoadingCoverage =
    imageCount === 0 ? 100 : Math.round((lazyLoadedImageCount / imageCount) * 100);
  const renderBlockingScripts = rawData.scripts.filter(
    (script) => script.src && !script.async && !script.defer && script.type !== "module"
  );
  const totalAssetCount = imageCount + scriptCount + stylesheetCount + rawData.iframes.length;

  return {
    loadTime: rawData.loadTime,
    imageCount,
    linkCount: rawData.links.length,
    scriptCount,
    stylesheetCount,
    totalAssetCount,
    lazyLoadedImageCount,
    lazyLoadingCoverage,
    estimatedHeavyAssetUsage:
      imageCount > 40 || scriptCount > 30 || stylesheetCount > 15 || totalAssetCount > 90,
    renderBlockingScriptCount: renderBlockingScripts.length,
    renderBlockingScripts: renderBlockingScripts.map((script) => script.src),
  };
}

module.exports = {
  analyzePerformance,
};
