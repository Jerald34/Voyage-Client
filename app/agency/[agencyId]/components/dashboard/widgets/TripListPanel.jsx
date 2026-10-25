"use client";

import { useEffect, useId, useRef } from "react";
import TripStatusChip from "./TripStatusChip";

// Same press feedback the rest of the dashboard uses.
const PRESS = "transition-[color,background-color,scale] duration-150 ease-out active:scale-[0.97]";

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * A right-side list of trips behind a dashboard number (a Trip progress
 * stage, a staff counter). Clicking a trip closes this list and calls
 * `onOpenTrip(tripId, tripTitle, clientName)`, which opens the trip panel.
 * `total` is the exact count when the server cut the list short.
 *
 * It mounts only while open: the drawer slides in (where the browser supports
 * `@starting-style`), and closing is instant, so the trip panel that replaces it
 * on a click is never overlapped by a second drawer sliding out.
 */
export default function TripListPanel({ isOpen, title, summary = null, trips = [], total = null, onOpenTrip, onClose }) {
  const headingId = useId();
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  // Callers pass a fresh onClose on every render. Read it when a key is pressed, so
  // the effect below runs once per opening: re-running it would pull focus back to Close.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const active = document.activeElement;
    const opener = active instanceof HTMLElement && active !== document.body ? active : null;
    closeRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab" || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      if (!current || !panel.contains(current)) {
        // Focus is outside the panel (or on the page body): bring it in.
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && current === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (opener?.isConnected) opener.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/40 transition-opacity duration-300 starting:opacity-0" />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="relative flex h-full w-full flex-col border-l border-border/10 bg-surface shadow-xl transition-transform duration-300 [transition-timing-function:var(--ease-drawer)] starting:translate-x-full md:w-[380px]"
      >
        <header className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-border/10 px-6 py-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id={headingId} className="break-words font-sans text-base font-semibold tracking-normal text-text-primary">
              {title}
            </h2>
            {summary ? <p className="m-0 text-xs text-text-muted">{summary}</p> : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/20 bg-surface-elevated text-text-muted hover:bg-surface pointer-coarse:min-h-11 pointer-coarse:min-w-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${PRESS}`}
          >
            {/* Inline SVG: the shared icons module is JSX in a .js file, which the plain test setup cannot parse. */}
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {trips.length === 0 ? (
            <p className="m-0 px-2 text-sm text-text-muted">No trips here right now.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {trips.map((trip) => (
                <li key={trip.tripId}>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenTrip(trip.tripId, trip.tripTitle, trip.clientName);
                    }}
                    className={`frame-tile flex w-full flex-col gap-1 rounded-[12px] px-3 py-2 text-left hover:bg-text-primary/5 pointer-coarse:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${PRESS}`}
                  >
                    <span className="flex min-w-0 items-start justify-between gap-2">
                      <span className="line-clamp-2 min-w-0 break-words text-[13px] font-semibold text-text-primary">{trip.tripTitle}</span>
                      <TripStatusChip status={trip.status} />
                    </span>
                    <span className="truncate text-[12px] text-text-muted">{trip.clientName || "No client name"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {total != null && trips.length > 0 && total > trips.length ? (
            <p className="m-0 px-2 text-xs text-text-muted">{`Showing the latest ${trips.length} of ${total}.`}</p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
