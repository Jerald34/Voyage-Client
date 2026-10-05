"use client";

import { SortIcon } from "../icons/index.js";
import AgencyStatusPill from "./AgencyStatusPill.jsx";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function AgencyCard({ a, selected, onRowClick }) {
  return (
    <button
      type="button"
      data-testid={`agency-card-${a.id}`}
      onClick={() => onRowClick(a.id)}
      className={`flex w-full flex-col gap-2 rounded-md border bg-surface-elevated p-4 text-left shadow-soft transition-transform active:scale-[0.99] motion-reduce:transition-none ${
        selected ? "border-primary/40 ring-2 ring-primary/20" : "border-border/12"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-text-primary">{a.name}</span>
        <AgencyStatusPill status={a.status} />
      </div>
      <span className="text-sm text-text-muted">{a.ownerUser?.displayName || "—"}</span>
      {a.ownerUser?.email && <span className="text-xs text-text-soft">{a.ownerUser.email}</span>}
      <span className="text-xs tabular-nums text-text-soft">Submitted {formatDate(a.submittedAt)}</span>
    </button>
  );
}

function SortableHeader({ label, field, currentField, direction, onSort }) {
  const active = currentField === field;
  return (
    <th
      className="cursor-pointer select-none px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-text-soft transition-colors hover:text-text-primary"
      onClick={() => onSort(field)}
    >
      {label}
      <SortIcon active={active} direction={active ? direction : "asc"} />
    </th>
  );
}

export default function AgencyTable({ agencies, sorted, sortField, sortDir, onSort, selectedAgencyId, onRowClick }) {
  return (
    <>
      {/* Mobile cards (below sm) */}
      <div className="grid gap-3 sm:hidden">
        {sorted.map((a) => (
          <AgencyCard key={a.id} a={a} selected={selectedAgencyId === a.id} onRowClick={onRowClick} />
        ))}
        <p className="px-1 pt-1 text-xs text-text-soft">Showing {sorted.length} of {agencies.length} agencies</p>
      </div>

      {/* Desktop table (sm and up) */}
      <div className="hidden overflow-hidden rounded-md border border-border/12 bg-surface-elevated shadow-soft sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-surface-elevated">
              <tr>
                <SortableHeader label="Agency Name" field="name" currentField={sortField} direction={sortDir} onSort={onSort} />
                <SortableHeader label="Contact" field="contact" currentField={sortField} direction={sortDir} onSort={onSort} />
                <SortableHeader label="Status" field="status" currentField={sortField} direction={sortDir} onSort={onSort} />
                <SortableHeader label="Submitted" field="submittedAt" currentField={sortField} direction={sortDir} onSort={onSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/8">
              {sorted.map((a) => (
                <tr
                  key={a.id}
                  className={`cursor-pointer border-l-2 transition-colors hover:bg-primary/5 ${
                    selectedAgencyId === a.id ? "border-primary bg-primary/8" : "border-transparent"
                  }`}
                  onClick={() => onRowClick(a.id)}
                >
                  <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-text-primary">{a.name}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-text-muted">
                    <div className="flex flex-col">
                      <span className="text-sm text-text-primary">{a.ownerUser?.displayName || "—"}</span>
                      {a.ownerUser?.email && <span className="text-xs text-text-soft">{a.ownerUser.email}</span>}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5"><AgencyStatusPill status={a.status} /></td>
                  <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-text-muted">{formatDate(a.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border/10 bg-surface-elevated px-3 py-2.5 text-xs text-text-soft">
          Showing {sorted.length} of {agencies.length} agencies
        </div>
      </div>
    </>
  );
}
