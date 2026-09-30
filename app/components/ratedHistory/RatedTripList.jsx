"use client";

/**
 * RatedTripList
 *
 * Scrollable list of rated trip summaries with click-to-expand behaviour.
 * Controlled: the parent owns which trip is expanded (at most one at a time).
 *
 * Props
 * ─────
 * trips             Array<RatedTripSummary>   — server §5.1 shape
 * expandedTripId    string | null             — currently-expanded trip id
 * onTripToggle      (tripId: string) => void  — fires on row click
 * selection         { kind?, itemIds?, dayIds? }
 * onSelectionChange (next) => void
 * itineraryByTripId Record<string, RatedItinerary>  (optional)
 *   When a trip is expanded and its entry exists here, render
 *   <RatedTripExpanded itinerary={…} />. When missing, render a loading
 *   placeholder. Real fetching lands in Stage 5A.
 *
 * RatedTripSummary shape (§5.1)
 * ─────────────────────────────
 * { tripId: string, title: string, destinationSummary: string | null,
 *   dayCount: number, startDate: string | null, endDate: string | null,
 *   rating: number, ratedAt: string }
 */

import StarRating from "../common/StarRating";
import RatedTripExpanded from "./RatedTripExpanded";

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Format an ISO date string as "MMM YYYY" (e.g. "Jun 2025").
 * Returns "—" when the input is null or unparseable.
 *
 * @param {string | null | undefined} isoDate
 * @returns {string}
 */
function formatTripMonth(isoDate) {
  if (!isoDate) return "—";
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ── Sub-components ────────────────────────────────────────────────────────────

/**
 * InlineLoading — shown inside an expanded row when itinerary data is not yet
 * in the `itineraryByTripId` map. Real fetching is wired in Stage 5A.
 */
function InlineLoading() {
  return (
    <div
      role="status"
      aria-label="Loading itinerary"
      className="px-4 py-4 flex flex-col gap-2 animate-pulse"
    >
      <div className="flex items-center gap-2 text-[12px] text-text-soft mb-1">
        <svg
          className="w-4 h-4 animate-spin shrink-0 text-text-soft"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            strokeOpacity="0.25"
          />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <span>Loading itinerary…</span>
      </div>
      {/* Skeleton rows */}
      <div className="h-3 rounded bg-border/[0.10] w-3/4" />
      <div className="h-3 rounded bg-border/[0.07] w-1/2" />
      <div className="h-3 rounded bg-border/[0.10] w-2/3" />
    </div>
  );
}

/**
 * DraftBadge — small pill shown next to the title when the trip's loaded
 * itinerary has status === 'DRAFT'. Only rendered after expansion supplies
 * itinerary data (spec §11 open question 5: v1 includes drafts).
 */
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
 *   trips: Array<{
 *     tripId: string,
 *     title: string,
 *     destinationSummary: string | null,
 *     dayCount: number,
 *     startDate: string | null,
 *     endDate: string | null,
 *     rating: number,
 *     ratedAt: string,
 *   }>,
 *   expandedTripId: string | null,
 *   onTripToggle: (tripId: string) => void,
 *   selection: { kind?: string, itemIds?: string[], dayIds?: string[] },
 *   onSelectionChange: (next: object) => void,
 *   itineraryByTripId?: Record<string, object>,
 * }} props
 */
export default function RatedTripList({
  trips = [],
  expandedTripId,
  onTripToggle,
  selection,
  onSelectionChange,
  itineraryByTripId = {},
}) {
  if (trips.length === 0) {
    // The picker shell renders <EmptyRatedState>; guard here for standalone safety.
    return null;
  }

  return (
    <ul
      className="m-0 p-0 list-none divide-y divide-border/[0.08]"
      role="list"
      aria-label="Rated trips"
    >
      {trips.map((trip) => {
        const isExpanded = expandedTripId === trip.tripId;
        const tripMonth = formatTripMonth(trip.startDate);
        const dayLabel = `${trip.dayCount} day${trip.dayCount !== 1 ? "s" : ""}`;
        const itinerary = itineraryByTripId[trip.tripId] ?? null;

        // Draft badge: only visible when itinerary is loaded and status === 'DRAFT'
        const showDraftBadge = isExpanded && itinerary?.status === "DRAFT";

        // Accessible label for the row button
        const accessibleName = `${trip.title}, rated ${trip.rating} out of 5 stars. Click to ${isExpanded ? "collapse" : "expand"}.`;

        return (
          <li key={trip.tripId} className="flex flex-col">
            {/* ── Trip row button ────────────────────────────────────────── */}
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-controls={`rated-trip-expanded-${trip.tripId}`}
              aria-label={accessibleName}
              onClick={() => onTripToggle(trip.tripId)}
              className={[
                "w-full text-left px-4 py-3",
                "flex items-start gap-3",
                "transition-colors duration-150",
                "focus-visible:outline-none",
                "focus-visible:ring-2 focus-visible:ring-inset",
                "focus-visible:ring-[var(--accent,var(--rating-star))]/60",
                isExpanded
                  ? "bg-border/[0.06]"
                  : "hover:bg-border/[0.04] active:bg-border/[0.08]",
              ].join(" ")}
            >
              {/* Left: text column */}
              <div className="min-w-0 flex-1">
                {/* Title row with optional Draft badge */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <p
                    className="m-0 text-[13px] font-medium text-text-primary truncate leading-snug"
                    title={trip.title}
                  >
                    {trip.title}
                  </p>
                  {showDraftBadge && <DraftBadge />}
                </div>

                {/* Meta row: destination · day count · trip month */}
                <p className="m-0 text-[11px] text-text-soft leading-snug mt-1 flex items-center flex-wrap gap-x-1.5 gap-y-0">
                  <span className="truncate max-w-[140px]">
                    {trip.destinationSummary ?? "—"}
                  </span>
                  <span aria-hidden="true" className="opacity-40">·</span>
                  <span>{dayLabel}</span>
                  <span aria-hidden="true" className="opacity-40">·</span>
                  <span>{tripMonth}</span>
                </p>
              </div>

              {/* Right: rating + chevron */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                {/* N filled stars out of 5 — display-only (disabled, no onChange) */}
                <StarRating value={trip.rating} disabled size="sm" />

                {/* Chevron indicator */}
                <svg
                  viewBox="0 0 16 16"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={[
                    "text-text-muted transition-transform duration-200",
                    isExpanded ? "rotate-180" : "rotate-0",
                  ].join(" ")}
                >
                  <path d="M4 6l4 4 4-4" />
                </svg>
              </div>
            </button>

            {/* ── Expanded panel ─────────────────────────────────────────── */}
            {isExpanded && (
              <div
                id={`rated-trip-expanded-${trip.tripId}`}
                role="region"
                aria-label={`Itinerary for ${trip.title}`}
                className="border-t border-border/[0.08] bg-background/40"
              >
                {itinerary ? (
                  <RatedTripExpanded
                    itinerary={itinerary}
                    tripId={trip.tripId}
                    selection={selection}
                    onSelectionChange={onSelectionChange}
                  />
                ) : (
                  <InlineLoading />
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
