import Metric from "./Metric";
import RiskCard from "./RiskCard";

function SecuritySection({ security = {}, data = {} }) {
  const usesHttps = security.usesHttps ?? data.usesHttps;
  const csp = security.csp ?? data.securityHeaders?.csp;
  const xFrame = security.xFrame ?? data.securityHeaders?.xFrame;
  const insecureFormCount = security.insecureFormCount ?? 0;
  const mixedContentCount = security.mixedContentCount ?? 0;
  const iframeCount = security.iframeCount ?? 0;
  const thirdPartyScriptCount = security.thirdPartyScriptCount ?? 0;
  const suspiciousScriptCount = security.suspiciousScriptCount ?? 0;
  const inlineScriptCount = security.inlineScriptCount ?? 0;
  const hasHsts = security.hasHsts ?? Boolean(security.hsts);

  return (
    <details className="dashboard-section" open>
      <summary className="dashboard-section-summary">
        <span>Security Analysis</span>
        <span>{usesHttps && csp && xFrame && mixedContentCount === 0 ? "Hardened" : "Review"}</span>
      </summary>

      <div className="grid gap-3 lg:grid-cols-3">
        <RiskCard
          severity={usesHttps ? "good" : "high"}
          title={usesHttps ? "HTTPS enabled" : "HTTPS missing"}
          description={
            usesHttps
              ? "Traffic is served over an encrypted connection."
              : "The scanned URL is not using HTTPS."
          }
        />
        <RiskCard
          severity={csp ? "good" : "warning"}
          title={csp ? "CSP header present" : "CSP header missing"}
          description="Content Security Policy helps reduce script injection risk."
        />
        <RiskCard
          severity={xFrame ? "good" : "warning"}
          title={xFrame ? "Frame protection present" : "Frame protection missing"}
          description="X-Frame-Options helps protect against clickjacking."
        />
        <RiskCard
          severity={mixedContentCount > 0 ? "high" : "good"}
          title={mixedContentCount > 0 ? "Mixed content found" : "No mixed content"}
          description="HTTPS pages should not load HTTP scripts, frames, styles, or images."
        />
        <RiskCard
          severity={suspiciousScriptCount > 0 ? "warning" : "good"}
          title={`${thirdPartyScriptCount} third-party scripts`}
          description="External scripts increase supply-chain and privacy review surface."
        />
        <RiskCard
          severity={iframeCount > 0 ? "warning" : "good"}
          title={`${iframeCount} iframe${iframeCount === 1 ? "" : "s"}`}
          description="Embedded frames should be reviewed for trust and sandboxing."
        />
      </div>

      <div className="mt-4 rounded-lg border border-white/10 px-4">
        <Metric label="HTTPS" value={usesHttps ? "Enabled" : "Disabled"} status={usesHttps ? "good" : "high"} />
        <Metric label="Content-Security-Policy" value={csp ? "Present" : "Missing"} status={csp ? "good" : "warning"} />
        <Metric label="X-Frame-Options" value={xFrame ? "Present" : "Missing"} status={xFrame ? "good" : "warning"} />
        <Metric label="Strict-Transport-Security" value={hasHsts ? "Present" : "Missing"} status={hasHsts ? "good" : "warning"} />
        <Metric
          label="Insecure forms"
          value={insecureFormCount}
          status={insecureFormCount > 0 ? "high" : "good"}
          helper="Forms posting to insecure HTTP endpoints."
        />
        <Metric label="Mixed content" value={mixedContentCount} status={mixedContentCount > 0 ? "high" : "good"} />
        <Metric label="Inline scripts" value={inlineScriptCount} status={inlineScriptCount > 10 ? "warning" : "neutral"} />
        <Metric label="Third-party scripts" value={thirdPartyScriptCount} status={suspiciousScriptCount > 0 ? "warning" : "neutral"} />
        <Metric label="Suspicious script sources" value={suspiciousScriptCount} status={suspiciousScriptCount > 0 ? "warning" : "good"} />
      </div>
    </details>
  );
}

export default SecuritySection;
