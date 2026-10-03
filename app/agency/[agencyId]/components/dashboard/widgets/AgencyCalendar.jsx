"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useCalendarEvents } from "@/app/hooks/useCalendarEvents";
import {
  MONTH_NAMES,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  addDays,
  addMonths,
  buildCalendarDays,
  fullDayLabel,
  startOfMonth,
  toDateKey,
} from "@/app/lib/calendarDays";
import CalendarDayPopover from "./CalendarDayPopover";

const NARROW_QUERY = "(max-width: 600px)";
const KEY_STEPS = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
const NAV_BUTTON =
  "frame-tile flex h-9 w-9 items-center justify-center rounded-full text-text-primary hover:bg-text-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary";

/** True on screens narrow enough that day details sit under the grid. */
function useIsNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(NARROW_QUERY);
    setNarrow(mql.matches);
    const onChange = (event) => setNarrow(event.matches);
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);
  return narrow;
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function dayLabel(cell) {
  const count = cell.spans.length + cell.events.length;
  return `${fullDayLabel(cell.date)}${cell.isToday ? ", today" : ""}${count ? `, ${count} item${count === 1 ? "" : "s"}` : ""}`;
}

function ChevronIcon({ direction }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {direction === "left" ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
    </svg>
  );
}

function DayDots({ events }) {
  if (events.length === 0) return null;
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {events.slice(0, 3).map((event) => (
        <span
          key={event.id}
          className={`h-1.5 w-1.5 rounded-full ${event.kind === "share_expires" ? "bg-status-warning" : "bg-text-muted"}`}
        />
      ))}
      {events.length > 3 ? (
        <span className="text-[11px] font-semibold leading-none text-text-muted">+{events.length - 3}</span>
      ) : null}
    </span>
  );
}

