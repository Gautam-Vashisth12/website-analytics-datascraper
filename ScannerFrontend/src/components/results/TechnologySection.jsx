import TechnologyBadge from "./TechnologyBadge";

const categoryLabels = {
  frameworks: "Frameworks",
  cms: "CMS / Platforms",
  infrastructure: "Infrastructure",
  analytics: "Analytics / Marketing",
};

function TechnologySection({ technologies = {} }) {
  const groups = ["frameworks", "cms", "infrastructure", "analytics"];
  const totalDetected = groups.reduce(
    (count, group) => count + (technologies[group]?.length || 0),
    0
  );

  return (
    <details className="dashboard-section" open>
      <summary className="dashboard-section-summary">
        <span>Technology Detection</span>
        <span>{totalDetected} detected</span>
      </summary>

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => {
          const items = technologies[group] || [];

          return (
            <div key={group} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">{categoryLabels[group]}</h3>
                <span className="text-xs text-zinc-500">{items.length}</span>
              </div>

              {items.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {items.map((technology) => (
                    <TechnologyBadge key={`${group}-${technology.name}`} technology={technology} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No clear fingerprint detected.</p>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}

export default TechnologySection;
