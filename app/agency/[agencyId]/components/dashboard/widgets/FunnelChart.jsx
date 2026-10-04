"use client";
import { useId, useState } from "react";
import FunnelStageDetailPanel from "./FunnelStageDetailPanel";

const STAGE_LABELS = {
  created: "Trips created",
  drafted: "Itineraries drafted",
  sent: "Shared with client",
  viewed: "Viewed by client",
  approved: "Approved",
};

const STAGE_SHORT = { created: "Created", drafted: "Drafted", sent: "Shared", viewed: "Viewed", approved: "Approved" };

/** "Biggest drop: drafted to shared (50%)", or null when no stage loses trips. */
export function biggestDrop(stages) {
  let worst = null;
  stages.forEach((stage, index) => {
    if (index === 0 || stage.dropOffPct == null || stage.dropOffPct <= 0) return;
    // A stage the server added after this build has no short name; leave it out.
    if (!STAGE_SHORT[stage.key] || !STAGE_SHORT[stages[index - 1].key]) return;
    if (!worst || stage.dropOffPct > worst.pct) {
      worst = { from: stages[index - 1].key, to: stage.key, pct: stage.dropOffPct };
    }
  });
  if (!worst) return null;
  return `Biggest drop: ${STAGE_SHORT[worst.from].toLowerCase()} to ${STAGE_SHORT[worst.to].toLowerCase()} (${Math.round(worst.pct)}%)`;
}

/**
 * Compact trip progress for the Insights column: one bar per stage and a note
 * on where trips drop off most. Click (or Enter/Space) on a stage opens the
 * detail panel listing its trips.
 */
export default function FunnelChart({ stages = [], agencyId, periodLabel }) {
  const headingId = useId();
  const [activeStage, setActiveStage] = useState(null);

  if (stages.length === 0) return null;

  const maxCount = Math.max(...stages.map((stage) => stage.count), 1);
  const created = stages[0]?.count ?? 0;
  const approved = stages[stages.length - 1]?.count ?? 0;
  const counts = `${created} trip${created === 1 ? "" : "s"} created, ${approved} approved.`;
  const summary = periodLabel ? `${periodLabel}: ${counts}` : counts;
  const drop = biggestDrop(stages);

  return (
    <>
      <section aria-labelledby={headingId}>
        <h3 id={headingId} className="font-sans text-[13px] font-semibold tracking-normal text-text-primary">
          Trip progress
        </h3>
        <p className="mt-0.5 text-[12px] text-text-muted">{summary}</p>
        <ol className="mt-2 space-y-1">
          {stages.map((stage) => (
            <li key={stage.key}>
              <button
                type="button"
                onClick={() => setActiveStage(stage)}
                aria-label={`${STAGE_LABELS[stage.key] ?? stage.key}: ${stage.count}. Open trip list.`}
                className="grid w-full grid-cols-[64px_minmax(0,1fr)_28px] items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-text-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                <span className="text-[12px] text-text-muted">{STAGE_SHORT[stage.key] ?? stage.key}</span>
                <span className="h-1.5 rounded-full bg-text-primary/10">
                  <span className="block h-1.5 rounded-full bg-secondary" style={{ width: `${(stage.count / maxCount) * 100}%` }} />
                </span>
                <span className="text-right text-[12px] font-semibold tabular-nums text-text-primary">{stage.count}</span>
              </button>
            </li>
          ))}
        </ol>
        {drop ? <p className="mt-1.5 text-[12px] text-text-muted">{drop}</p> : null}
      </section>

      <FunnelStageDetailPanel stage={activeStage} agencyId={agencyId} onClose={() => setActiveStage(null)} />
    </>
  );
}
