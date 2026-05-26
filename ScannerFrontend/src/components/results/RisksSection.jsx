import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const severityStyles = {
  critical: "border-red-400/35 bg-red-500/15 text-red-50",
  high: "border-red-400/30 bg-red-500/10 text-red-100",
  medium: "border-amber-400/25 bg-amber-400/10 text-amber-100",
  low: "border-amber-300/15 bg-amber-300/5 text-amber-100",
  informational: "border-emerald-400/15 bg-emerald-400/5 text-emerald-100",
};

const severityLabels = {
  critical: "Critical",
  high: "High",
  medium: "Warning",
  low: "Low",
  informational: "Info",
};

function RiskItem({ risk }) {
  const style = severityStyles[risk.severity] || severityStyles.informational;

  return (
    <details className={cn("rounded-lg border p-4", style)}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="text-sm font-semibold">{risk.title}</div>
            <div className="mt-1 text-xs uppercase tracking-wide opacity-70">{risk.category}</div>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-current/20 px-2.5 py-1 text-xs font-medium">
          {severityLabels[risk.severity] || risk.severity}
        </span>
      </summary>

      <div className="mt-4 border-t border-current/15 pt-4 text-sm leading-6 opacity-85">
        <p>{risk.description}</p>
        {risk.recommendation ? (
          <p className="mt-3">
            <span className="font-semibold">Recommendation:</span> {risk.recommendation}
          </p>
        ) : null}
      </div>
    </details>
  );
}

function RisksSection({ risks = [] }) {
  const criticalCount = risks.filter((risk) => risk.severity === "critical").length;
  const highCount = risks.filter((risk) => risk.severity === "high").length;

  return (
    <details className="dashboard-section" open>
      <summary className="dashboard-section-summary">
        <span>Risks</span>
        <span>{risks.length} findings</span>
      </summary>

      {risks.length > 0 ? (
        <div className="space-y-3">
          {(criticalCount > 0 || highCount > 0) ? (
            <div className="rounded-lg border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
              {criticalCount + highCount} high-priority finding(s) should be reviewed first.
            </div>
          ) : null}
          {risks.map((risk, index) => (
            <RiskItem key={`${risk.category}-${risk.title}-${index}`} risk={risk} />
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          <CheckCircle2 className="h-4 w-4" />
          No actionable risks were returned for this scan.
        </div>
      )}
    </details>
  );
}

export default RisksSection;
