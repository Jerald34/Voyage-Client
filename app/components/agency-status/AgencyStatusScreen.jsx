"use client";

import { useRef, useState } from "react";
import ThemeToggle from "../theme/ThemeToggle";
import ReportProblemModal from "../settings/ReportProblemModal.jsx";
import { createProblemReport } from "../../lib/api/support.js";

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 text-sm">
      <span className="text-text-soft">{label}</span>
      <span className="text-text-primary font-medium">{value}</span>
    </div>
  );
}

export default function AgencyStatusScreen({ agency, user, onLogout }) {
  const status = agency.status || "PENDING_REVIEW";

  const isPending = status === "PENDING_REVIEW";
  const isRejected = status === "REJECTED";
  const isSuspended = status === "SUSPENDED";

  const reason = isRejected
    ? agency.rejectionReason
    : isSuspended
    ? agency.suspensionReason
    : null;

  const [supportOpen, setSupportOpen] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const supportButtonRef = useRef(null);
  // The server caps a report subject at 150 chars; the longest prefix is 20, so 125 leaves room.
  const agencyLabel = (agency.name || "my agency").slice(0, 125);
  const supportSubject = isSuspended ? `Suspended agency: ${agencyLabel}` : `Agency application: ${agencyLabel}`;

  const closeSupport = () => {
    setSupportOpen(false);
    supportButtonRef.current?.focus();
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-8">
      {/* ThemeToggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Status Card */}
      <div className="bg-surface rounded-lg shadow-strong max-w-md w-full p-10 text-center">

        {/* Status Icon */}
        <div
          className={[
            "w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center",
            isPending
              ? "bg-accent/10"
              : isRejected
              ? "bg-status-danger/10"
              : "bg-status-warning/10",
          ].join(" ")}
        >
          {isPending && (
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              className="text-accent"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: "spin 8s linear infinite" }}
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          )}

          {isRejected && (
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              className="text-status-danger"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <line x1="9" y1="9" x2="15" y2="15" />
              <line x1="15" y1="9" x2="9" y2="15" />
            </svg>
          )}

          {isSuspended && (
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              className="text-status-warning"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )}
        </div>

        {/* Headline */}
        <h1 className="font-serif text-2xl text-text-primary mb-2">
          {isPending && "Application Under Review"}
          {isRejected && "Application Not Approved"}
          {isSuspended && "Account Suspended"}
        </h1>

        {/* Description */}
        <p className="text-text-muted text-base leading-relaxed mb-6">
          {isPending && (
            <>
              We&apos;re reviewing your agency registration, usually within 1–2 business days. We&apos;ll email{" "}
              {user?.email ? <strong className="text-text-primary">{user.email}</strong> : "you"} when it&apos;s done, and
              this page updates by itself.
            </>
          )}
          {isRejected &&
            "Your agency registration wasn't approved. Check the reason below, then contact support if you'd like us to take another look."}
          {isSuspended &&
            "Your agency account has been suspended by an administrator. Contact support for help or to appeal this decision."}
        </p>

        {/* Rejection / Suspension Reason */}
        {reason && (
          <div className="bg-status-danger/5 border border-status-danger/15 rounded-sm p-4 text-left mb-6">
            <p className="text-text-primary text-sm">
              <strong>Reason:</strong> {reason}
            </p>
          </div>
        )}

        {/* Details Section */}
        {(agency.name || user?.email) && (
          <div className="border-t border-border/12 pt-5 mt-2 mb-6 text-left">
            <DetailRow label="Agency" value={agency.name} />
            {user && <DetailRow label="Account" value={user.email} />}
          </div>
        )}

        {/* Progress Bar (pending only) */}
        {isPending && (
          <div className="h-2 rounded-pill bg-border/10 overflow-hidden mb-6">
            <div
              className="h-full rounded-pill bg-gradient-to-r from-secondary to-accent"
              style={{
                width: "60%",
                animation: "progress-pulse 2.5s ease-in-out infinite",
              }}
            />
          </div>
        )}

        {/* Action CTA */}
        <button
          ref={supportButtonRef}
          type="button"
          className="w-full py-3 rounded-pill font-bold text-sm bg-secondary text-white hover:opacity-90 transition-opacity mb-3"
          onClick={() => {
            setReportSent(false);
            setSupportOpen(true);
          }}
        >
          Contact support
        </button>
        {/* Always rendered so screen readers register it as a live region; no height or margin while empty */}
        <p role="status" aria-live="polite" className={reportSent ? "text-sm text-text-muted mb-3" : undefined}>
          {reportSent ? "Report sent. We'll reply by email." : ""}
        </p>

        {/* Logout */}
        <button
          type="button"
          className="text-text-muted hover:text-text-primary text-sm underline transition-colors"
          onClick={onLogout}
        >
          Sign out
        </button>

        {/* Mounted only while open so each report starts fresh with the right subject */}
        {supportOpen && (
          <ReportProblemModal
            open
            onClose={closeSupport}
            onSubmit={async (payload) => {
              await createProblemReport(payload);
              setReportSent(true);
            }}
            initialCategory="OTHER"
            initialSubject={supportSubject}
          />
        )}
      </div>

      {/* Keyframe styles injected inline for spin override and progress pulse */}
      <style>{`
        @keyframes progress-pulse {
          0%, 100% { width: 50%; opacity: 0.8; }
          50% { width: 70%; opacity: 1; }
        }
      `}</style>
    </main>
  );
}
