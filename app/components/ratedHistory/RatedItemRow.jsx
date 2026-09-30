"use client";

/**
 * @typedef {Object} RatedItem
 * @property {string}      itemId
 * @property {number}      sortOrder
 * @property {string}      type
 * @property {string}      title
 * @property {string|null} description
 * @property {string|null} startTime
 * @property {string|null} endTime
 * @property {{ name: string, formattedAddress: string|null, latitude: number|null, longitude: number|null }|null} place
 * @property {string|null} staffNotes
 */

/**
 * Formats a "HH:MM – HH:MM", "HH:MM", or "Time pending" time label.
 *
 * Both times present → "HH:MM – HH:MM"
 * Only startTime     → startTime as-is
 * Neither            → "Time pending"
 *
 * @param {string|null|undefined} startTime
 * @param {string|null|undefined} endTime
 * @returns {string}
 */
function formatTimeLabel(startTime, endTime) {
  if (startTime && endTime) return `${startTime} – ${endTime}`;
  if (startTime) return startTime;
  return "Time pending";
}

/** The ⋮⋮ two-column dot grip icon. */
function DragHandleSVG() {
  return (
    <svg
      width="12"
      height="18"
      viewBox="0 0 12 18"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="3" cy="3" r="1.5" />
      <circle cx="3" cy="9" r="1.5" />
      <circle cx="3" cy="15" r="1.5" />
      <circle cx="9" cy="3" r="1.5" />
      <circle cx="9" cy="9" r="1.5" />
      <circle cx="9" cy="15" r="1.5" />
    </svg>
  );
}

/**
 * RatedItemRow
 *
 * Renders a single itinerary item from a rated source trip inside the picker.
 * The drag handle (⋮⋮) triggers an HTML5 native drag with the standard
 * `application/x-voyage-reuse` MIME payload. The row itself is display-only;
 * selection state is not managed here (items are selected individually only when
 * the parent day is NOT in range mode, and item-level selection is managed by
 * the consuming parent if needed in a future stage).
 *
 * @param {{
 *   item: RatedItem,
 *   dayId: string,
 *   tripId?: string,
 *   selection: { kind?: string, itemIds?: string[], dayIds?: string[] },
 *   onSelectionChange: (next: object) => void,
 *   onKeyboardMove?: (payload: object) => void,
 * }} props
 */
export default function RatedItemRow({
  item,
  dayId,
  tripId = "?",
  selection,
  onSelectionChange,
  onKeyboardMove,
}) {
  const { itemId, title, description, startTime, endTime } = item;

  const timeLabel = formatTimeLabel(startTime, endTime);
  const isPending = !startTime && !endTime;

  /** Build and fire the drag payload on dragstart. */
  function handleDragStart(event) {
    const payload = {
      kind: "item",
      sourceTripId: tripId,
      itemIds: [itemId],
      sourceDayId: dayId,
    };
    event.dataTransfer.setData(
      "application/x-voyage-reuse",
      JSON.stringify(payload)
    );
    // Plain-text fallback for generic drop targets
    event.dataTransfer.setData("text/plain", title);
    event.dataTransfer.effectAllowed = "copy";
  }

  /**
   * Keyboard fallback: pressing Enter or Space on the handle fires a stub
   * `onKeyboardMove` call with the same payload shape. The "Move to…" menu
   * implementation is deferred to Stage 5B (useReuseDrop); we provide the
   * hook point here so Stage 5B can wire it without touching this file.
   */
  function handleHandleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const payload = {
        kind: "item",
        sourceTripId: tripId,
        itemIds: [itemId],
        sourceDayId: dayId,
      };
      onKeyboardMove?.(payload);
    }
  }

  return (
    <li
      className="flex items-start gap-3 px-3 py-2.5"
    >
      {/* ── ⋮⋮ Drag handle ── */}
      <div
        draggable={true}
        onDragStart={handleDragStart}
        className="flex-shrink-0 mt-0.5 flex items-center"
        style={{ cursor: "grab" }}
      >
        <button
          type="button"
          tabIndex={0}
          aria-label={`Drag ${title}`}
          onClick={(e) => e.preventDefault()}
          onKeyDown={handleHandleKeyDown}
          className={[
            "p-1 rounded text-text-soft transition-colors duration-150",
            "hover:text-text-muted hover:bg-border/[0.08]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50",
          ].join(" ")}
          style={{ cursor: "inherit" }}
        >
          <DragHandleSVG />
        </button>
      </div>

      {/* ── Time label ── */}
      <span
        className={[
          "flex-shrink-0 mt-0.5 text-[11px] tabular-nums leading-tight",
          isPending ? "text-text-muted italic" : "text-text-soft",
        ].join(" ")}
        style={{ minWidth: "72px" }}
        aria-label={`Time: ${timeLabel}`}
      >
        {timeLabel}
      </span>

      {/* ── Content ── */}
      <div className="min-w-0 flex-1">
        {/* Title */}
        <p className="m-0 text-[13px] font-medium text-text-primary leading-snug">
          {title}
        </p>

        {/* Description — truncated to 2 lines */}
        {description && (
          <p
            className="m-0 mt-0.5 text-[12px] text-text-soft leading-relaxed"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {description}
          </p>
        )}
      </div>
    </li>
  );
}
