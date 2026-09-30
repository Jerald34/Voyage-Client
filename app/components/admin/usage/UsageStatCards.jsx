"use client";

import Sparkline from "./Sparkline.jsx";

const fmtInt = (n) => (n ?? 0).toLocaleString();
const fmtUsd = (n) => `$${(n ?? 0).toFixed(3)}`;

function Card({ label, value, children }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/12 bg-surface-elevated p-4 shadow-soft">
      <p className="dashboard-eyebrow">{label}</p>
      <p className="text-2xl font-semibold tabular-nums text-text-primary">{value}</p>
      {children}
    </div>
  );
}

export default function UsageStatCards({ totals, series }) {
  const t = totals || {};
  const tokenSeries = Array.isArray(series) ? series.map((d) => d.totalTokens || 0) : [];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card label="Total tokens" value={fmtInt(t.totalTokens)}>
        <div className="text-primary/60">
          <Sparkline values={tokenSeries} testId="usage-sparkline" />
        </div>
      </Card>
      <Card label="Est. cost" value={fmtUsd(t.costUsd)} />
      <Card label="Runs" value={fmtInt(t.runCount)} />
      <Card label="Cached tokens" value={fmtInt(t.cachedTokens)} />
    </div>
  );
}
