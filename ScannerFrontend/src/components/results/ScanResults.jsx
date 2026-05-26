import { AlertTriangle, Radar, ShieldCheck } from "lucide-react";

import OverviewCards from "./OverviewCards";
import OverviewSummary from "./OverviewSummary";
import PerformanceSection from "./PerformanceSection";
import RisksSection from "./RisksSection";
import SEOSection from "./SEOSection";
import SecuritySection from "./SecuritySection";
import TechnologySection from "./TechnologySection";

function LoadingDashboard() {
  const skeletonCards = Array.from({ length: 5 }, (_, index) => index);
  const skeletonRows = Array.from({ length: 4 }, (_, index) => index);
  const stages = ["Connecting", "Rendering", "Analyzing", "Scoring"];

  return (
    <section className="scan-results-panel w-full max-w-5xl rounded-lg border border-white/10 bg-black/75 p-5 text-white shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-white/10">
          <Radar className="h-5 w-5 animate-pulse text-emerald-300" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Scanning website...</h2>
          <p className="text-sm text-zinc-400">Collecting page data, headers, and technology fingerprints.</p>
        </div>
      </div>

      <div className="mb-5 grid gap-2 sm:grid-cols-4">
        {stages.map((stage, index) => (
          <div
            key={stage}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-300"
          >
            <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full animate-pulse rounded-full bg-emerald-300"
                style={{ width: `${100 - index * 15}%` }}
              />
            </div>
            {stage}
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {skeletonCards.map((item) => (
          <div key={item} className="h-36 animate-pulse rounded-lg border border-white/10 bg-white/[0.06]" />
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-white/10 p-4">
        {skeletonRows.map((item) => (
          <div key={item} className="mb-3 h-4 animate-pulse rounded-full bg-white/10 last:mb-0" />
        ))}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="w-full max-w-3xl rounded-lg border border-white/10 bg-black/55 p-6 text-center text-white backdrop-blur-xl">
      <div className="mx-auto flex size-11 items-center justify-center rounded-lg bg-white/10">
        <ShieldCheck className="h-5 w-5 text-zinc-200" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">Ready for intelligence</h2>
      <p className="mt-2 text-sm text-zinc-400">
        Enter a website URL to generate a categorized scan dashboard.
      </p>
    </section>
  );
}

function ErrorState({ message }) {
  return (
    <section className="scan-results-panel w-full max-w-3xl rounded-lg border border-red-400/25 bg-red-950/50 p-5 text-red-50 shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-400/15">
          <AlertTriangle className="h-5 w-5 text-red-200" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Scan failed</h2>
          <p className="mt-1 text-sm leading-6 text-red-100/80">
            {message || "The request timed out or the website could not be scanned."}
          </p>
        </div>
      </div>
    </section>
  );
}

function ScanResults({ result, isScanning, error }) {
  if (isScanning) {
    return <LoadingDashboard />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!result) {
    return <EmptyState />;
  }

  const compatibilityData = result.data || {};
  const overview = result.overview || result.metadata || {};
  const seo = result.seo || compatibilityData.seo;
  const security = result.security || compatibilityData.security;
  const performance = result.performance || compatibilityData.performance;
  const technologies = result.technologies || compatibilityData.technologies;
  const risks = result.risks || [];
  const { scores } = result;

  return (
    <section className="scan-results-panel w-full max-w-5xl rounded-lg border border-white/10 bg-black/75 p-5 text-white shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">TraceLayer Intelligence</p>
          <h2 className="mt-2 text-2xl font-semibold">Scan dashboard</h2>
        </div>
        <p className="max-w-xl text-sm text-zinc-400">
          Categorized website signals across security, search readiness, performance, and detected technologies.
        </p>
      </div>

      <div className="space-y-4">
        <OverviewCards scores={scores} />
        <OverviewSummary overview={overview} scores={scores} technologies={technologies} />
        <RisksSection risks={risks} />
        <TechnologySection technologies={technologies} />
        <SecuritySection security={security} data={compatibilityData} />
        <SEOSection seo={seo} data={compatibilityData} />
        <PerformanceSection performance={performance} data={compatibilityData} />
      </div>
    </section>
  );
}

export default ScanResults;
