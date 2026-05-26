import { Clock3, Fingerprint, Globe2, Route, ShieldAlert } from "lucide-react";

function formatDuration(duration) {
  if (duration == null) {
    return "--";
  }

  if (duration >= 1000) {
    return `${(duration / 1000).toFixed(1)}s`;
  }

  return `${duration}ms`;
}

function getQualityLabel(score) {
  if (score >= 85) {
    return "Strong posture";
  }

  if (score >= 60) {
    return "Needs review";
  }

  return "High attention";
}

function SummaryTile({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-3 text-xl font-semibold text-white">{value ?? "--"}</div>
      {helper ? <div className="mt-1 truncate text-xs text-zinc-500">{helper}</div> : null}
    </div>
  );
}

function OverviewSummary({ overview = {}, scores = {}, technologies = {} }) {
  const technologyCount = ["frameworks", "cms", "infrastructure", "analytics"].reduce(
    (total, group) => total + (technologies[group]?.length || 0),
    0
  );
  const overallScore = scores.overallScore ?? overview.overallScore;

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <SummaryTile
        icon={ShieldAlert}
        label="Quality"
        value={getQualityLabel(overallScore ?? 0)}
        helper={overallScore != null ? `${overallScore}/100 overall` : "Awaiting score"}
      />
      <SummaryTile
        icon={Clock3}
        label="Duration"
        value={formatDuration(overview.scanDuration ?? overview.duration)}
        helper={overview.scanTimestamp ? new Date(overview.scanTimestamp).toLocaleString() : null}
      />
      <SummaryTile
        icon={Globe2}
        label="HTTP"
        value={overview.status ?? "--"}
        helper={overview.finalUrl || overview.scannedUrl}
      />
      <SummaryTile
        icon={Fingerprint}
        label="Tech"
        value={technologyCount}
        helper="Detected fingerprints"
      />
      <SummaryTile
        icon={Route}
        label="Redirects"
        value={overview.redirectCount ?? 0}
        helper="Navigation chain"
      />
    </section>
  );
}

export default OverviewSummary;
