"use client";

/**
 * EmptyRatedState
 *
 * Shown in the body of RatedHistoryPicker when there are no trips to display.
 *
 * @param {Object}  props
 * @param {boolean} [props.hasFilteredAway] - When true, the agency has rated trips but
 *   the active destination filter removed all of them. Shows a hint to clear the filter
 *   instead of the generic "no rated trips yet" copy.
 *
 * Uses design tokens from app/globals.css. No interactivity.
 */
export default function EmptyRatedState({ hasFilteredAway = false }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center select-none">
      {/* Star-with-slash icon — inline SVG, ~48px, opacity-40 */}
      <div className="mb-5 opacity-40" aria-hidden="true">
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Star outline */}
          <path
            d="M24 5L29.09 17.26L42.18 18.27L32.55 26.64L35.56 39.45L24 32.77L12.44 39.45L15.45 26.64L5.82 18.27L18.91 17.26L24 5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Diagonal slash */}
          <line
            x1="8"
            y1="8"
            x2="40"
            y2="40"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {hasFilteredAway ? (
        <>
          <h3
            className="m-0 mb-2 text-[17px] font-semibold leading-snug"
            style={{ color: "rgb(var(--color-text-rgb))" }}
          >
            No matches for this destination
          </h3>
          <p
            className="m-0 text-[14px] leading-relaxed max-w-[260px]"
            style={{ color: "rgb(var(--color-text-soft-rgb))" }}
          >
            No rated trips match this destination. Clear the filter to see all
            rated trips.
          </p>
        </>
      ) : (
        <>
          <h3
            className="m-0 mb-2 text-[17px] font-semibold leading-snug"
            style={{ color: "rgb(var(--color-text-rgb))" }}
          >
            No rated trips yet
          </h3>
          <p
            className="m-0 text-[14px] leading-relaxed max-w-[260px]"
            style={{ color: "rgb(var(--color-text-soft-rgb))" }}
          >
            Once travelers rate trips &ge;4&#9733;, those itineraries appear here
            for reuse.
          </p>
        </>
      )}
    </div>
  );
}
