"use client";

/**
 * ProposalRating — 1–5 star rating widget for the public ItineraryShare view.
 *
 * Props:
 *   token          {string}      Share token; used to POST /shared/:token/rate
 *   initialRating  {number|null} Pre-existing rating (1–5) or null
 *   initialComment {string|null} Pre-existing comment or null
 *   initialRatedAt {string|null} ISO timestamp of first rating, or null
 */

import { useState, useRef } from "react";
import { API_URL } from "../../../../lib/api/client.js";

/* ── constants ─────────────────────────────────────────────────── */

const LOCK_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 h

/** Map server error codes to user-facing messages. */
function mapError(err) {
  if (err.code === "RATING_PERIOD_CLOSED" || err.status === 409) {
    return { message: "Rating period closed — thanks anyway!", lock: true };
  }
  if (err.code === "RATE_LIMITED" || err.status === 429) {
    return { message: "Hang on a moment — too many tries.", lock: false };
  }
  if (
    err.code === "SHARE_REVOKED" ||
    err.code === "SHARE_EXPIRED" ||
    err.status === 410
  ) {
    return { message: "This share link is no longer active.", lock: true };
  }
  return { message: "Something went wrong. Please try again.", lock: false };
}

/** True when ratedAt is older than the 24-h edit window. */
function isWindowClosed(ratedAt) {
  if (!ratedAt) return false;
  return Date.now() - new Date(ratedAt).getTime() > LOCK_WINDOW_MS;
}

/* ── star sub-component ─────────────────────────────────────────── */

function StarButton({ index, filled, hovered, onHover, onLeave, onSelect, disabled }) {
  const n = index + 1;
  return (
    <button
      type="button"
      aria-label={`${n} star${n === 1 ? "" : "s"}`}
      aria-pressed={filled}
      disabled={disabled}
      className="text-[28px] leading-none bg-transparent border-none p-0 cursor-pointer transition-transform duration-75 hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-secondary rounded-sm"
      style={{
        color:
          filled || hovered
            ? "var(--rating-star)"
            : "var(--text-muted, #9ca3af)",
      }}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={onLeave}
      onFocus={() => onHover(index)}
      onBlur={onLeave}
      onClick={() => onSelect(n)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          if (index > 0) {
            const prev = e.currentTarget
              .closest("fieldset")
              ?.querySelectorAll("button[aria-label]")[index - 1];
            prev?.focus();
          }
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          const next = e.currentTarget
            .closest("fieldset")
            ?.querySelectorAll("button[aria-label]")[index + 1];
          next?.focus();
        }
      }}
    >
      ★
    </button>
  );
}

/* ── static star display (rated / locked state) ─────────────────── */

function StarDisplay({ rating }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className="text-[22px] leading-none"
          style={{
            color:
              n <= rating
                ? "var(--rating-star)"
                : "var(--text-muted, #9ca3af)",
          }}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </div>
  );
}

/* ── main component ─────────────────────────────────────────────── */

