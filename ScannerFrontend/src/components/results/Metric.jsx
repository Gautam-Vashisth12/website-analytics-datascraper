import { cn } from "@/lib/utils";

function Metric({ label, value, status = "neutral", helper }) {
  const statusStyles = {
    good: "text-emerald-200",
    warning: "text-amber-200",
    high: "text-red-200",
    neutral: "text-white",
  };

  return (
    <div className="flex items-start justify-between gap-5 border-b border-white/10 py-3 last:border-b-0">
      <div>
        <div className="text-sm text-zinc-400">{label}</div>
        {helper ? <div className="mt-1 text-xs text-zinc-500">{helper}</div> : null}
      </div>
      <div className={cn("max-w-[56%] text-right text-sm font-medium", statusStyles[status])}>
        {value ?? "Not found"}
      </div>
    </div>
  );
}

export default Metric;
