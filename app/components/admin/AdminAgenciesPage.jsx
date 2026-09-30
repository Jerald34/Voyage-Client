"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAllAgencies } from "../../lib/api/index.js";
import { Spinner, EmptyState } from "../ui/index.js";
import { SearchIcon, BuildingIcon } from "../icons/index.js";
import AgencyTable from "./AgencyTable.jsx";
import AgencyDetail from "./AgencyDetail.jsx";
import MasterDetailLayout from "./MasterDetailLayout.jsx";
import SegmentedControl from "./SegmentedControl.jsx";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "PENDING_REVIEW", label: "Pending" },
  { value: "VERIFIED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SUSPENDED", label: "Suspended" },
];

export default function AdminAgenciesPage({ onPendingCountChange }) {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("submittedAt");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedAgencyId, setSelectedAgencyId] = useState(null);

  const loadAgencies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filter = statusFilter === "ALL" ? undefined : statusFilter;
      const data = await fetchAllAgencies(filter);
      setAgencies(data.agencies || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadAgencies();
  }, [loadAgencies]);

  const filtered = agencies.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.ownerUser?.email && a.ownerUser.email.toLowerCase().includes(q)) ||
      (a.ownerUser?.displayName && a.ownerUser.displayName.toLowerCase().includes(q)) ||
      (a.businessEmail && a.businessEmail.toLowerCase().includes(q))
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let aVal, bVal;
    if (sortField === "name") {
      aVal = (a.name || "").toLowerCase();
      bVal = (b.name || "").toLowerCase();
    } else if (sortField === "contact") {
      aVal = (a.ownerUser?.displayName || a.ownerUser?.email || "").toLowerCase();
      bVal = (b.ownerUser?.displayName || b.ownerUser?.email || "").toLowerCase();
    } else if (sortField === "status") {
      aVal = (a.status || "").toLowerCase();
      bVal = (b.status || "").toLowerCase();
    } else if (sortField === "submittedAt") {
      aVal = a.submittedAt || "";
      bVal = b.submittedAt || "";
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

  const handleAction = () => {
    loadAgencies();
    onPendingCountChange?.();
  };

  const selected = agencies.find((a) => a.id === selectedAgencyId) || null;

  const list = (
    <>
      {loading && (
        <div className="flex items-center justify-center py-16 text-sm text-text-muted">
          <Spinner size="md" className="mr-3 text-primary" />
          Loading agencies…
        </div>
      )}
      {error && <div className="rounded-sm bg-status-danger/8 p-4 text-center text-sm text-status-danger">{error}</div>}
      {!loading && !error && sorted.length === 0 && (
        <div className="py-16 text-center text-sm text-text-muted">
          {searchQuery.trim() ? "No agencies match your search." : "No agencies found."}
        </div>
      )}
      {!loading && !error && sorted.length > 0 && (
        <AgencyTable
          agencies={agencies}
          sorted={sorted}
          sortField={sortField}
          sortDir={sortDir}
          onSort={handleSort}
          selectedAgencyId={selectedAgencyId}
          onRowClick={setSelectedAgencyId}
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
            placeholder="Search agencies…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-pill border border-border/12 bg-surface-elevated py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-soft focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 sm:w-64"
          />
        </div>
        <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SegmentedControl
            as="radio"
            size="sm"
            ariaLabel="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
          />
        </div>
      </div>

      <MasterDetailLayout
        list={list}
        detail={selectedAgencyId ? <AgencyDetail key={selectedAgencyId} agencyId={selectedAgencyId} onAction={handleAction} /> : null}
        detailTitle={selected?.name || "Agency"}
        ariaLabel="Agency details"
        open={!!selectedAgencyId}
        onClose={() => setSelectedAgencyId(null)}
        emptyState={
          <EmptyState
            icon={<BuildingIcon width={28} height={28} />}
            title="Select an agency to review"
            description="Pick an agency from the list to see its details and take action."
          />
        }
      />
    </div>
  );
}
