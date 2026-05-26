import Metric from "./Metric";
import RiskCard from "./RiskCard";

function SEOSection({ seo = {}, data = {} }) {
  const title = seo.title ?? data.title;
  const description = seo.description ?? data.description;
  const h1Count = seo.h1Count ?? (data.headers?.h1 ? 1 : 0);
  const imageAltCoverage = seo.imageAltCoverage ?? 100;
  const titleLength = seo.titleLength ?? title?.length ?? 0;
  const hasOpenGraph = seo.hasOpenGraph ?? false;
  const hasCanonical = seo.hasCanonical ?? Boolean(seo.canonicalUrl);
  const hasRobotsMeta = seo.hasRobotsMeta ?? Boolean(seo.robots);
  const hasFavicon = seo.hasFavicon ?? false;
  const missingAltCount = seo.missingAltCount ?? 0;

  return (
    <details className="dashboard-section">
      <summary className="dashboard-section-summary">
        <span>SEO Analysis</span>
        <span>{title && description && h1Count > 0 ? "Healthy" : "Needs work"}</span>
      </summary>

      <div className="grid gap-3 lg:grid-cols-3">
        <RiskCard
          severity={title ? "good" : "high"}
          title={title ? "Title found" : "Title missing"}
          description="Page titles are a core search and sharing signal."
        />
        <RiskCard
          severity={description ? "good" : "warning"}
          title={description ? "Meta description found" : "Meta description missing"}
          description="Descriptions improve search result context."
        />
        <RiskCard
          severity={h1Count === 1 ? "good" : h1Count > 1 ? "warning" : "high"}
          title={`${h1Count} H1 ${h1Count === 1 ? "tag" : "tags"}`}
          description="A single clear H1 keeps page hierarchy easier to understand."
        />
        <RiskCard
          severity={hasOpenGraph ? "good" : "informational"}
          title={hasOpenGraph ? "OpenGraph present" : "OpenGraph missing"}
          description="OpenGraph tags improve social preview quality."
        />
        <RiskCard
          severity={hasCanonical ? "good" : "informational"}
          title={hasCanonical ? "Canonical present" : "Canonical missing"}
          description="Canonical tags help consolidate duplicate URL variants."
        />
        <RiskCard
          severity={missingAltCount > 0 ? "warning" : "good"}
          title={`${missingAltCount} missing alt attributes`}
          description="Alt text improves accessibility and image understanding."
        />
      </div>

      <div className="mt-4 rounded-lg border border-white/10 px-4">
        <Metric label="Title" value={title} status={title ? "good" : "high"} />
        <Metric label="Title length" value={titleLength} status={seo.titleLengthStatus === "review" ? "warning" : "good"} />
        <Metric label="Meta description" value={description} status={description ? "good" : "warning"} />
        <Metric label="H1 count" value={h1Count} status={h1Count === 1 ? "good" : "warning"} />
        <Metric
          label="Image alt coverage"
          value={`${imageAltCoverage}%`}
          status={imageAltCoverage >= 80 ? "good" : "warning"}
        />
        <Metric label="Canonical tag" value={hasCanonical ? "Present" : "Missing"} status={hasCanonical ? "good" : "neutral"} />
        <Metric label="Robots meta" value={hasRobotsMeta ? seo.robots : "Missing"} status={hasRobotsMeta ? "good" : "neutral"} />
        <Metric label="OpenGraph" value={hasOpenGraph ? `${seo.openGraphTagCount ?? 0} tags` : "Missing"} status={hasOpenGraph ? "good" : "neutral"} />
        <Metric label="Favicon" value={hasFavicon ? "Present" : "Missing"} status={hasFavicon ? "good" : "neutral"} />
      </div>
    </details>
  );
}

export default SEOSection;
