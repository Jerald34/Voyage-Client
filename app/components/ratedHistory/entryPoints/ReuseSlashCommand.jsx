"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import RatedHistoryPicker from "../RatedHistoryPicker.jsx";
import { useRatedHistory } from "../hooks/useRatedHistory.js";
import { API_URL } from "../../../lib/api/client";

/**
 * ReuseSlashCommand — Stage 6C
 *
 * Slash-command entry point for the Rated Itinerary Reuse picker (spec §3 / §7.4).
 *
 * Mounted adjacent to the AgentCommandCenter composer textarea. Observes
 * `composerInput` and renders:
 *   1. An autocomplete dropdown above the composer when the input matches
 *      /^\/[a-z]*$/i — i.e. user has typed only `/`, `/r`, `/re`, `/reu`, etc.
 *      The dropdown surfaces a single entry: "reuse — Insert items from a
 *      rated past trip".
 *   2. The RatedHistoryPicker in `mode="slash"` after the user picks `reuse`.
 *      Selection is performed via the existing picker UI; confirmation is via
 *      click on the picker's slash-mode confirm bar (added in this stage to
 *      RatedHistoryPicker), which invokes `onConfirmInsertions(selection)`.
 *
 * On successful insertion a SYSTEM_VISIBLE message is posted into the thread
 * via `onSystemVisibleMessage` (no agent run is triggered).
 *
 * Mid-message slashes (e.g. "Use this plan /reuse") are NOT intercepted; the
 * regex anchor `^\/` ensures only leading-slash composer values activate the
 * dropdown.
 *
 * @param {object} props
 * @param {string} props.composerInput
 * @param {(v: string) => void} props.setComposerInput
 * @param {React.RefObject} [props.textareaRef]
 * @param {string} props.tripId
 * @param {string} props.agencyId
 * @param {string} props.targetItineraryId
 * @param {number} props.currentVersion
 * @param {object} [props.targetItinerary]
 * @param {{ destinationSummary?: string|null }} [props.currentTrip]
 * @param {(message: object) => void} props.onSystemVisibleMessage
 * @param {(itinerary: object, advisory?: object) => void} [props.onInserted]
 */
