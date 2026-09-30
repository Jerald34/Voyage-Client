"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchReports } from "../../../lib/api/admin.js";
import { CommentIcon } from "../../icons/index.js";
import { EmptyState } from "../../ui/index.js";
import MasterDetailLayout from "../MasterDetailLayout.jsx";
import SegmentedControl from "../SegmentedControl.jsx";
import ReportDetail from "./ReportDetail.jsx";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "NEW", label: "New" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "WONT_FIX", label: "Won't fix" },
];

const statusPill = (s) =>
  ({
    NEW: "bg-accent/10 text-accent",
    IN_PROGRESS: "bg-status-warning/10 text-status-warning",
    RESOLVED: "bg-status-success/10 text-status-success",
    WONT_FIX: "bg-surface text-text-muted",
  }[s] || "bg-surface text-text-muted");

function formatRelative(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ReportsSection({ onBadgeChange }) {
  const [status, setStatus] = useState("ALL");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReports(status);
      const list = data.reports || [];
      setReports(list);
      onBadgeChange?.(list.filter((r) => r.status === "NEW").length);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [status, onBadgeChange]);

  useEffect(() => {
    load();
  }, [load]);

  const options = useMemo(() => {
    const counts = reports.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});
    return STATUS_OPTIONS.map((o) => ({
      ...o,
      badge: o.value === "ALL" ? 0 : counts[o.value] || 0,
    }));
  }, [reports]);

  const selected = reports.find((r) => r.id === selectedId) || null;

  const list = (
    <>
      {loading && <div className="py-16 text-center text-sm text-text-muted">Loading reports…</div>}
      {error && <div className="rounded-sm bg-status-danger/8 p-4 text-center text-sm text-status-danger">{error}</div>}
      {!loading && !error && reports.length === 0 && (
        <div className="py-16 text-center text-sm text-text-muted">No reports yet.</div>
      )}
      {!loading && !error && reports.length > 0 && (
        <div className="grid gap-3">
          {reports.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedId(r.id)}
              className={`flex w-full flex-col gap-1 rounded-md border bg-surface-elevated p-4 text-left shadow-soft transition-transform active:scale-[0.99] motion-reduce:transition-none ${
                selectedId === r.id ? "border-primary/40 ring-2 ring-primary/20" : "border-border/12"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-text-primary">{r.subject}</span>
                <span className={`rounded-pill px-2.5 py-0.5 text-xs font-semibold ${statusPill(r.status)}`}>
                  {r.status.replace(/_/g, " ")}
                </span>
              </div>
              <span className="text-xs text-text-soft">
                {r.category} · {r.reporterUser?.email || "—"}
                {r.createdAt ? ` · ${formatRelative(r.createdAt)}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <SegmentedControl as="radio" size="sm" ariaLabel="Filter reports by status" value={status} onChange={setStatus} options={options} />
      </div>

      <MasterDetailLayout
        list={list}
        detail={selectedId ? <ReportDetail key={selectedId} reportId={selectedId} onUpdated={load} /> : null}
        detailTitle={selected?.subject || "Report"}
        ariaLabel="Report details"
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        emptyState={
          <EmptyState
            icon={<CommentIcon width={28} height={28} />}
            title="Select a report to review"
            description="Pick a report from the list to read it and update its status."
          />
        }
      />
    </div>
  );
}
