"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchAgencyDetail,
  adminApproveAgency,
  adminRejectAgency,
  adminSuspendAgency,
  adminUnsuspendAgency,
} from "../../lib/api/index.js";

const statusLabel = (s) =>
  ({ PENDING_REVIEW: "Pending", VERIFIED: "Approved", REJECTED: "Rejected", SUSPENDED: "Suspended" }[s] || s);

const statusPillClasses = (s) =>
  ({
    PENDING_REVIEW: "bg-accent/10 text-accent",
    VERIFIED: "bg-status-success/10 text-status-success",
    REJECTED: "bg-status-danger/10 text-status-danger",
    SUSPENDED: "bg-status-warning/10 text-status-warning",
  }[s] || "bg-surface text-text-muted");

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function DetailField({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-text-soft">{label}</span>
      <span className="text-sm text-text-primary">{value}</span>
    </div>
  );
}

export default function AgencyDetail({ agencyId, onAction }) {
  const [agency, setAgency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reasonInput, setReasonInput] = useState("");
  const [showReasonFor, setShowReasonFor] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAgencyDetail(agencyId);
      setAgency(data.agency);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    load();
  }, [load]);

  const doAction = async (fn) => {
    setActionLoading(true);
    setError(null);
    try {
      await fn();
      await load();
      onAction?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
      setShowReasonFor(null);
      setReasonInput("");
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-sm text-text-muted">Loading agency details…</div>;
  }
  if (error && !agency) {
    return <div className="rounded-sm bg-status-danger/8 p-4 text-sm text-status-danger">{error}</div>;
  }
  if (!agency) return null;

  const auditEvents = agency.auditEvents || [];

  return (
    <>
      <div className="mb-6">
        <span className={`inline-block rounded-pill px-3 py-1 text-xs font-semibold tracking-wide ${statusPillClasses(agency.status)}`}>
          {statusLabel(agency.status)}
        </span>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <DetailField label="Owner" value={agency.ownerUser?.displayName || "—"} />
        <DetailField label="Email" value={agency.ownerUser?.email || "—"} />
        <DetailField label="Phone" value={agency.businessPhone || "—"} />
        <DetailField label="Business Email" value={agency.businessEmail || "—"} />
        <DetailField label="Location" value={[agency.city, agency.country].filter(Boolean).join(", ") || "—"} />
        <DetailField label="Registration Date" value={formatDate(agency.submittedAt)} />
      </div>

      {agency.documents && agency.documents.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-soft">Submitted Documents</h3>
          <div className="space-y-2">
            {agency.documents.map((doc, i) => (
              <div key={i} className="flex items-center gap-3 rounded-sm border border-border/10 bg-surface p-3 text-sm text-text-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-text-soft" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="truncate">{doc.name || doc.fileName || `Document ${i + 1}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {agency.rejectionReason && (
        <div className="mb-4 rounded-sm border border-status-danger/15 bg-status-danger/6 p-4 text-sm leading-relaxed text-text-primary">
          <strong className="text-status-danger">Rejection reason:</strong> {agency.rejectionReason}
        </div>
      )}
      {agency.suspensionReason && (
        <div className="mb-4 rounded-sm border border-status-warning/15 bg-status-warning/6 p-4 text-sm leading-relaxed text-text-primary">
          <strong className="text-status-warning">Suspension reason:</strong> {agency.suspensionReason}
        </div>
      )}

      {error && <div className="mb-4 rounded-sm bg-status-danger/8 p-4 text-sm text-status-danger">{error}</div>}

      {auditEvents.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-soft">Audit Trail</h3>
          <div className="divide-y divide-border/10">
            {auditEvents.map((event) => (
              <div key={event.id} className="py-3">
                <span className="block text-sm font-semibold capitalize text-text-primary">{event.action.replace(/_/g, " ")}</span>
                <span className="mt-0.5 block text-xs text-text-soft">
                  by {event.adminUser?.displayName || "Admin"} on {formatDate(event.createdAt)}
                </span>
                {event.reason && <span className="mt-1 block text-sm italic text-text-muted">{event.reason}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {showReasonFor && (
        <div className="mb-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-soft">
            {showReasonFor === "reject" ? "Rejection Reason" : "Suspension Reason"}
          </label>
          <textarea
            className="w-full resize-vertical rounded-sm border border-border/20 bg-background p-3 font-sans text-sm text-text-primary placeholder:text-text-soft focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20"
            placeholder={showReasonFor === "reject" ? "Enter reason for rejection…" : "Enter reason for suspension…"}
            value={reasonInput}
            onChange={(e) => setReasonInput(e.target.value)}
            rows={3}
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              className="rounded-sm border border-border/20 bg-surface px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface/80"
              onClick={() => {
                setShowReasonFor(null);
                setReasonInput("");
              }}
            >
              Cancel
            </button>
            <button
              className="rounded-sm bg-status-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-status-danger/90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={actionLoading || !reasonInput.trim()}
              onClick={() =>
                doAction(() =>
                  showReasonFor === "reject"
                    ? adminRejectAgency(agency.id, reasonInput.trim())
                    : adminSuspendAgency(agency.id, reasonInput.trim())
                )
              }
            >
              {actionLoading ? "Processing…" : showReasonFor === "reject" ? "Confirm Reject" : "Confirm Suspend"}
            </button>
          </div>
        </div>
      )}

      <div className="sticky bottom-0 -mx-5 mt-4 flex flex-wrap gap-3 border-t border-border/10 bg-surface-elevated px-5 pb-2 pt-4">
        {agency.status === "PENDING_REVIEW" && (
          <>
            <button
              className="min-w-[120px] flex-1 rounded-sm bg-status-success px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-status-success/90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={actionLoading}
              onClick={() => doAction(() => adminApproveAgency(agency.id))}
            >
              {actionLoading && !showReasonFor ? "Approving…" : "Approve"}
            </button>
            {!showReasonFor && (
              <button
                className="min-w-[120px] flex-1 rounded-sm bg-status-danger px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-status-danger/90"
                onClick={() => setShowReasonFor("reject")}
              >
                Reject
              </button>
            )}
          </>
        )}
        {agency.status === "VERIFIED" && !showReasonFor && (
          <button
            className="rounded-sm bg-status-warning px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-status-warning/90"
            onClick={() => setShowReasonFor("suspend")}
          >
            Suspend
          </button>
        )}
        {agency.status === "SUSPENDED" && (
          <button
            className="rounded-sm bg-status-success px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-status-success/90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={actionLoading}
            onClick={() => doAction(() => adminUnsuspendAgency(agency.id))}
          >
            {actionLoading ? "Processing…" : "Unsuspend"}
          </button>
        )}
        {agency.status === "REJECTED" && (
          <button
            className="rounded-sm bg-status-success px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-status-success/90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={actionLoading}
            onClick={() => doAction(() => adminApproveAgency(agency.id))}
          >
            {actionLoading ? "Approving…" : "Approve"}
          </button>
        )}
      </div>
    </>
  );
}
