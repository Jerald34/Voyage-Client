"use client";

/**
 * Confirmation shown at the top of the dashboard right after a member accepts
 * an agency invitation (the `tab=team&invited=1` landing).
 */
export default function JoinedNotice({ className = "" }) {
  return (
    <div
      role="status"
      className={`rounded-lg border border-status-success/25 bg-status-success/10 px-4 py-3 text-sm text-status-success ${className}`}
    >
      You joined this agency. Your workspace access is ready.
    </div>
  );
}
