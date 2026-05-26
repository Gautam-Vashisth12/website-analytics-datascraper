import Metric from "./Metric";
import RiskCard from "./RiskCard";

function getLoadSeverity(loadTime) {
  if (loadTime > 5000) {
    return "high";
  }

  if (loadTime > 3000) {
    return "warning";
  }

  return "good";
}

function PerformanceSection({ performance = {}, data = {} }) {
  const loadTime = performance.loadTime ?? data.loadTime;
  const imageCount = performance.imageCount ?? data.imageCount;
  const linkCount = performance.linkCount ?? data.linkCount;
  const scriptCount = performance.scriptCount ?? 0;
  const stylesheetCount = performance.stylesheetCount ?? 0;
  const totalAssetCount = performance.totalAssetCount ?? imageCount + scriptCount + stylesheetCount;
  const lazyLoadingCoverage = performance.lazyLoadingCoverage ?? 100;
  const renderBlockingScriptCount = performance.renderBlockingScriptCount ?? 0;
  const estimatedHeavyAssetUsage = performance.estimatedHeavyAssetUsage ?? false;
  const loadSeverity = getLoadSeverity(loadTime ?? 0);

  return (
    <details className="dashboard-section">
      <summary className="dashboard-section-summary">
        <span>Performance Analysis</span>
        <span>{loadSeverity === "good" ? "Fast" : "Optimize"}</span>
      </summary>

      <div className="grid gap-3 lg:grid-cols-3">
        <RiskCard
          severity={loadSeverity}
          title={`${loadTime ?? "--"} ms load`}
          description="Measured from navigation start to DOM content loaded."
        />
        <RiskCard
          severity={imageCount > 50 ? "warning" : "good"}
          title={`${imageCount ?? 0} images`}
          description="Heavy image usage can slow down first load."
        />
        <RiskCard
          severity={scriptCount > 30 ? "warning" : "good"}
          title={`${scriptCount ?? 0} scripts`}
          description="Script count gives a quick complexity signal."
        />
        <RiskCard
          severity={renderBlockingScriptCount > 0 ? "warning" : "good"}
          title={`${renderBlockingScriptCount} render-blocking scripts`}
          description="Blocking scripts can delay first render."
        />
        <RiskCard
          severity={estimatedHeavyAssetUsage ? "warning" : "good"}
          title={`${totalAssetCount} total assets`}
          description="High asset counts can increase load and execution cost."
        />
        <RiskCard
          severity={lazyLoadingCoverage < 50 && imageCount > 10 ? "warning" : "good"}
          title={`${lazyLoadingCoverage}% lazy loading`}
          description="Lazy loading helps defer below-the-fold images."
        />
      </div>

      <div className="mt-4 rounded-lg border border-white/10 px-4">
        <Metric label="Load time" value={loadTime ? `${loadTime} ms` : null} status={loadSeverity} />
        <Metric label="Images" value={imageCount} status={imageCount > 50 ? "warning" : "good"} />
        <Metric label="Links" value={linkCount} />
        <Metric label="Scripts" value={scriptCount} status={scriptCount > 30 ? "warning" : "good"} />
        <Metric label="Stylesheets" value={stylesheetCount} status={stylesheetCount > 15 ? "warning" : "good"} />
        <Metric label="Total assets" value={totalAssetCount} status={estimatedHeavyAssetUsage ? "warning" : "good"} />
        <Metric label="Lazy-loaded images" value={performance.lazyLoadedImageCount ?? 0} status={lazyLoadingCoverage >= 50 ? "good" : "warning"} />
        <Metric label="Render-blocking scripts" value={renderBlockingScriptCount} status={renderBlockingScriptCount > 0 ? "warning" : "good"} />
      </div>
    </details>
  );
}

export default PerformanceSection;
