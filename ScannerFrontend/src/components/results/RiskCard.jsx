import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function RiskCard({ title, description, severity = "neutral" }) {
  const styles = {
    critical: {
      icon: XCircle,
      className: "border-red-400/35 bg-red-500/15 text-red-50",
      iconClassName: "text-red-300",
    },
    good: {
      icon: CheckCircle2,
      className: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
      iconClassName: "text-emerald-300",
    },
    warning: {
      icon: AlertTriangle,
      className: "border-amber-400/20 bg-amber-400/10 text-amber-100",
      iconClassName: "text-amber-300",
    },
    high: {
      icon: XCircle,
      className: "border-red-400/25 bg-red-500/10 text-red-100",
      iconClassName: "text-red-300",
    },
    medium: {
      icon: AlertTriangle,
      className: "border-amber-400/20 bg-amber-400/10 text-amber-100",
      iconClassName: "text-amber-300",
    },
    low: {
      icon: Info,
      className: "border-amber-300/15 bg-amber-300/5 text-amber-100",
      iconClassName: "text-amber-200",
    },
    informational: {
      icon: Info,
      className: "border-emerald-400/15 bg-emerald-400/5 text-emerald-100",
      iconClassName: "text-emerald-300",
    },
    neutral: {
      icon: Info,
      className: "border-white/10 bg-white/[0.06] text-zinc-200",
      iconClassName: "text-zinc-300",
    },
  };
  const severityStyle = styles[severity] || styles.neutral;
  const Icon = severityStyle.icon;

  return (
    <div className={cn("rounded-lg border p-4", severityStyle.className)}>
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", severityStyle.iconClassName)} />
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {description ? (
            <p className="mt-1 text-xs leading-5 opacity-80">{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default RiskCard;