function DayTile({ cell, isOpen, tabbable, buttonRef, onClick, onFocus, onKeyDown }) {
  const label = cell.spans.find((span) => span.showLabel) ?? null;
  const allPast = cell.spans.length > 0 && cell.spans.every((span) => span.isPast);
  return (
    <button
      ref={buttonRef}
      type="button"
      data-calendar-day=""
      tabIndex={tabbable ? 0 : -1}
      aria-label={dayLabel(cell)}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      onClick={onClick}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      className={[
        "relative flex h-full min-h-[56px] w-full flex-col overflow-hidden rounded-[10px] p-1.5 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary",
        isOpen ? "border border-secondary bg-secondary/15" : "frame-tile hover:bg-text-primary/5",
        cell.isToday ? "outline-dashed outline-[1.5px] outline-offset-[-3px] outline-secondary" : "",
      ].join(" ")}
    >
      <span className="flex items-center justify-between gap-1">
        <span className={`text-[11px] font-semibold tabular-nums ${cell.inMonth ? "text-text-primary" : "text-text-muted"}`}>
          {cell.dayOfMonth}
        </span>
        <DayDots events={cell.events} />
      </span>
      {label ? <span className="mt-auto truncate pb-1 text-[11px] leading-[13px] text-text-primary">{label.placeLabel}</span> : null}
      {cell.spans.length > 0 ? (
        <span aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-[3px] bg-secondary ${allPast ? "opacity-45" : ""}`} />
      ) : null}
    </button>
  );
}

/**
 * Month calendar of trips (bars) and client activity (dots). Clicking a day
 * opens its details; their actions call `onOpenTrip(tripId, tripTitle, clientName)`.
 * Keyboard: arrows move by day/week, Home/End jump to the week's edges,
 * PageUp/PageDown change month, Enter/Space opens a day, Escape closes it.
 */
export default function AgencyCalendar({ agencyId, onOpenTrip }) {
  const titleId = useId();
  const sectionRef = useRef(null);
  const buttonRefs = useRef(new Map());
  const focusAfterRenderRef = useRef(false);
  const isNarrow = useIsNarrow();

  const [today] = useState(() => new Date());
  const todayKey = toDateKey(today);
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [focusKey, setFocusKey] = useState(todayKey);
  const [openKey, setOpenKey] = useState(null);

  const { data, error, isLoading, refetch } = useCalendarEvents({ agencyId, month });
  const cells = useMemo(() => buildCalendarDays(data, month, today), [data, month, today]);
  const weeks = [0, 1, 2, 3, 4, 5].map((week) => cells.slice(week * 7, week * 7 + 7));
  const activeFocusKey = cells.some((cell) => cell.key === focusKey) ? focusKey : toDateKey(month);
  const openCell = openKey ? cells.find((cell) => cell.key === openKey) ?? null : null;

  // Move DOM focus only after keyboard navigation or closing a popover.
  useEffect(() => {
    if (!focusAfterRenderRef.current) return;
    focusAfterRenderRef.current = false;
    buttonRefs.current.get(activeFocusKey)?.focus();
  });

  useEffect(() => {
    if (!openKey || isNarrow) return undefined;
    function handlePointerDown(event) {
      const target = event.target;
      if (target.closest?.("[data-calendar-popover]") || target.closest?.("[data-calendar-day]")) return;
      setOpenKey(null);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openKey, isNarrow]);

  function showMonth(date) {
    setMonth(startOfMonth(date));
    setOpenKey(null);
  }

  function moveFocus(nextDate) {
    if (!sameMonth(nextDate, month)) showMonth(nextDate);
    focusAfterRenderRef.current = true;
    setFocusKey(toDateKey(nextDate));
  }

  function handleDayKeyDown(event, cell) {
    // Escape also closes an open popover while focus is back on a day tile.
    if (event.key === "Escape" && openKey) {
      event.preventDefault();
      setOpenKey(null);
      return;
    }
    let next = null;
    if (KEY_STEPS[event.key] !== undefined) {
      next = addDays(cell.date, KEY_STEPS[event.key]);
    } else if (event.key === "Home") {
      next = addDays(cell.date, -cell.date.getDay());
    } else if (event.key === "End") {
      next = addDays(cell.date, 6 - cell.date.getDay());
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      const target = addMonths(cell.date, event.key === "PageUp" ? -1 : 1);
      const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
      next = new Date(target.getFullYear(), target.getMonth(), Math.min(cell.date.getDate(), lastDay));
    }
    if (!next) return;
    event.preventDefault();
    moveFocus(next);
  }

  function closePopover({ restoreFocus = false } = {}) {
    const key = openKey;
    setOpenKey(null);
    if (restoreFocus && key) {
      focusAfterRenderRef.current = true;
      setFocusKey(key);
    }
  }

  function handleAction(item) {
    setOpenKey(null);
    onOpenTrip?.(item.tripId, item.tripTitle, item.clientName);
  }

  const undated = data?.tripsWithoutDates ?? 0;

  return (
    <section ref={sectionRef} aria-labelledby={titleId} className="frame-tile relative rounded-[20px] p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id={titleId} className="font-sans text-[15px] font-semibold tracking-normal text-text-primary">
          {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
        </h2>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous month" onClick={() => showMonth(addMonths(month, -1))} className={NAV_BUTTON}>
            <ChevronIcon direction="left" />
          </button>
          <button
            type="button"
            onClick={() => {
              showMonth(today);
              setFocusKey(todayKey);
            }}
            className="frame-tile min-h-9 rounded-full px-3 text-[12px] font-semibold text-text-primary hover:bg-text-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
          >
            Today
          </button>
          <button type="button" aria-label="Next month" onClick={() => showMonth(addMonths(month, 1))} className={NAV_BUTTON}>
            <ChevronIcon direction="right" />
          </button>
        </div>
      </div>

      <div role="grid" aria-labelledby={titleId} aria-busy={isLoading && !data ? "true" : undefined} className="mt-3 flex flex-col gap-1">
        <div role="row" className="grid grid-cols-7 gap-1">
          {WEEKDAY_SHORT.map((label, index) => (
            <div key={label} role="columnheader" aria-label={WEEKDAY_NAMES[index]} className="px-1 text-[11px] font-semibold text-text-muted">
              {label}
            </div>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} role="row" className="grid grid-cols-7 gap-1">
            {week.map((cell) => (
              <div key={cell.key} role="gridcell" aria-selected={openKey === cell.key}>
                <DayTile
                  cell={cell}
                  isOpen={openKey === cell.key}
                  tabbable={cell.key === activeFocusKey}
                  buttonRef={(element) => {
                    if (element) buttonRefs.current.set(cell.key, element);
                    else buttonRefs.current.delete(cell.key);
                  }}
                  onClick={() => setOpenKey((current) => (current === cell.key ? null : cell.key))}
                  onFocus={() => setFocusKey(cell.key)}
                  onKeyDown={(event) => handleDayKeyDown(event, cell)}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-[3px] w-3 rounded-full bg-secondary" />
          Trip
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-status-warning" />
          Link expiry
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-text-muted" />
          Client activity
        </span>
      </div>

      {undated > 0 ? (
        <p className="mt-1 text-[12px] text-text-muted">
          {undated === 1 ? "1 trip doesn't" : `${undated} trips don't`} have travel dates yet
        </p>
      ) : null}

      {error ? (
        <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-text-muted">
          <span>Couldn&rsquo;t load the calendar.</span>
          <button
            type="button"
            onClick={refetch}
            className="rounded font-semibold text-secondary-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
          >
            Retry
          </button>
        </div>
      ) : null}

      {openCell ? (
        <CalendarDayPopover
          cell={openCell}
          todayKey={todayKey}
          inline={isNarrow}
          anchorEl={buttonRefs.current.get(openCell.key) ?? null}
          containerEl={sectionRef.current}
          onClose={closePopover}
          onAction={handleAction}
        />
      ) : null}
    </section>
  );
}
