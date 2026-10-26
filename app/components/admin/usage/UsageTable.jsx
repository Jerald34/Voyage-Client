"use client";

import { useState } from "react";
import { fmtInt, fmtUsd, roleTagLine } from "./usageFormat.js";

const COLUMNS = [
  { key: "label", label: "Name", numeric: false },
  { key: "runCount", label: "Runs", numeric: true, fmt: fmtInt },
  { key: "failedRunCount", label: "Failed", numeric: true, fmt: fmtInt },
  { key: "totalTokens", label: "Tokens", numeric: true, fmt: fmtInt },
  { key: "costUsd", label: "Cost", numeric: true, fmt: fmtUsd },
];

const TABLE_NAME = { user: "Usage by user", agency: "Usage by agency", chat: "Usage by chat" };

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

function subLine(row, groupBy) {
  if (groupBy === "user") return roleTagLine(row);
  if (groupBy === "chat") return row.agencyName || "";
  return "";
}

function NameCell({ row, groupBy, onSelect, selected }) {
  const sub = subLine(row, groupBy);
  const text = (
    <>
      <span className="block truncate font-semibold text-text-primary">{row.label}</span>
      {sub && <span className="block truncate text-xs text-text-muted">{sub}</span>}
    </>
  );
  if (!row.drillable) return <div className="min-w-0">{text}</div>;
  return (
    <button type="button" aria-current={selected ? "true" : undefined} onClick={() => onSelect(row)} className={`block w-full min-w-0 rounded-sm text-left ${FOCUS_RING}`}>
      {text}
    </button>
  );
}

export default function UsageTable({ rows = [], groupBy, onSelect, selectedId }) {
  const [sortKey, setSortKey] = useState("costUsd");
  const [dir, setDir] = useState("desc");

  if (!rows.length) {
    return (
      <div className="rounded-md border border-border/12 bg-surface-elevated p-8 text-center text-sm text-text-muted">
        No usage to show for this range.
      </div>
    );
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp = typeof av === "string" ? String(av).localeCompare(String(bv)) : (av ?? 0) - (bv ?? 0);
    return dir === "asc" ? cmp : -cmp;
  });

  const onSort = (key) => {
    if (key === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setDir(key === "label" ? "asc" : "desc");
    }
  };

  const maxCost = Math.max(...rows.map((r) => r.costUsd || 0), 0.0001);

  return (
    <>
      <div className="hidden overflow-hidden rounded-md border border-border/12 shadow-soft sm:block">
        <table className="w-full table-fixed text-sm">
          <caption className="sr-only">{TABLE_NAME[groupBy] || "Usage breakdown"}</caption>
          <thead className="sticky top-0 z-10 bg-surface-elevated">
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  aria-sort={sortKey === c.key ? (dir === "asc" ? "ascending" : "descending") : "none"}
                  onClick={() => onSort(c.key)}
                  className={`cursor-pointer select-none px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-soft hover:text-text-primary ${
                    c.numeric ? "w-28 text-right" : "text-left"
                  }`}
                >
                  {/* The header cell keeps the mouse click; the button inside is what the keyboard reaches
                      (Enter/Space click it and the event bubbles up to the cell). */}
                  <button type="button" className={`rounded-sm font-semibold uppercase tracking-wider ${FOCUS_RING}`}>
                    {c.label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/8 bg-surface-elevated">
            {sorted.map((r) => {
              const selected = selectedId === r.id;
              return (
                <tr key={r.id} className={`border-l-2 transition-colors ${selected ? "border-primary bg-primary/8" : "border-transparent"} ${r.drillable ? "hover:bg-primary/5" : ""}`}>
                  <td className="px-4 py-3">
                    <NameCell row={r} groupBy={groupBy} onSelect={onSelect} selected={selected} />
                  </td>
                  {COLUMNS.slice(1).map((c) =>
                    c.key === "costUsd" ? (
                      <td key={c.key} className="relative px-4 py-3 text-right tabular-nums text-text-primary">
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-1 right-2 rounded-sm bg-primary/8"
                          style={{ width: `${Math.round(((r.costUsd || 0) / maxCost) * 100)}%`, maxWidth: "calc(100% - 1rem)" }}
                        />
                        <span className="relative">{c.fmt(r[c.key])}</span>
                      </td>
                    ) : (
                      <td key={c.key} className={`px-4 py-3 text-right tabular-nums ${c.key === "failedRunCount" && r.failedRunCount ? "text-status-danger" : "text-text-muted"}`}>
                        {c.fmt(r[c.key])}
                      </td>
                    )
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:hidden">
        {sorted.map((r) => (
          <div key={r.id} className="rounded-md border border-border/12 bg-surface-elevated p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <NameCell row={r} groupBy={groupBy} onSelect={onSelect} selected={selectedId === r.id} />
              <span className="flex-none text-sm tabular-nums text-text-primary">{fmtUsd(r.costUsd)}</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs tabular-nums text-text-soft">
              <span>{fmtInt(r.runCount)} runs</span>
              <span className={r.failedRunCount ? "text-status-danger" : ""}>{fmtInt(r.failedRunCount)} failed</span>
              <span>{fmtInt(r.totalTokens)} tokens</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
