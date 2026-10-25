"use client";

import { useId, useState } from "react";
import { extendShare } from "@/app/lib/api/index.js";
import { describeLinkState, describeLinkViews } from "./tripPanelFormat";

const EXTEND_DAYS = [7, 30];
const TONE_CLASS = {
  danger: "bg-status-danger/15",
  warning: "bg-status-warning/15",
  neutral: "bg-text-primary/5",
};

// Same press feedback the rest of the dashboard uses; a disabled button doesn't move.
const PRESS = "transition-[color,background-color,border-color,opacity,scale] duration-150 ease-out enabled:active:scale-[0.97]";

// The two 409s the server sends when the link can't be extended. Either one means the
// panel's copy of the link is out of date, so the section corrects itself too.
const REFUSED = {
  SHARE_REVOKED: { kind: "revoked", message: "This link was turned off. Share the itinerary again instead." },
  SHARE_NEVER_EXPIRES: { kind: "never", message: "This link never expires." },
};

/**
 * The trip panel's share link: views, rating and expiry, with Extend 7 / 30
 * days for a live link that expires. `onExtended(share)` gets the saved link.
 * `ref` reaches the section, so the panel can scroll to it.
 */
export default function SharedLinkSection({ agencyId, share, onExtended, now, ref }) {
  const headingId = useId();
  const errorId = useId();
  const [pendingDays, setPendingDays] = useState(null);
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState("");
  const [refused, setRefused] = useState(null);
  const clock = now ?? Date.now();

  async function handleExtend(days) {
    if (pendingDays) return;
    setPendingDays(days);
    setError(null);
    setConfirmation("");
    try {
      const result = await extendShare(agencyId, share.id, days);
      if (result?.share) onExtended?.(result.share);
      setConfirmation(`Link extended by ${days} days.`);
    } catch (caught) {
      const known = REFUSED[caught?.code];
      if (known) setRefused({ shareId: share.id, kind: known.kind });
      setError(known?.message ?? "Couldn't extend the link. Try again.");
    } finally {
      setPendingDays(null);
    }
  }

  // What the server refused is now the truth, whatever the panel was last given.
  const refusedKind = refused && share && refused.shareId === share.id ? refused.kind : null;
  const shown =
    refusedKind === "revoked"
      ? { ...share, revokedAt: share.revokedAt ?? new Date(clock).toISOString() }
      : refusedKind === "never"
        ? { ...share, expiresAt: null }
        : share;
  const state = shown ? describeLinkState(shown, clock) : null;
  const busy = pendingDays !== null;

  return (
    <section ref={ref} aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="font-sans text-[13px] font-semibold tracking-normal text-text-primary">
        Shared link
      </h3>

      {!shown ? (
        <p className="m-0 text-[13px] text-text-muted">Not shared with the client yet. Share it from the Itineraries page.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13px] text-text-primary">{describeLinkViews(shown, clock)}</span>
            <span className={`rounded-md px-2 py-0.5 text-[12px] font-semibold text-text-primary ${TONE_CLASS[state.tone]}`}>
              {state.label}
            </span>
          </div>
          {shown.proposalRating != null ? (
            <span className="text-[12px] text-text-muted">Rated {shown.proposalRating} out of 5</span>
          ) : null}
          {state.canExtend ? (
            <div className="flex flex-wrap gap-2">
              {EXTEND_DAYS.map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => handleExtend(days)}
                  // aria-disabled, not disabled: a disabled button drops focus, so a keyboard user
                  // would lose their place the moment they press Extend.
                  aria-disabled={busy || undefined}
                  aria-busy={pendingDays === days || undefined}
                  aria-describedby={error ? errorId : undefined}
                  className={`min-h-9 rounded-lg border border-border bg-surface-elevated px-3 text-[12px] font-semibold text-text-primary hover:border-secondary/50 hover:bg-background pointer-coarse:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary aria-disabled:cursor-wait aria-disabled:opacity-60 aria-disabled:active:scale-100 ${PRESS}`}
                >
                  {pendingDays === days ? "Extending…" : `Extend ${days} days`}
                </button>
              ))}
            </div>
          ) : null}
          {error ? (
            <span id={errorId} role="alert" className="text-[12px] font-semibold text-status-danger">
              {error}
            </span>
          ) : null}
          {/* Always mounted so screen readers are already listening when the text arrives. */}
          <span
            role="status"
            aria-live="polite"
            className={confirmation ? "text-[12px] font-semibold text-status-success" : "sr-only"}
          >
            {confirmation}
          </span>
        </>
      )}
    </section>
  );
}