export default function ReuseSlashCommand({
  composerInput,
  setComposerInput,
  textareaRef,
  tripId,
  agencyId,
  targetItineraryId,
  currentVersion,
  targetItinerary = null,
  currentTrip = null,
  onSystemVisibleMessage,
  onInserted,
}) {
  /* ─────────────────────────────────────────────────────────────
     Autocomplete activation
     The slash is intercepted ONLY when composerInput is exactly `/`
     followed by zero-or-more letters. Mid-message slashes,
     trailing whitespace, newlines, or post-prefix characters all
     bypass the autocomplete and fall through to the regular
     composer-submit behaviour.
  ──────────────────────────────────────────────────────────────── */
  const autocompleteOpen = useMemo(() => {
    if (typeof composerInput !== "string") return false;
    return /^\/[a-z]*$/i.test(composerInput);
  }, [composerInput]);

  // True only when we have a saved/approved trip to insert into.
  const hasValidTarget = Boolean(tripId && targetItineraryId && currentVersion != null);

  const [pickerOpen, setPickerOpen] = useState(false);

  // Fetch unfiltered so the picker receives all agency rated trips.
  // The destination chip is pre-seeded via defaultDestinationFilter below.
  const { trips } = useRatedHistory({
    agencyId: agencyId ?? "",
    filters: {},
  });

  /* ─────────────────────────────────────────────────────────────
     Autocomplete: pick `reuse` → clear composer, open picker.
     In a draft (hasValidTarget false) we only clear the composer —
     the picker must never open without a valid target.
  ──────────────────────────────────────────────────────────────── */
  const handlePickReuse = useCallback(() => {
    setComposerInput("");
    if (hasValidTarget) {
      setPickerOpen(true);
    }
  }, [setComposerInput, hasValidTarget]);

  /* ─────────────────────────────────────────────────────────────
     Autocomplete keyboard handling
     Enter / Tab picks `reuse`. Escape closes the autocomplete by
     clearing the composer (so the dropdown disappears). The
     composer's own keydown handler is NOT prevented for unrelated
     keys.
  ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!autocompleteOpen) return;
    const el = textareaRef?.current;
    if (!el) return;

    const handler = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        handlePickReuse();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setComposerInput("");
      } else if (e.key === "Tab") {
        e.preventDefault();
        handlePickReuse();
      }
    };

    // Capture phase so we intercept before the composer's own handler runs.
    el.addEventListener("keydown", handler, true);
    return () => el.removeEventListener("keydown", handler, true);
  }, [autocompleteOpen, textareaRef, handlePickReuse, setComposerInput]);

  /* ─────────────────────────────────────────────────────────────
     Confirm flow
     POST /trips/{tripId}/itinerary/insert-from-rated with the
     selection. Default insertion position is end-of-itinerary
     (computed from targetItinerary if provided, else dayIndex=0).
     For kind='item' we default to the last day's last position.
  ──────────────────────────────────────────────────────────────── */
  const buildTarget = useCallback(
    (selection) => {
      const days = Array.isArray(targetItinerary?.days) ? targetItinerary.days : [];
      if (selection?.kind === "item") {
        const lastIdx = Math.max(0, days.length - 1);
        const lastDay = days[lastIdx];
        const lastItems = Array.isArray(lastDay?.items) ? lastDay.items : [];
        return {
          itineraryId: targetItineraryId,
          dayIndex: lastIdx,
          position: lastItems.length,
        };
      }
      // day / segment → end-of-itinerary
      return {
        itineraryId: targetItineraryId,
        dayIndex: days.length,
      };
    },
    [targetItinerary, targetItineraryId]
  );

  const handleConfirm = useCallback(
    async (selection, opts = {}) => {
      const pendingComment = typeof opts?.comment === "string" ? opts.comment : "";

      if (!tripId || !targetItineraryId) {
        // eslint-disable-next-line no-console
        console.warn("[reuse-slash] missing target — aborting confirm");
        return;
      }

      const target = buildTarget(selection);
      const body = {
        sourceTripId: selection?.sourceTripId,
        selection,
        target,
        ifMatchVersion: currentVersion,
      };

      let res;
      try {
        res = await fetch(
          `${API_URL}/trips/${tripId}/itinerary/insert-from-rated`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
      } catch {
        postSystemError("Couldn't reach the server.");
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (res.status === 200) {
        const { itinerary, missingStartDateAdvisory } = data || {};
        setPickerOpen(false);

        const recap = buildSuccessRecap(selection, data, pendingComment);
        postSystem(recap, { kind: "reuse_inserted" });

        if (typeof onInserted === "function") {
          onInserted(itinerary, missingStartDateAdvisory);
        }
        return;
      }

      // Error path
      const reason = errorReasonFor(res.status);
      postSystemError(`Couldn't add items: ${reason}`);

      function postSystem(content, metadata) {
        if (typeof onSystemVisibleMessage !== "function") return;
        onSystemVisibleMessage({
          id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: "SYSTEM_VISIBLE",
          content,
          metadata,
          createdAt: new Date().toISOString(),
        });
      }

      function postSystemError(message) {
        // eslint-disable-next-line no-console
        console.warn(`[reuse-slash] ${message}`);
        postSystem(message, { kind: "reuse_error", httpStatus: res?.status ?? null });
      }
    },
    [
      tripId,
      targetItineraryId,
      currentVersion,
      buildTarget,
      onSystemVisibleMessage,
      onInserted,
    ]
  );

  /* ─────────────────────────────────────────────────────────────
     Render — autocomplete dropdown + picker
  ──────────────────────────────────────────────────────────────── */
  return (
    <>
      {autocompleteOpen && (
        <div
          data-testid="reuse-slash-autocomplete"
          role="listbox"
          aria-label="Slash command suggestions"
          className="absolute left-0 right-0 bottom-full mb-2 z-30 rounded-2xl border overflow-hidden"
          style={{
            background: "rgb(var(--color-surface-rgb))",
            borderColor: "rgba(var(--color-border-rgb), 0.18)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            maxWidth: "320px",
          }}
        >
          <div
            role="option"
            aria-selected="true"
            tabIndex={0}
            onMouseDown={(e) => {
              // Prevent the textarea from losing focus before we handle the pick.
              e.preventDefault();
            }}
            onClick={handlePickReuse}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handlePickReuse();
              }
            }}
            data-testid="reuse-slash-option-reuse"
            className="w-full text-left px-4 py-2.5 cursor-pointer flex flex-col gap-0.5"
            style={{
              background: "rgba(var(--color-secondary-rgb), 0.08)",
              color: "rgb(var(--color-text-rgb))",
            }}
          >
            <span className="text-[14px] font-semibold">/reuse</span>
            <span
              className="text-[12px]"
              style={{ color: "rgb(var(--color-text-soft-rgb))" }}
            >
              {hasValidTarget
                ? "Insert items from a rated past trip"
                : "Save this plan first to reuse from past trips"}
            </span>
          </div>
        </div>
      )}

      {pickerOpen && hasValidTarget && (
        <RatedHistoryPicker
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          currentTrip={currentTrip}
          defaultDestinationFilter={currentTrip?.destinationSummary ?? null}
          mode="slash"
          agencyId={agencyId}
          trips={trips}
          onConfirmInsertions={handleConfirm}
        />
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   Helpers — recap string + error reason mapping.
──────────────────────────────────────────────────────────────── */

function buildSuccessRecap(selection, data, pendingComment) {
  const itinerary = data?.itinerary ?? null;
  const sourceTripTitle = data?.sourceTripTitle ?? selection?.sourceTripTitle ?? "rated trip";
  const sourceDayNumber = data?.sourceDayNumber ?? null;
  const itemCount = data?.itemCount ?? null;
  const newDayNumber = data?.newDayNumber
    ?? (Array.isArray(itinerary?.days) ? itinerary.days.length : null);

  let base;
  if (selection?.kind === "item") {
    const n = itemCount ?? (selection.itemIds?.length ?? 0);
    base = `Added ${n} item${n === 1 ? "" : "s"} from "${sourceTripTitle}".`;
  } else if (selection?.kind === "segment") {
    const dayCount = selection.dayIds?.length ?? 0;
    base = `Added ${dayCount} day${dayCount === 1 ? "" : "s"} from "${sourceTripTitle}".`;
  } else {
    // day (or unknown)
    const dayPart = sourceDayNumber != null ? `Day ${sourceDayNumber} ` : "";
    const stops = itemCount != null ? ` (${itemCount} stop${itemCount === 1 ? "" : "s"})` : "";
    const anchor = newDayNumber != null ? ` Anchored to your trip as Day ${newDayNumber}.` : "";
    base = `Added to itinerary: ${dayPart}from "${sourceTripTitle}"${stops}.${anchor}`.replace(/\s+/g, " ").trim();
  }

  if (pendingComment && pendingComment.trim()) {
    return `${base}\n\nStaff note: ${pendingComment.trim()}`;
  }
  return base;
}

function errorReasonFor(status) {
  switch (status) {
    case 400:
      return "please re-select and try again.";
    case 403:
      return "insertion not allowed.";
    case 404:
      return "source trip not found.";
    case 409:
      return "itinerary changed elsewhere — please refresh.";
    case 410:
      return "that trip was removed.";
    default:
      return `unexpected error (${status}).`;
  }
}
