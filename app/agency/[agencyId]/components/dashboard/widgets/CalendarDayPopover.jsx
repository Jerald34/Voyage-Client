"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import KindIcon from "./KindIcon";
import { describeDayItems, fullDayLabel, relativeDayLabel } from "@/app/lib/calendarDays";

const KIND_BADGE = {
  trip: "bg-secondary/15 text-secondary-strong",
  share_expires: "bg-status-warning/15 text-status-warning",
};
const DEFAULT_BADGE = "bg-text-muted/15 text-text-muted";
/** Buttons dip to 97% while pressed. `scale` is the property Tailwind's scale utilities set, so it must be the one transitioned. */
const PRESS = "transition-[color,background-color,scale] duration-150 ease-out active:scale-[0.97]";

/**
 * A calendar day's details. Floats beside the day inside the calendar card
 * (flipping left near the right edge) or, on narrow screens, sits inline
 * under the grid. Focus moves to the first action (the close button on an
 * empty day). Escape and the close button call `onClose({ restoreFocus: true })`.
 */
export default function CalendarDayPopover({ cell, todayKey, anchorEl, containerEl, inline = false, onClose, onAction }) {
  const titleId = useId();
  const itemIdPrefix = useId();
  const ref = useRef(null);
  const [position, setPosition] = useState(null);
  const items = describeDayItems(cell);

  // Beside the day, or flipped/shifted to stay inside the card. Keeps the old
  // object when nothing moved so a resize observer can't cause a render loop.
  const place = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    let next = { left: 8, top: 8 };
    if (anchorEl && containerEl) {
      const box = containerEl.getBoundingClientRect();
      const anchor = anchorEl.getBoundingClientRect();
      const { offsetWidth: width, offsetHeight: height } = node;
      let left = anchor.right - box.left + 8;
      if (left + width > box.width - 4) left = Math.max(4, anchor.left - box.left - width - 8);
      let top = anchor.top - box.top;
      if (top + height > box.height - 4) top = Math.max(4, box.height - height - 4);
      next = { left, top };
    }
    setPosition((current) => (current && current.left === next.left && current.top === next.top ? current : next));
  }, [anchorEl, containerEl]);

  useLayoutEffect(() => {
    if (!inline) place();
  }, [inline, place, cell.key]);

  // Keep it in place when the window resizes or its own content changes size.
  useEffect(() => {
    if (inline) return undefined;
    window.addEventListener("resize", place);
    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(place);
      if (ref.current) observer.observe(ref.current);
      if (containerEl) observer.observe(containerEl);
    }
    return () => {
      window.removeEventListener("resize", place);
      observer?.disconnect();
    };
  }, [inline, place, containerEl]);

  // The floating popover stays visibility:hidden until it is positioned, and a
  // hidden element can't take focus, so wait for the position (once per day).
  const ready = inline || position !== null;
  useEffect(() => {
    if (!ready) return;
    ref.current?.querySelector("[data-autofocus]")?.focus();
  }, [cell.key, ready]);

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose({ restoreFocus: true });
    }
  }

  const title = cell.isToday ? "Today" : fullDayLabel(cell.date);
  const subtitle = cell.isToday ? fullDayLabel(cell.date) : relativeDayLabel(cell.key, todayKey);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby={titleId}
      data-calendar-popover=""
      onKeyDown={handleKeyDown}
      className={
        inline
          ? "frame-tile mt-3 rounded-[16px] p-3"
          : // Capped at the calendar card (its positioned parent) so place() can always fit it; the list scrolls.
            "frame-popover frame-pop-in absolute z-30 flex max-h-[calc(100%-8px)] w-[260px] flex-col rounded-[16px] p-3"
      }
      style={
        inline
          ? undefined
          : { left: position?.left ?? 0, top: position?.top ?? 0, visibility: position ? "visible" : "hidden" }
      }
    >
      <div className="flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p id={titleId} className="text-[13px] font-semibold text-text-primary">
            {title}
          </p>
          <p className="text-[12px] text-text-muted">{subtitle}</p>
        </div>
        <button
          type="button"
          aria-label="Close"
          data-autofocus={items.length === 0 ? "" : undefined}
          onClick={() => onClose({ restoreFocus: true })}
          className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-text-muted pointer-coarse:h-11 pointer-coarse:w-11 hover:bg-text-primary/5 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${PRESS}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {items.length === 0 ? (
        <p className="mt-2 text-[12px] text-text-muted">Nothing on this day.</p>
      ) : (
        <ul className="mt-2 min-h-0 flex-1 divide-y divide-[color:var(--frame-border)] overflow-y-auto overscroll-contain">
          {items.map((item, index) => (
            <li key={item.key} className="flex gap-2 py-2">
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full ${KIND_BADGE[item.kind] ?? DEFAULT_BADGE}`}
              >
                <KindIcon kind={item.kind} className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p id={`${itemIdPrefix}-${index}`} className="text-[13px] font-semibold leading-snug text-text-primary">
                  {item.title}
                </p>
                {item.detail ? <p className="text-[12px] text-text-muted">{item.detail}</p> : null}
                <button
                  type="button"
                  data-autofocus={index === 0 ? "" : undefined}
                  aria-describedby={`${itemIdPrefix}-${index}`}
                  onClick={() => onAction(item)}
                  className={`mt-1 min-h-8 pointer-coarse:min-h-11 rounded text-[12px] font-semibold text-secondary-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${PRESS}`}
                >
                  {item.actionLabel} <span aria-hidden="true">→</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
