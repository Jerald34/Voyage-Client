"use client";

/**
 * RatedTripExpanded
 *
 * Renders the day-by-day breakdown inside an expanded trip list row.
 * This is a pure composition component — no data fetching. The parent
 * (`RatedTripList`) supplies the itinerary via `itineraryByTripId`; fetching
 * lands in Stage 5A.
 *
 * Props
 * ─────
 * itinerary         RatedItinerary — server §5.2 shape (required)
 * selection         { kind?, itemIds?, dayIds? }
 * onSelectionChange (next) => void
 *
 * RatedItinerary shape (§5.2)
 * ───────────────────────────
 * { itineraryId: string, title: string, summary: string | null,
 *   status?: string,   // treated as opaque; 'DRAFT' triggers the badge
 *   days: Array<{ dayId, dayNumber, date, title, summary,
 *                 items: Array<{ itemId, sortOrder, type, title, description,
 *                                startTime, endTime, place, staffNotes }> }> }
 *
 * Range-select state
 * ──────────────────
 * `RatedDayCard` (Stage 4C) owns the per-day drag handles and the "Select range"
 * toggle, but the *list* of selected day IDs and the consecutive-error check must
 * be shared across all day cards. `RatedTripExpanded` owns that state and passes
 * it down.
 *
 * Draft badge
 * ───────────
 * Spec §11 open question 5: v1 includes DRAFT itineraries with a small badge.
 * The badge appears in the itinerary header when `itinerary.status === 'DRAFT'`.
 */

import { useState, useCallback, useMemo } from "react";

// Stage 4C component — may not exist yet during parallel dispatch.
// Import is intentionally left as-is so the build works once 4C lands.
import RatedDayCard, { isConsecutive } from "./RatedDayCard";

// ── helpers ───────────────────────────────────────────────────────────────────

/** Returns true when the itinerary originated from a DRAFT source. */
function isDraft(itinerary) {
  return itinerary?.status === "DRAFT";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DraftBadge() {
  return (
    <span
      className={[
        "inline-flex items-center shrink-0",
        "text-[10px] font-extrabold tracking-[0.06em] uppercase",
        "px-1.5 py-0.5 rounded-[5px]",
        "bg-border/[0.08] text-text-soft border border-border/[0.12]",
      ].join(" ")}
      aria-label="Draft itinerary"
    >
      Draft
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * @param {{
 *   itinerary: {
 *     itineraryId: string,
 *     title: string,
 *     summary: string | null,
 *     status?: string,
 *     days: Array<{
 *       dayId: string,
 *       dayNumber: number,
 *       date: string | null,
 *       title: string,
 *       summary: string | null,
 *       items: Array<object>,
 *     }>,
 *   },
 *   selection: { kind?: string, itemIds?: string[], dayIds?: string[] },
 *   onSelectionChange: (next: object) => void,
 *   /** The tripId of the source trip — forwarded to RatedDayCard for drag payloads. *\/
 *   tripId?: string,
 * }} props
 */
export default function RatedTripExpanded({
  itinerary,
  selection,
  onSelectionChange,
  tripId = "",
}) {
  // ── Range-select state (shared across all RatedDayCards) ─────────────────
  // rangeMode is per-expanded-view; toggling it on any day card toggles it
  // for all cards in this itinerary view. Only one tripId is expanded at a
  // time (parent guarantee), so this state is never stale across trips.
  const [rangeMode, setRangeMode] = useState(false);
  const [selectedDayIds, setSelectedDayIds] = useState([]);

  const handleRangeModeToggle = useCallback(() => {
    setRangeMode((prev) => {
      if (prev) {
        // Turning off: clear selection
        setSelectedDayIds([]);
        onSelectionChange({});
      }
      return !prev;
    });
  }, [onSelectionChange]);

  // Derive the minimal shape allDays for consecutive-check from the itinerary
  const allDays = useMemo(
    () =>
      Array.isArray(itinerary?.days)
        ? itinerary.days.map((d) => ({ dayId: d.dayId, dayNumber: d.dayNumber }))
        : [],
    [itinerary?.days]
  );

  // Whether the current selectedDayIds form a consecutive run
  const consecutiveError = useMemo(
    () => selectedDayIds.length > 1 && !isConsecutive(selectedDayIds, allDays),
    [selectedDayIds, allDays]
  );

  // Wrap onSelectionChange so RatedDayCard can update selectedDayIds in sync
  const handleSelectionChange = useCallback(
    (next) => {
      if (!next) {
        setSelectedDayIds([]);
        onSelectionChange({});
        return;
      }
      // Sync selectedDayIds when the selection has dayIds
      if (next.dayIds) {
        setSelectedDayIds(next.dayIds);
      }
      onSelectionChange(next);
    },
    [onSelectionChange]
  );

  // ── Guard ────────────────────────────────────────────────────────────────
  if (!itinerary) {
    return (
      <p className="px-4 py-3 m-0 text-[12px] text-text-soft">
        No itinerary data.
      </p>
    );
  }

  const days = Array.isArray(itinerary.days)
    ? [...itinerary.days].sort((a, b) => a.dayNumber - b.dayNumber)
    : [];
  const showDraftBadge = isDraft(itinerary);

  return (
    <div className="flex flex-col">
      {/* ── Itinerary header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/[0.08]">
        <div className="flex-1 min-w-0">
          <p className="m-0 text-[12px] font-semibold text-text-soft truncate">
            {itinerary.title || "Itinerary"}
          </p>
          {itinerary.summary && (
            <p className="m-0 text-[11px] text-text-muted truncate mt-0.5">
              {itinerary.summary}
            </p>
          )}
        </div>
        {showDraftBadge && <DraftBadge />}
      </div>

      {/* ── Day list ─────────────────────────────────────────────────────── */}
      {days.length === 0 ? (
        <p className="px-4 py-3 m-0 text-[12px] text-text-soft">
          No days in this itinerary.
        </p>
      ) : (
        <ul className="m-0 p-0 list-none" role="list" aria-label="Days">
          {days.map((day, index) => (
            <li
              key={day.dayId}
              className={[
                // Light separator between days (not on the last item)
                index < days.length - 1 ? "border-b border-border/[0.06]" : "",
              ].join(" ")}
            >
              <RatedDayCard
                day={day}
                tripId={tripId}
                selection={selection}
                onSelectionChange={handleSelectionChange}
                rangeMode={rangeMode}
                onRangeModeToggle={handleRangeModeToggle}
                selectedDayIds={selectedDayIds}
                consecutiveError={consecutiveError}
                allDays={allDays}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
