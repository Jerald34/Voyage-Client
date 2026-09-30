"use client";

import { useState } from "react";

export default function UsageBarChart({
  series,
  metric = "totalTokens",
  height = 160,
  formatValue = (v) => v.toLocaleString(),
}) {
  const [active, setActive] = useState(null);

  if (!series?.length) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md border border-border/12 bg-surface-elevated text-sm text-text-muted">
        No usage in this range yet.
      </div>
    );
  }

  const max = Math.max(...series.map((d) => d[metric] || 0), 1);
  const barW = 100 / series.length;
  const activeDatum = active != null ? series[active] : null;

  return (
    <div className="rounded-md border border-border/12 bg-surface-elevated p-4 shadow-soft">
      <div className="mb-1 flex items-center justify-between text-xs text-text-soft">
        <span className="tabular-nums">Peak {formatValue(max)}</span>
        {activeDatum && (
          <span className="font-semibold tabular-nums text-text-primary">
            {activeDatum.bucket}:{" "}
            <span>{formatValue(activeDatum[metric] || 0)}</span>
          </span>
        )}
      </div>

      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line
            key={g}
            x1="0"
            x2="100"
            y1={height - g * height}
            y2={height - g * height}
            stroke="currentColor"
            className="text-border/20"
            strokeWidth="0.3"
          />
        ))}
        {series.map((d, i) => {
          const h = ((d[metric] || 0) / max) * (height - 8);
          return (
            <rect
              key={d.bucket}
              role="img"
              aria-label={`${d.bucket}: ${formatValue(d[metric] || 0)}`}
              tabIndex={0}
              x={i * barW + barW * 0.15}
              y={height - h}
              width={barW * 0.7}
              height={h}
              rx="0.6"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className={`transition-[height,y] duration-300 [transition-timing-function:var(--ease-out)] motion-reduce:transition-none ${
                active === i ? "fill-primary" : "fill-primary/80"
              }`}
            >
              <title>{`${d.bucket}: ${formatValue(d[metric] || 0)}`}</title>
            </rect>
          );
        })}
      </svg>

      <div className="mt-1 flex justify-between text-[10px] text-text-soft">
        <span>{series[0].bucket}</span>
        {series.length > 1 && <span>{series[series.length - 1].bucket}</span>}
      </div>
    </div>
  );
}
