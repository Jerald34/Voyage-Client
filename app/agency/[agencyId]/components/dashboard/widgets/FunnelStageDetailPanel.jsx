"use client";
import { useEffect, useRef, useState } from "react";

const STAGE_LABELS = {
  created: "Trips created",
  drafted: "Itineraries drafted",
  sent: "Shared with client",
  viewed: "Viewed by client",
  approved: "Approved",
};

// TODO(post-v1): fetch trips filtered by stage from
// GET /agencies/:agencyId/dashboard/funnel?stage=<key>

/**
 * Right-side slide-in panel showing detail for a clicked funnel stage.
 * Spec §3.3, §6.4, §6.5, §6.7.
 *
 * Props:
 *   stage   — { key, count, dropOffPct } | null
 *   agencyId — string
 *   onClose — () => void
 */
export default function FunnelStageDetailPanel({ stage, agencyId, onClose }) {
  // Tracks whether the panel DOM node is mounted (controls rendering).
  const [isMounted, setIsMounted] = useState(false);
  // Controls the CSS transform — starts at translateX(100%) then snaps to 0.
  const [isVisible, setIsVisible] = useState(false);
  // Unique id for aria-labelledby.
  const headingId = "funnel-panel-heading";

  const closeButtonRef = useRef(null);
  const panelRef = useRef(null);

  // ── Mount / unmount lifecycle ──────────────────────────────────────────────
  useEffect(() => {
    if (stage) {
      setIsMounted(true);
      // Next tick: flip to visible so the CSS transition fires.
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsVisible(true));
      });
      return () => cancelAnimationFrame(raf);
    } else {
      // Trigger exit animation then unmount after it completes (200ms).
      setIsVisible(false);
      const t = setTimeout(() => setIsMounted(false), 200);
      return () => clearTimeout(t);
    }
  }, [stage]);

  // ── Focus management ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isVisible && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isVisible]);

  // ── Keyboard handling ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isMounted) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        // Simple focus trap: collect all focusable elements inside the panel.
        const focusable = Array.from(
          panelRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.disabled);

        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMounted, onClose]);

  if (!isMounted) return null;

  const label = stage ? STAGE_LABELS[stage.key] ?? stage.key : "";

  return (
    // ── Portal-like fixed layer ────────────────────────────────────────────
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0"
        style={{
          background: "rgba(0,0,0,0.40)",
          opacity: isVisible ? 1 : 0,
          transition: `opacity 200ms ease`,
        }}
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="relative flex w-full flex-col bg-surface shadow-xl md:w-[380px]"
        style={{
          transform: isVisible ? "translateX(0)" : "translateX(100%)",
          transition: isVisible
            ? `transform 280ms var(--ease-drawer)`
            : `transform 200ms var(--ease-out)`,
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between border-b border-border/10 px-6 py-4">
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-[0.7rem] font-extrabold uppercase tracking-[0.05em] mb-1">FUNNEL STAGE</span>
            <h2
              id={headingId}
              className="text-base font-extrabold text-text-primary"
            >
              {label}
            </h2>
            {stage && (
              <p className="text-xs text-text-muted tabular-nums">
                {stage.count} trip{stage.count !== 1 ? "s" : ""}
                {stage.dropOffPct != null
                  ? ` · ${stage.dropOffPct.toFixed(1)}% drop-off from previous`
                  : ""}
              </p>
            )}
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border/20 bg-surface-elevated text-text-muted transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            style={{ transitionTimingFunction: "var(--ease-out)", transitionDuration: "160ms" }}
          >
            {/* ✕ icon — inline SVG to avoid a package dep */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              width="16"
              height="16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </header>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
          {/* Placeholder — server endpoint not yet available */}
          <p className="text-sm text-text-muted">
            Detailed trip list coming soon.
          </p>

          {/* Skeleton rows — visual affordance for loading state */}
          <ul aria-hidden="true" className="flex flex-col gap-3">
            {[1, 2, 3].map((n) => (
              <li
                key={n}
                className="h-[12px] w-full animate-pulse rounded bg-surface-elevated"
              />
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
