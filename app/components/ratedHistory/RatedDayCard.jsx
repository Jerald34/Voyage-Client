"use client";

import { useMemo, useState } from "react";
import RatedItemRow from "./RatedItemRow.jsx";

/**
 * isConsecutive
 *
 * Given a subset of dayIds and the full ordered day list (sorted by dayNumber),
 * returns true when every selected day forms an unbroken consecutive dayNumber run.
 *
 * @param {string[]} selectedDayIds
 * @param {Array<{ dayId: string, dayNumber: number }>} allDays
 * @returns {boolean}
 */
export function isConsecutive(selectedDayIds, allDays) {
  if (!selectedDayIds || selectedDayIds.length <= 1) return true;

  const selectedSet = new Set(selectedDayIds);
  const selectedDays = allDays
    .filter((d) => selectedSet.has(d.dayId))
    .sort((a, b) => a.dayNumber - b.dayNumber);

  if (selectedDays.length !== selectedDayIds.length) {
    // Some IDs not found — treat as non-consecutive
    return false;
  }

  for (let i = 1; i < selectedDays.length; i++) {
    if (selectedDays[i].dayNumber !== selectedDays[i - 1].dayNumber + 1) {
      return false;
    }
  }
  return true;
}

/**
 * Formats an ISO date string as "MMM d" (e.g. "Jan 5").
 * Returns null if dateStr is falsy.
 *
 * @param {string | null | undefined} dateStr
 * @returns {string | null}
 */
function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return null;
  }
}

/**
 * DragHandle — the ⋮⋮ grip icon rendered as a <button> with draggable on its
 * outer container. The button surfaces an accessible label; the actual
 * `draggable` attribute is on the wrapping element passed by the parent.
 */
