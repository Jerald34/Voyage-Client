"use client";

import Sparkline from "./Sparkline.jsx";
import { deltaPct, fmtInt, fmtPct, fmtUsd } from "./usageFormat.js";

function Card({ label, value, children }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border/12 bg-surface-elevated p-4 shadow-soft">
      <p className="dashboard-eyebrow">{label}</p>
      <p className="text-2xl font-semibold tabular-nums text-text-primary">{value}</p>
      {children}
    </div>
  );
}

const Sub = ({ className = "text-text-muted", children }) => <p className={`text-xs tabular-nums ${className}`}>{children}</p>;

function changeLine(current, previous) {
  const d = deltaPct(current, previous);
  if (d === null) return "No spend in the previous period";
  const pct = Math.round(Math.abs(d) * 100);
  if (pct === 0) return "Same as previous period";
  return `${d > 0 ? "Up" : "Down"} ${pct}% vs previous period`;
}

/**
 * @param {boolean} [costIncomplete] some runs used a model with no price, so spend (and the projection built from it) is a floor
 */
export default function UsageStatCards({ totals, previous, projectedMonthEndCostUsd, series, costIncomplete = false }) {
  const t = totals || {};
  const failedShare = t.runCount ? t.failedRunCount / t.runCount : 0;
  const costSeries = Array.isArray(series) ? series.map((d) => d.costUsd || 0) : [];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card label="Spend" value={fmtUsd(t.costUsd)}>
        {costIncomplete && <Sub className="text-status-warning">Excludes unpriced models</Sub>}
        <Sub>{changeLine(t.costUsd ?? 0, previous?.costUsd ?? 0)}</Sub>
        {projectedMonthEndCostUsd != null && (
          <Sub>
            {costIncomplete ? "At least" : "About"} {fmtUsd(projectedMonthEndCostUsd)} by month end
          </Sub>
        )}
        <div className="text-primary/60">
          <Sparkline values={costSeries} testId="usage-sparkline" />
        </div>
      </Card>
      <Card label="Runs" value={fmtInt(t.runCount)}>
        <Sub className={t.failedRunCount ? "text-status-danger" : "text-text-muted"}>
          {t.failedRunCount ? `${fmtPct(failedShare)} failed` : "No failed runs"}
        </Sub>
      </Card>
      <Card label="Avg per run" value={fmtUsd(t.avgCostPerRun)}>
        <Sub>{fmtInt(t.avgTokensPerRun)} tokens</Sub>
      </Card>
      <Card label="Cache hit" value={fmtPct(t.cacheHitRate)}>
        <Sub>of prompt tokens</Sub>
      </Card>
    </div>
  );
}
