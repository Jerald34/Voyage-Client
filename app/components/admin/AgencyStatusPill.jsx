"use client";

const statusLabel = (s) =>
  ({ PENDING_REVIEW: "Pending", VERIFIED: "Approved", REJECTED: "Rejected", SUSPENDED: "Suspended" }[s] || s);

const statusPillClasses = (s) =>
  ({
    // Peach tint with primary text: peach-on-peach (text-accent) is ~1.9:1 on white. The terracotta
    // dot keeps Pending clearly apart from Suspended's orange.
    PENDING_REVIEW: "bg-accent/20 text-text-primary",
    VERIFIED: "bg-status-success/10 text-status-success",
    REJECTED: "bg-status-danger/10 text-status-danger",
    SUSPENDED: "bg-status-warning/10 text-status-warning",
  }[s] || "bg-surface text-text-muted");

const statusDot = (s) =>
  ({
    PENDING_REVIEW: "bg-secondary",
    VERIFIED: "bg-status-success",
    REJECTED: "bg-status-danger",
    SUSPENDED: "bg-status-warning",
  }[s] || "bg-text-soft");

/** An agency's review status as a dot + label pill. Shared by the agency table and the account detail pane. */
export default function AgencyStatusPill({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-xs font-semibold tracking-wide ${statusPillClasses(status)}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${statusDot(status)}`} aria-hidden="true" />
      {statusLabel(status)}
    </span>
  );
}
