import { Activity, Gauge, Lock, Radar, SearchCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

function getScoreState(score) {
  if (score >= 85) {
    return {
      label: "Strong",
      className: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
      ring: "bg-emerald-300",
    };
  }

  if (score >= 60) {
    return {
      label: "Watch",
      className: "border-amber-400/20 bg-amber-400/10 text-amber-100",
      ring: "bg-amber-300",
    };
  }

  return {
    label: "Risk",
    className: "border-red-400/20 bg-red-500/10 text-red-100",
    ring: "bg-red-300",
  };
}

function ScoreCard({ label, score, icon: Icon }) {
  const state = getScoreState(score ?? 0);

  return (
    <article className="group rounded-lg border border-white/10 bg-white/[0.06] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.09]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-black/40 text-white">
          <Icon className="h-5 w-5" />
        </div>
        <span className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", state.className)}>
          {state.label}
        </span>
      </div>

      <div className="mt-5">
        <div className="text-sm text-zinc-400">{label}</div>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-4xl font-semibold leading-none text-white">{score ?? "--"}</span>
          <span className="pb-1 text-sm text-zinc-500">/ 100</span>
        </div>
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn("h-full rounded-full transition-all duration-700", state.ring)}
          style={{ width: `${Math.min(score ?? 0, 100)}%` }}
        />
      </div>
    </article>
  );
}

function OverviewCards({ scores }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <ScoreCard label="Overall" score={scores?.overallScore} icon={Radar} />
      <ScoreCard label="Performance" score={scores?.performanceScore} icon={Gauge} />
      <ScoreCard label="SEO Readiness" score={scores?.seoScore} icon={SearchCheck} />
      <ScoreCard label="Security Posture" score={scores?.securityScore} icon={Lock} />
      <ScoreCard label="Risk Control" score={scores?.riskScore} icon={ShieldAlert} />
      <div className="rounded-lg border border-white/10 bg-black/35 p-5 md:hidden">
        <div className="flex items-center gap-2 text-sm text-zinc-300">
          <Activity className="h-4 w-4" />
          Intelligence summary ready
        </div>
      </div>
    </section>
  );
}

export default OverviewCards;
