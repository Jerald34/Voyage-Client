"use client";
import { useState } from "react";
import FunnelStageDetailPanel from "./FunnelStageDetailPanel";

const STAGE_LABELS = {
  created: "Trips created",
  drafted: "Itineraries drafted",
  sent: "Shared with client",
  viewed: "Viewed by client",
  approved: "Approved"
};

/**
 * Horizontal proportional funnel chart with drop-off labels between stages.
 *
 * Click (or Enter/Space) on a stage opens the right-side detail panel
 * listing the trips at that stage. Spec §3.3 and §6.4.
 *
 * `periodLabel` (e.g. "Last 30 days") names the window the counts cover.
 */
export default function FunnelChart({ stages = [], agencyId, periodLabel }) {
  const [activeStage, setActiveStage] = useState(null);
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  if (stages.length === 0) {
    return null;
  }

  const created = stages[0]?.count ?? 0;
  const approved = stages[stages.length - 1]?.count ?? 0;
  const counts = `${created} trip${created === 1 ? "" : "s"} created, ${approved} approved.`;
  const summary = periodLabel ? `${periodLabel}: ${counts}` : counts;

  return (
    <>
      <section
        aria-label={summary}
        className="dashboard-card p-6"
      >
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-[0.7rem] font-extrabold uppercase tracking-[0.05em]">TRIP PROGRESS</span>
        <h2 className="mt-2 text-lg font-extrabold text-text-primary">From new trip to approval</h2>
        <p className="mt-1 text-xs text-text-muted">{summary}</p>
        <ol className="mt-4 space-y-3">
          {stages.map((stage, i) => {
            const widthPct = (stage.count / maxCount) * 100;
            const dropOff = stage.dropOffPct;
            return (
              <li key={stage.key} className="flex flex-col gap-1">
                {dropOff !== null && i > 0 ? (
                  <div className="flex items-center gap-2 pl-2 text-[11px] uppercase tracking-wide text-text-muted">
                    <span aria-hidden="true">↓</span>
                    <span className="tabular-nums">{dropOff.toFixed(1)}% drop-off</span>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => setActiveStage(stage)}
                  aria-label={`${STAGE_LABELS[stage.key]}: ${stage.count}. Open trip list.`}
                  className="group relative flex items-center gap-3 rounded-md border border-border/10 px-3 py-2 text-left transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                  style={{ transitionTimingFunction: "var(--ease-out)", transitionDuration: "160ms" }}
                >
                  <div
                    className="absolute inset-y-0 left-0 -z-0 rounded-l-lg bg-[color:var(--accent)]/10"
                    style={{ width: `${widthPct}%` }}
                    aria-hidden="true"
                  />
                  <div className="relative z-10 flex flex-1 items-center justify-between">
                    <span className="text-sm font-bold text-text-primary">{STAGE_LABELS[stage.key]}</span>
                    <span className="tabular-nums text-sm font-bold text-text-primary">{stage.count}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <FunnelStageDetailPanel
        stage={activeStage}
        agencyId={agencyId}
        onClose={() => setActiveStage(null)}
      />
    </>
  );
}