function DragHandleSVG() {
  return (
    <svg
      width="12"
      height="18"
      viewBox="0 0 12 18"
      fill="currentColor"
      aria-hidden="true"
    >
      {/* Two columns of three dots */}
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
 * RatedDayCard
 *
 * Renders a single day from a rated source trip inside the picker panel.
 * Each day has a ⋮⋮ drag handle (single-day payload), a "Select range" toggle
 * for multi-day segment building, and a body list of RatedItemRow children.
 *
 * @param {{
 *   day: {
 *     dayId: string,
 *     dayNumber: number,
 *     date: string | null,
 *     title: string,
 *     summary: string | null,
 *     items: Array<import('./RatedItemRow.jsx').RatedItem>
 *   },
 *   tripId: string,
 *   selection: null | { kind: 'item'|'day'|'segment', sourceTripId: string, [key: string]: any },
 *   onSelectionChange: (next: object | null) => void,
 *   rangeMode: boolean,
 *   onRangeModeToggle: () => void,
 *   selectedDayIds: string[],
 *   consecutiveError: boolean,
 *   allDays: Array<{ dayId: string, dayNumber: number }>,
 *   getKeyboardTargets?: (payload: object) => Array<{ dayIndex: number, label: string }>,
 *   onKeyboardMove?: (payload: object, target: object) => void,
 * }} props
 */
export default function RatedDayCard({
  day,
  tripId,
  selection,
  onSelectionChange,
  rangeMode,
  onRangeModeToggle,
  selectedDayIds = [],
  consecutiveError = false,
  allDays = [],
  getKeyboardTargets,
  onKeyboardMove,
}) {
  const { dayId, dayNumber, date, title, summary, items = [] } = day;

  const formattedDate = useMemo(() => formatDate(date), [date]);

  /** True when this day is checked in range-mode */
  const isChecked = selectedDayIds.includes(dayId);

  /**
   * Build the correct drag payload depending on context:
   *  - rangeMode + ≥2 consecutive days selected → segment payload
   *  - otherwise → single-day payload
   */
  function buildDragPayload() {
    if (rangeMode && selectedDayIds.length >= 2 && isChecked && !consecutiveError) {
      // Sort selected days by their dayNumber from allDays
      const sortedIds = [...selectedDayIds].sort((a, b) => {
        const da = allDays.find((d) => d.dayId === a);
        const db = allDays.find((d) => d.dayId === b);
        return (da?.dayNumber ?? 0) - (db?.dayNumber ?? 0);
      });
      return { kind: "segment", sourceTripId: tripId, dayIds: sortedIds };
    }
    return { kind: "day", sourceTripId: tripId, dayIds: [dayId] };
  }

  function handleDragStart(event) {
    const payload = buildDragPayload();
    event.dataTransfer.setData(
      "application/x-voyage-reuse",
      JSON.stringify(payload)
    );
    // Plain-text fallback so generic drop targets show something legible
    const label =
      payload.kind === "segment"
        ? `Days ${payload.dayIds.join(", ")} (segment)`
        : `Day ${dayNumber}: ${title}`;
    event.dataTransfer.setData("text/plain", label);
    event.dataTransfer.effectAllowed = "copy";
  }

  /** Keyboard targets select state for the day-drag keyboard fallback */
  const [keyboardTargets, setKeyboardTargets] = useState(/** @type {Array<{dayIndex:number,label:string}>|null} */ (null));

  /**
   * Space/Enter on the day drag handle: open a native <select> of target
   * positions so keyboard-only users can insert the day without drag-and-drop.
   * Calls getKeyboardTargets() if provided, otherwise no-ops.
   */
  function handleDragHandleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (typeof getKeyboardTargets !== "function") return;
      const payload = buildDragPayload();
      const targets = getKeyboardTargets(payload);
      setKeyboardTargets(targets && targets.length > 0 ? targets : null);
    }
    if (event.key === "Escape") {
      setKeyboardTargets(null);
    }
  }

  function handleKeyboardTargetSelect(event) {
    const idx = Number(event.target.value);
    if (isNaN(idx) || !keyboardTargets) return;
    const target = keyboardTargets[idx];
    if (!target) return;
    const payload = buildDragPayload();
    onKeyboardMove?.(payload, target);
    setKeyboardTargets(null);
  }

  function handleCheckboxChange(checked) {
    let nextIds;
    if (checked) {
      nextIds = [...selectedDayIds, dayId];
    } else {
      nextIds = selectedDayIds.filter((id) => id !== dayId);
    }

    if (nextIds.length === 0) {
      onSelectionChange(null);
    } else {
      onSelectionChange({
        kind: nextIds.length === 1 ? "day" : "segment",
        sourceTripId: tripId,
        dayIds: nextIds,
      });
    }
  }

  return (
    <div className="mb-3 border border-border/[0.12] rounded-[10px] overflow-hidden bg-surface shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      {/* ── Day header ── */}
      <header className="relative flex items-center gap-2 px-3 py-2.5 bg-background border-b border-border/[0.10]">
        {/* Range-mode checkbox */}
        {rangeMode && (
          <input
            type="checkbox"
            aria-label={`Select Day ${dayNumber}: ${title} for range`}
            checked={isChecked}
            onChange={(e) => handleCheckboxChange(e.target.checked)}
            className="w-4 h-4 rounded accent-secondary cursor-pointer shrink-0"
          />
        )}

        {/* ⋮⋮ drag handle — draggable wrapper surrounds the button */}
        <div
          draggable={true}
          onDragStart={handleDragStart}
          className="flex items-center"
          /* Grabbing cursor on the draggable container */
          style={{ cursor: "grab" }}
        >
          <button
            type="button"
            aria-label={`Drag Day ${dayNumber}: ${title}`}
            aria-haspopup={typeof getKeyboardTargets === "function" ? "listbox" : undefined}
            aria-expanded={keyboardTargets !== null ? "true" : undefined}
            /* Prevent the button click from accidentally toggling something */
            onClick={(e) => e.preventDefault()}
            onKeyDown={handleDragHandleKeyDown}
            className="p-1 rounded text-text-soft hover:text-text-muted hover:bg-border/[0.08] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50"
            style={{ cursor: "inherit" }}
          >
            <DragHandleSVG />
          </button>
        </div>

        {/* Keyboard fallback: inline target picker shown on Enter/Space */}
        {keyboardTargets !== null && (
          <select
            aria-label={`Move Day ${dayNumber}: ${title} to…`}
            size={Math.min(keyboardTargets.length, 6)}
            autoFocus
            onChange={handleKeyboardTargetSelect}
            onBlur={() => setKeyboardTargets(null)}
            onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setKeyboardTargets(null); } }}
            className="absolute z-40 left-0 top-full mt-1 rounded border border-border/[0.25] bg-surface text-[13px] text-text-primary shadow-lg focus:outline-none"
            defaultValue=""
          >
            <option value="" disabled>Move to…</option>
            {keyboardTargets.map((t, i) => (
              <option key={i} value={i}>{t.label}</option>
            ))}
          </select>
        )}

        {/* Day label */}
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-text-primary truncate">
            Day {dayNumber}
            {title ? ` · ${title}` : ""}
          </span>
          {formattedDate && (
            <span className="ml-1.5 text-[12px] text-text-soft">
              {formattedDate}
            </span>
          )}
        </div>

        {/* "Select range" toggle chip */}
        <button
          type="button"
          aria-pressed={rangeMode}
          onClick={onRangeModeToggle}
          className={[
            "shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-pill border transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50",
            rangeMode
              ? "bg-secondary text-white border-secondary"
              : "bg-surface text-text-soft border-border/[0.25] hover:border-secondary/50 hover:text-secondary",
          ].join(" ")}
        >
          Select range
        </button>
      </header>

      {/* Consecutive-days error banner */}
      {rangeMode && consecutiveError && (
        <div
          role="alert"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-status-warning/10 border-b border-status-warning/30 text-status-warning text-[12px] font-medium"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Days must be consecutive
        </div>
      )}

      {/* Optional summary */}
      {summary && (
        <p className="px-3 pt-2 pb-0 m-0 text-[12px] text-text-soft leading-relaxed">
          {summary}
        </p>
      )}

      {/* ── Item rows ── */}
      <ul className="m-0 p-0 list-none divide-y divide-border/[0.06]">
        {items.length === 0 ? (
          <li className="px-3 py-3 text-[12px] text-text-soft italic">
            <em>Exploration pending</em>
          </li>
        ) : (
          items.map((item) => (
            <RatedItemRow
              key={item.itemId}
              item={item}
              tripId={tripId}
              dayId={dayId}
              selection={selection}
              onSelectionChange={onSelectionChange}
            />
          ))
        )}
      </ul>
    </div>
  );
}