export default function ProposalRating({
  token,
  initialRating = null,
  initialComment = null,
  initialRatedAt = null,
}) {
  /* persisted state */
  const [savedRating, setSavedRating] = useState(initialRating);
  const [savedComment, setSavedComment] = useState(initialComment);
  const [savedRatedAt, setSavedRatedAt] = useState(initialRatedAt);

  /* form / interaction state */
  const [editing, setEditing] = useState(savedRating === null); // start in edit mode if never rated
  const [hoverIndex, setHoverIndex] = useState(-1);
  const [selectedRating, setSelectedRating] = useState(savedRating ?? 0);
  const [commentText, setCommentText] = useState(savedComment ?? "");
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [errorInfo, setErrorInfo] = useState(null); // { message, lock }

  const liveRef = useRef(null);

  /* ── derived flags ── */
  const locked =
    (savedRating !== null && !editing) ||
    (errorInfo?.lock === true) ||
    (savedRating !== null && isWindowClosed(savedRatedAt));

  const windowClosed = savedRating !== null && isWindowClosed(savedRatedAt);

  /* ── announce helper ── */
  function announce(msg) {
    if (liveRef.current) liveRef.current.textContent = msg;
  }

  /* ── submit ── */
  async function handleSubmit(e) {
    e.preventDefault();
    if (selectedRating === 0 || status === "submitting") return;

    setStatus("submitting");
    setErrorInfo(null);

    try {
      const res = await fetch(`${API_URL}/shared/${token}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: selectedRating,
          ...(commentText.trim() ? { comment: commentText.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const err = new Error(data.error?.message || "Request failed");
        err.code = data.error?.code || "UNKNOWN_ERROR";
        err.status = res.status;
        throw err;
      }

      setSavedRating(data.rating);
      setSavedComment(data.comment ?? null);
      setSavedRatedAt(data.ratedAt ?? new Date().toISOString());
      setEditing(false);
      setStatus("success");
      announce(`Rating saved: ${data.rating} star${data.rating === 1 ? "" : "s"}.`);
    } catch (err) {
      const info = mapError(err);
      setErrorInfo(info);
      setStatus("error");
      if (info.lock) setEditing(false);
      announce(info.message);
    }
  }

  /* ── update button handler ── */
  function handleUpdate() {
    setSelectedRating(savedRating ?? 0);
    setCommentText(savedComment ?? "");
    setEditing(true);
    setStatus("idle");
    setErrorInfo(null);
  }

  /* ── render ── */
  return (
    <div className="bg-surface border border-border/10 rounded-xl p-5 grid gap-4">
      {/* live region for screen readers */}
      <span
        ref={liveRef}
        role="status"
        aria-live="polite"
        className="sr-only"
      />

      {/* header */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-serif text-[17px] font-normal m-0 text-primary">
          Rate this proposal
        </h3>
        {savedRating !== null && !editing && !errorInfo?.lock && !windowClosed && (
          <button
            type="button"
            className="px-3 py-1 text-[12px] font-medium border border-border rounded-sm bg-transparent text-text-soft cursor-pointer transition-colors duration-150 hover:bg-primary/[0.06] hover:text-primary"
            onClick={handleUpdate}
          >
            Update
          </button>
        )}
      </div>

      {/* locked / final rated state */}
      {!editing && savedRating !== null && (
        <div className="grid gap-2">
          <StarDisplay rating={savedRating} />
          {savedComment && (
            <p className="m-0 text-[13px] leading-[1.55] text-text-muted italic">
              &ldquo;{savedComment}&rdquo;
            </p>
          )}
          {windowClosed && (
            <p className="m-0 text-[12px] text-text-soft">
              Thanks for your feedback.
            </p>
          )}
        </div>
      )}

      {/* error message (locked or informational) */}
      {errorInfo && (
        <p className="m-0 text-[13px] font-medium text-red-500">
          {errorInfo.message}
        </p>
      )}

      {/* editing / unrated form */}
      {editing && (
        <form onSubmit={handleSubmit} className="grid gap-4">
          <fieldset className="border-none p-0 m-0 grid gap-3">
            <legend className="sr-only">Rate this proposal</legend>

            {/* star row */}
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <StarButton
                  key={i}
                  index={i}
                  filled={i < selectedRating}
                  hovered={hoverIndex >= 0 && i <= hoverIndex}
                  onHover={setHoverIndex}
                  onLeave={() => setHoverIndex(-1)}
                  onSelect={(n) => {
                    setSelectedRating(n);
                    announce(`${n} star${n === 1 ? "" : "s"} selected.`);
                  }}
                  disabled={status === "submitting"}
                />
              ))}
              {selectedRating > 0 && (
                <span className="ml-2 text-[12px] text-text-soft font-medium">
                  {selectedRating} / 5
                </span>
              )}
            </div>

            {/* comment textarea */}
            <textarea
              className="w-full box-border px-3 py-[9px] border border-border/40 rounded-sm bg-background text-[13px] leading-[1.55] text-text-primary resize-y outline-none font-[inherit] transition-all duration-150 min-h-[64px] focus:border-secondary focus:shadow-[0_0_0_3px_rgba(215,122,97,0.1)] disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Anything to add? (optional)"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={1000}
              rows={3}
              disabled={status === "submitting"}
              aria-label="Optional comment"
            />
          </fieldset>

          {/* inline submit error */}
          {status === "error" && errorInfo && !errorInfo.lock && (
            <p className="m-0 -mt-2 text-[12px] text-red-500 font-medium">
              {errorInfo.message}
            </p>
          )}

          {/* actions */}
          <div className="flex items-center gap-2 justify-end">
            {savedRating !== null && (
              <button
                type="button"
                className="px-[14px] py-[6px] border border-border rounded-sm bg-transparent text-text-soft text-[12px] font-medium cursor-pointer transition-colors duration-150 hover:bg-primary/[0.06] disabled:opacity-50"
                onClick={() => setEditing(false)}
                disabled={status === "submitting"}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-[6px] bg-secondary text-white border-none rounded-sm text-[12px] font-semibold cursor-pointer transition-all duration-150 hover:enabled:bg-[#c46a51] active:enabled:scale-97 disabled:opacity-45 disabled:cursor-not-allowed"
              disabled={selectedRating === 0 || status === "submitting"}
            >
              {status === "submitting" ? "Saving…" : "Submit rating"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
