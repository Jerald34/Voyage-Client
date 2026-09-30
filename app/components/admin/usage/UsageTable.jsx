"use client";
import { useState } from "react";

const fmtInt = (n) => (n ?? 0).toLocaleString();
const fmtUsd = (n) => `$${(n ?? 0).toFixed(3)}`;

const COLUMNS = [
  { key: "label", label: "Name", fmt: (v) => v, numeric: false },
  { key: "promptTokens", label: "Prompt", fmt: fmtInt, numeric: true },
  { key: "outputTokens", label: "Output", fmt: fmtInt, numeric: true },
  { key: "totalTokens", label: "Total", fmt: fmtInt, numeric: true },
  { key: "costUsd", label: "Cost", fmt: fmtUsd, numeric: true },
  { key: "runCount", label: "Runs", fmt: fmtInt, numeric: true },
];

export default function UsageTable({ rows = [] }) {
  const [sortKey, setSortKey] = useState("totalTokens");
  const [dir, setDir] = useState("desc");

  if (!rows.length) {
    return (
      <div className="rounded-md border border-border/12 bg-surface-elevated p-8 text-center text-sm text-text-muted">
        No usage to show.
      </div>
    );
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp = typeof av === "string" ? String(av).localeCompare(String(bv)) : av - bv;
    return dir === "asc" ? cmp : -cmp;
  });

  const onSort = (key) => {
    if (key === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setDir(key === "label" ? "asc" : "desc");
    }
  };

  const maxTotal = Math.max(...rows.map((r) => r.totalTokens || 0), 1);

  return (
    <>
      <div className="hidden overflow-hidden rounded-md border border-border/12 shadow-soft sm:block">
        <table className="w-full text-sm" role="table">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface-elevated">
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  role="columnheader"
                  aria-sort={sortKey === c.key ? (dir === "asc" ? "ascending" : "descending") : "none"}
                  onClick={() => onSort(c.key)}
                  className={`cursor-pointer select-none px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-soft hover:text-text-primary ${
                    c.numeric ? "text-right" : "text-left"
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/8">
            {sorted.map((r) => (
              <tr key={r.id}>
                {COLUMNS.map((c) => {
                  if (c.key === "totalTokens") {
                    const pct = Math.round(((r.totalTokens || 0) / maxTotal) * 100);
                    return (
                      <td key={c.key} className="relative px-4 py-3 text-right tabular-nums text-text-muted">
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-1 right-2 rounded-sm bg-primary/8"
                          style={{ width: `${pct}%`, maxWidth: "calc(100% - 1rem)" }}
                        />
                        <span className="relative">{c.fmt(r[c.key])}</span>
                      </td>
                    );
                  }
                  return (
                    <td
                      key={c.key}
                      className={`px-4 py-3 ${c.numeric ? "text-right tabular-nums text-text-muted" : "font-semibold text-text-primary"}`}
                    >
                      {c.fmt(r[c.key])}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:hidden">
        {sorted.map((r) => (
          <div key={r.id} className="rounded-md border border-border/12 bg-surface-elevated p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text-primary">{r.label}</span>
              <span className="text-sm tabular-nums text-text-muted">{fmtUsd(r.costUsd)}</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs tabular-nums text-text-soft">
              <span>In {fmtInt(r.promptTokens)}</span>
              <span>Out {fmtInt(r.outputTokens)}</span>
              <span>Total {fmtInt(r.totalTokens)}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
