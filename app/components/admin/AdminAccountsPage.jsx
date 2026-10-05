"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAllAccounts } from "../../lib/api/index.js";
import { Spinner, EmptyState, Button } from "../ui/index.js";
import { SearchIcon, UserIcon } from "../icons/index.js";
import AccountTable from "./AccountTable.jsx";
import AccountDetail from "./AccountDetail.jsx";
import MasterDetailLayout from "./MasterDetailLayout.jsx";
import SegmentedControl from "./SegmentedControl.jsx";
import { ACCOUNT_TYPE_LABELS } from "./accountLabels.js";

const TYPE_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "PERSONAL", label: ACCOUNT_TYPE_LABELS.PERSONAL },
  { value: "AGENCY_USER", label: ACCOUNT_TYPE_LABELS.AGENCY_USER },
  { value: "PENDING", label: ACCOUNT_TYPE_LABELS.PENDING },
];

// "Personal 3": the count is a tint of whatever colour the label is using, so it stays
// legible on both the idle and the filled (bg-primary / text-on-primary) segment in either theme.
// The literal space keeps the radio's accessible name readable ("Personal 3").
function withCount(label, count) {
  return (
    <>
      {label}{" "}
      <span className="ml-1.5 min-w-[1.25rem] rounded-pill bg-current/10 px-1.5 text-center text-[11px] font-semibold leading-[18px] tabular-nums">
        {count}
      </span>
    </>
  );
}

const displayName = (a) => a.displayName || a.email || "";

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("joined");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  // One load for everyone; the type filter, search and sort all happen here on the client.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAllAccounts();
        if (!cancelled) setAccounts(data?.users || []);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Couldn't load accounts.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const counts = useMemo(() => {
    const c = { ALL: accounts.length, PERSONAL: 0, AGENCY_USER: 0, PENDING: 0 };
    for (const a of accounts) if (a.accountType in c) c[a.accountType] += 1;
    return c;
  }, [accounts]);

  const typeOptions = TYPE_OPTIONS.map((o) => ({
    ...o,
    label: loading || error ? o.label : withCount(o.label, counts[o.value]),
  }));

  // Everything in the chosen type; the table's "Showing X of Y" counts against this, like the agency table does.
  const ofType = typeFilter === "ALL" ? accounts : accounts.filter((a) => a.accountType === typeFilter);

  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? ofType.filter(
        (a) =>
          displayName(a).toLowerCase().includes(q) ||
          (a.email && a.email.toLowerCase().includes(q)) ||
          (a.memberships || []).some((m) => m.agencyName && m.agencyName.toLowerCase().includes(q))
      )
    : ofType;

  const sorted = [...filtered].sort((a, b) => {
    let aVal;
    let bVal;
    if (sortField === "name") {
      aVal = displayName(a).toLowerCase();
      bVal = displayName(b).toLowerCase();
    } else if (sortField === "type") {
      aVal = (ACCOUNT_TYPE_LABELS[a.accountType] || a.accountType || "").toLowerCase();
      bVal = (ACCOUNT_TYPE_LABELS[b.accountType] || b.accountType || "").toLowerCase();
    } else if (sortField === "joined") {
      aVal = a.createdAt || "";
      bVal = b.createdAt || "";
    } else {
      return 0;
    }
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const selected = accounts.find((a) => a.id === selectedAccountId) || null;

  const list = (
    <>
      {loading && (
        <div className="flex items-center justify-center py-16 text-sm text-text-muted">
          <Spinner size="md" className="mr-3 text-primary" />
          Loading accounts…
        </div>
      )}
      {error && (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-sm bg-status-danger/8 p-4 text-center text-sm text-status-danger">
          <span>{error}</span>
          <Button variant="secondary" size="md" onClick={() => setReloadKey((k) => k + 1)}>
            Try again
          </Button>
        </div>
      )}
      {!loading && !error && sorted.length === 0 && (
        <div className="py-16 text-center text-sm text-text-muted">
          {q ? "No accounts match your search." : "No accounts found."}
        </div>
      )}
      {!loading && !error && sorted.length > 0 && (
        <AccountTable
          accounts={ofType}
          sorted={sorted}
          sortField={sortField}
          sortDir={sortDir}
          onSort={handleSort}
          selectedAccountId={selectedAccountId}
          onRowClick={setSelectedAccountId}
        />
      )}
    </>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Slim toolbar sub-row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
            <SearchIcon width={18} height={18} className="text-text-muted" />
          </div>
          <input
            type="text"
            aria-label="Search accounts"
            placeholder="Search accounts…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-pill border border-border/12 bg-surface-elevated py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-soft focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 sm:w-64"
          />
        </div>
        <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SegmentedControl
            as="radio"
            size="sm"
            ariaLabel="Filter by account type"
            value={typeFilter}
            onChange={setTypeFilter}
            options={typeOptions}
          />
        </div>
      </div>

      <MasterDetailLayout
        list={list}
        detail={selectedAccountId ? <AccountDetail key={selectedAccountId} userId={selectedAccountId} /> : null}
        detailTitle={selected ? displayName(selected) : "Account"}
        ariaLabel="Account details"
        open={!!selectedAccountId}
        onClose={() => setSelectedAccountId(null)}
        emptyState={
          <EmptyState
            icon={<UserIcon width={28} height={28} />}
            title="Select an account"
            description="Pick an account from the list to see its details."
          />
        }
      />
    </div>
  );
}
