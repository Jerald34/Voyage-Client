"use client";

import { useState } from "react";
import { fmtInt, fmtShortDate, fmtUsd } from "./usageFormat.js";

const FORMAT = { costUsd: fmtUsd, totalTokens: fmtInt, runCount: fmtInt };
const GROUP_LABEL = { costUsd: "Cost per day", totalTokens: "Tokens per day", runCount: "Runs per day" };
const VALUE_HEADING = { costUsd: "Cost", totalTokens: "Tokens", runCount: "Runs" };

function describe(d, metric) {
  const date = fmtShortDate(d.bucket);
  if (metric === "runCount") {
    return `${date}: ${fmtInt(d.runCount)} run${d.runCount === 1 ? "" : "s"}${d.failedRunCount ? `, ${d.failedRunCount} failed` : ""}`;
  }
  return `${date}: ${FORMAT[metric](d[metric] || 0)}`;
}

/** One sentence a screen reader can announce in place of the picture: what, when, total, peak. */
function summarise(series, metric) {
  const fmt = FORMAT[metric];
  const first = fmtShortDate(series[0].bucket);
  const last = fmtShortDate(series[series.length - 1].bucket);
  const when = series.length > 1 ? `${first} to ${last}` : first;
  const head = `${GROUP_LABEL[metric] || "Usage per day"}, ${when}.`;

  let total = 0;
  let failed = 0;
  let peak = series[0];
  for (const d of series) {
    total += d[metric] || 0;
    failed += d.failedRunCount || 0;
    if ((d[metric] || 0) > (peak[metric] || 0)) peak = d;
  }
  if (!total) return `${head} No usage on any day.`;
  const failedNote = metric === "runCount" && failed ? `, ${fmtInt(failed)} failed` : "";
  return `${head} Total ${fmt(total)}${failedNote}. Peak ${fmt(peak[metric] || 0)} on ${fmtShortDate(peak.bucket)}.`;
}

export default function UsageBarChart({ series, metric = "costUsd", height = 160 }) {
  const [active, setActive] = useState(null);

  if (!series?.length) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md border border-border/12 bg-surface-elevated text-sm text-text-muted">
        No usage in this range.
      </div>
    );
  }

  const fmt = FORMAT[metric];
  // `peak` is what the data really reached (and is what the label prints); `max` is only the scale,
  // floored so an all-zero range does not divide by zero.
  const peak = Math.max(...series.map((d) => d[metric] || 0));
  const max = Math.max(peak, metric === "costUsd" ? 0.0001 : 1);
  const barW = 100 / series.length;
  const mid = Math.floor((series.length - 1) / 2);
  const activeDatum = active != null ? series[active] : null;

  return (
    <div className="rounded-md border border-border/12 bg-surface-elevated p-4 shadow-soft">
      <div className="mb-1 flex items-center justify-between gap-3 text-xs text-text-soft">
        <span className="tabular-nums">{peak > 0 ? `Peak ${fmt(peak)}` : "No usage in this range"}</span>
        {activeDatum && <span className="font-semibold tabular-nums text-text-primary">{describe(activeDatum, metric)}</span>}
      </div>

      {/* The bars are decoration for the mouse (hover tooltips); a screen reader gets the summary
          label here plus the table below, and the keyboard gets no 30-bar tab trap. */}
      <svg
        role="img"
        aria-label={summarise(series, metric)}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
      >
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1="0" x2="100" y1={height - g * height} y2={height - g * height} stroke="currentColor" className="text-border/20" strokeWidth="0.3" />
        ))}
        {series.map((d, i) => {
          const value = d[metric] || 0;
          const h = (value / max) * (height - 8);
          const failedH = metric === "runCount" && d.runCount ? (d.failedRunCount / d.runCount) * h : 0;
          const x = i * barW + barW * 0.15;
          const w = barW * 0.7;
          return (
            <g key={d.bucket} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
              <title>{describe(d, metric)}</title>
              {/* An invisible full-height hit area keeps empty days hoverable. */}
              <rect x={i * barW} y={0} width={barW} height={height} fill="transparent" />
              <rect
                x={x}
                y={height - h}
                width={w}
                height={h}
                rx="0.6"
                className={`transition-[height,y] duration-300 [transition-timing-function:var(--ease-out)] motion-reduce:transition-none ${
                  active === i ? "fill-primary" : "fill-primary/80"
                }`}
              />
              {failedH > 0 && <rect x={x} y={height - failedH} width={w} height={failedH} rx="0.6" className="fill-status-danger/80" />}
            </g>
          );
        })}
      </svg>

      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-text-soft">
        <span>{fmtShortDate(series[0].bucket)}</span>
        {series.length > 2 && <span>{fmtShortDate(series[mid].bucket)}</span>}
        {series.length > 1 && <span>{fmtShortDate(series[series.length - 1].bucket)}</span>}
      </div>

      <table className="sr-only">
        <caption>{GROUP_LABEL[metric] || "Usage per day"}</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">{VALUE_HEADING[metric] || "Value"}</th>
            {metric === "runCount" && <th scope="col">Failed runs</th>}
          </tr>
        </thead>
        <tbody>
          {series.map((d) => (
            <tr key={d.bucket}>
              <th scope="row">{fmtShortDate(d.bucket)}</th>
              <td>{fmt(d[metric] || 0)}</td>
              {metric === "runCount" && <td>{fmtInt(d.failedRunCount)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
