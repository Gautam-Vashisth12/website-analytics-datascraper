import { cn } from "@/lib/utils";

function TechnologyBadge({ technology }) {
  const confidenceStyles = {
    high: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    medium: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    low: "border-zinc-400/20 bg-white/[0.06] text-zinc-200",
  };
  const confidence = technology.confidence || "low";
  const evidence = Array.isArray(technology.evidence)
    ? technology.evidence.join("; ")
    : technology.evidence;

  return (
    <div
      className={cn(
        "group relative inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-transform hover:-translate-y-0.5",
        confidenceStyles[confidence] || confidenceStyles.low
      )}
      title={evidence}
    >
      <span>{technology.name}</span>
      <span className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] uppercase tracking-wide">
        {confidence}
      </span>
      {evidence ? (
        <span className="pointer-events-none absolute left-0 top-[calc(100%+0.5rem)] z-50 hidden w-64 rounded-lg border border-white/10 bg-black/95 p-3 text-xs leading-5 text-zinc-200 shadow-[0_18px_50px_rgba(0,0,0,0.45)] group-hover:block">
          {evidence}
        </span>
      ) : null}
    </div>
  );
}

export default TechnologyBadge;
