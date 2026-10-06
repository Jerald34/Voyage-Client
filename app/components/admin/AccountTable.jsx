"use client";

import { SortIcon } from "../icons/index.js";
import { AccountTypePill, AccountStatusPill, SuperAdminChip } from "./AccountPills.jsx";
import { MEMBERSHIP_ROLE_LABELS, displayName, formatDate } from "./accountLabels.js";

const roleLabel = (r) => MEMBERSHIP_ROLE_LABELS[r] || r;

// Keyboard focus ring shared by the in-table buttons (matches the app's secondary ring).
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary";

function AccountCard({ a, selected, onRowClick }) {
  const first = a.memberships?.[0];
  const more = (a.memberships?.length || 0) - 1;
  return (
    <button
      type="button"
      data-testid={`account-card-${a.id}`}
      aria-current={selected ? "true" : undefined}
      onClick={() => onRowClick(a.id)}
      className={`flex w-full touch-manipulation flex-col gap-2 rounded-md border bg-surface-elevated p-4 text-left shadow-soft transition-transform active:scale-[0.99] motion-reduce:transition-none ${FOCUS_RING} ${
        selected ? "border-primary/40 ring-2 ring-primary/20" : "border-border/12"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 break-words font-semibold text-text-primary">{displayName(a)}</span>
        {/* Status is shown by exception: an active account says nothing. */}
        {a.status === "DISABLED" && (
          <span className="flex-none">
            <AccountStatusPill status={a.status} />
          </span>
        )}
      </div>
      {a.displayName && <span className="break-all text-sm text-text-muted">{a.email}</span>}
      <div className="flex flex-wrap items-center gap-1.5">
        <AccountTypePill type={a.accountType} />
        {a.role === "SUPER_ADMIN" && <SuperAdminChip />}
      </div>
      <span className="text-sm text-text-primary">
        {first ? (
          <>
            <span>{first.agencyName}</span>
            <span className="text-text-muted"> · {roleLabel(first.role)}</span>
            {more > 0 && <span className="text-text-muted"> · </span>}
            {more > 0 && <span className="text-text-muted">{`+${more} more`}</span>}
          </>
        ) : (
          <span className="text-text-muted">No agency</span>
        )}
      </span>
      <span className="text-xs tabular-nums text-text-muted">Joined {formatDate(a.createdAt)}</span>
      {!a.emailVerified && <span className="text-xs text-text-muted">Email not verified</span>}
    </button>
  );
}

function SortableHeader({ label, field, currentField, direction, onSort, className = "" }) {
  const active = currentField === field;
  return (
    <th
      scope="col"
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined}
      className={`px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-text-muted ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`-mx-1.5 inline-flex cursor-pointer select-none items-center rounded-sm px-1.5 py-0.5 uppercase tracking-wider transition-colors hover:text-text-primary ${FOCUS_RING} ${
          active ? "text-text-primary" : ""
        }`}
      >
        {label}
        <SortIcon active={active} direction={active ? direction : "asc"} />
      </button>
    </th>
  );
}

function PlainHeader({ label, className = "" }) {
  return (
    <th scope="col" className={`px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-text-muted ${className}`}>
      {label}
    </th>
  );
}

function AgencyCell({ memberships }) {
  if (!memberships?.length) return <span className="text-text-muted">—</span>;
  const [first, ...rest] = memberships;
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate text-sm text-text-primary" title={first.agencyName}>
        {first.agencyName}
      </span>
      <span className="truncate text-xs text-text-muted">
        <span>{roleLabel(first.role)}</span>
        {rest.length > 0 && <span> · </span>}
        {rest.length > 0 && <span>{`+${rest.length} more`}</span>}
      </span>
    </div>
  );
}

export default function AccountTable({ accounts, sorted, sortField, sortDir, onSort, selectedAccountId, onRowClick }) {
  return (
    // The detail pane takes a fixed 440px from the list, so the table / card switch follows the
    // list pane's own width (a container query), not the viewport. Four columns (Name, Type,
    // Agency, Joined) fit from 34rem (544px), which leaves room for a Windows scrollbar on a
    // 1280px laptop, where the list is about 635-652px. Below that: cards, which cannot sort.
    <div className="@container">
      {/* Cards (narrow list, and every phone) */}
      <div className="grid gap-3 @lg:grid-cols-2 @[34rem]:hidden">
        {sorted.map((a) => (
          <AccountCard key={a.id} a={a} selected={selectedAccountId === a.id} onRowClick={onRowClick} />
        ))}
        <p className="px-1 pt-1 text-xs text-text-muted @lg:col-span-2">Showing {sorted.length} of {accounts.length} accounts</p>
      </div>

      {/* Table (list pane at least 34rem wide) */}
      <div className="hidden overflow-hidden rounded-md border border-border/12 bg-surface-elevated shadow-soft @[34rem]:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-surface-elevated">
              <tr>
                <SortableHeader label="Name" field="name" currentField={sortField} direction={sortDir} onSort={onSort} className="w-[55%] min-w-[7rem]" />
                <SortableHeader label="Type" field="type" currentField={sortField} direction={sortDir} onSort={onSort} className="w-px whitespace-nowrap" />
                <PlainHeader label="Agency" className="w-[45%] min-w-[7rem]" />
                <SortableHeader label="Joined" field="joined" currentField={sortField} direction={sortDir} onSort={onSort} className="w-px whitespace-nowrap" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/8">
              {sorted.map((a) => {
                const selected = selectedAccountId === a.id;
                return (
                  <tr
                    key={a.id}
                    data-testid={`account-row-${a.id}`}
                    className={`cursor-pointer border-l-2 transition-colors hover:bg-primary/5 ${
                      selected ? "border-primary bg-primary/8" : "border-transparent"
                    }`}
                    onClick={() => onRowClick(a.id)}
                  >
                    <td className="max-w-0 min-w-[7rem] px-3 py-2.5">
                      <div className="flex min-w-0 flex-col items-start">
                        {/* A real button gives keyboard and screen-reader users the row action; mouse users click anywhere on the row. */}
                        <button
                          type="button"
                          aria-current={selected ? "true" : undefined}
                          title={displayName(a)}
                          className={`max-w-full truncate rounded-sm text-left font-semibold text-text-primary ${FOCUS_RING}`}
                        >
                          {displayName(a)}
                        </button>
                        {a.displayName && (
                          <span className="max-w-full truncate text-xs text-text-muted" title={a.email}>
                            {a.email}
                          </span>
                        )}
                        {!a.emailVerified && <span className="max-w-full truncate text-xs text-text-muted">Email not verified</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col items-start gap-1">
                        <AccountTypePill type={a.accountType} />
                        {a.role === "SUPER_ADMIN" && <SuperAdminChip />}
                        {/* Status is shown by exception: an active account says nothing. */}
                        {a.status === "DISABLED" && <AccountStatusPill status={a.status} />}
                      </div>
                    </td>
                    <td className="max-w-0 min-w-[7rem] px-3 py-2.5">
                      <AgencyCell memberships={a.memberships} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-text-muted">{formatDate(a.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border/10 bg-surface-elevated px-3 py-2.5 text-xs text-text-muted">
          Showing {sorted.length} of {accounts.length} accounts
        </div>
      </div>
    </div>
  );
}
