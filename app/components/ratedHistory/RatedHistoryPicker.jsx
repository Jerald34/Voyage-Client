"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import EmptyRatedState from "./EmptyRatedState.jsx";
// RatedTripList is owned by Stage 4B (parallel task).
// The import path is correct; the file may not exist during development.
import RatedTripList from "./RatedTripList.jsx";

/**
 * @typedef {Object} RatedTripSummary
 * @property {string}      tripId
 * @property {string}      title
 * @property {string|null} destinationSummary
 * @property {number}      dayCount
 * @property {string|null} startDate
 * @property {string|null} endDate
 * @property {number}      rating           - latest TripReview.rating (1–5)
 * @property {string}      ratedAt          - ISO datetime string
 */

/**
 * @typedef {{ kind?: 'item'|'day'|'segment', itemIds?: string[], dayIds?: string[] }} ReuseSelection
 */

/**
 * RatedHistoryPicker — Stage 4A
 *
 * Side-panel container for the Rated Itinerary Reuse feature (spec §7.1).
 *
 * Owns state for:
 *   - Filter values (destination, durationDays, season) — initialised from
 *     `currentTrip.destinationSummary`.
 *   - Which trip is currently expanded (expandedTripId).
 *   - Multi-select state (selection) — passed down to RatedTripList.
 *
 * Real data fetching lands in Stage 5A (useRatedHistory hook). For now, trip
 * data is accepted via the optional `trips` prop; when omitted the empty state
 * is shown. This matches the fixture-data-driven development approach used
 * across the codebase.
 *
 * Layout:
 *   - Desktop (≥ 768px): 440px fixed right-edge panel, full viewport height.
 *   - Mobile (< 768px): full-width bottom drawer.
 *
 * Animation:
 *   - Panel: 320ms cubic-bezier(0.4, 0, 0.2, 1) slide from right.
 *   - Backdrop: 200ms opacity fade.
 *   - Reduced-motion: globals.css @media rule already strips transform globally.
 *     An additional inline <style> targets [data-reduced-motion-fallback] so
 *     the opacity transition (200ms) remains even if the transform override
 *     fires before the component's own style tag is parsed.
 *
 * A11y:
 *   - role="dialog", aria-modal="true", aria-labelledby → header title id.
 *   - Focus moved into panel on open; restored to prior active element on close.
 *   - Tab / Shift+Tab cycle trapped within the panel.
 *   - Escape key closes.
 *
 * @param {Object}   props
 * @param {boolean}  props.isOpen
 * @param {()=>void} props.onClose
 * @param {{ destinationSummary: string|null }|null} [props.currentTrip]
 * @param {string|null} [props.defaultDestinationFilter] - Pre-seeds the destination chip on
 *   mount/open as a clearable chip, exactly as if the user had typed it. When null/empty the
 *   chip starts in the empty "+ Add destination" state. Has no effect if the filter has already
 *   been set by the user.
 * @param {'editor'|'clientItinerary'|'slash'} [props.mode]
 * @param {string}   props.agencyId
 * @param {RatedTripSummary[]} [props.trips]        - Omit → empty state; provide → render list.
 * @param {boolean}  [props.isLoading]              - When true, shows a loading skeleton in the trip-list area.
 * @param {(payload: object) => void} [props.onConfirmInsertions] - Slot for Stage 5B/6C.
 */
export default function RatedHistoryPicker({
  isOpen,
  onClose,
  currentTrip = null,
  defaultDestinationFilter = null,
  mode = "editor",
  agencyId,
  trips,
  isLoading = false,
  onConfirmInsertions,
}) {
  /* ─────────────────────────────────────────────────────────────
     Filter state
     Destination is seeded from `defaultDestinationFilter` (a clearable
     chip the user can clear, exactly as if they had typed it). Falls back
     to currentTrip.destinationSummary for backwards compat, then "".
     Re-syncs if defaultDestinationFilter changes (e.g. picker reused
     across trips).
  ──────────────────────────────────────────────────────────────── */
  const [destination, setDestination] = useState(
    defaultDestinationFilter ?? currentTrip?.destinationSummary ?? ""
  );
  const [durationDays, setDurationDays] = useState(/** @type {number|undefined} */ (undefined));
  const [season, setSeason] = useState(/** @type {string|undefined} */ (undefined));

  useEffect(() => {
    setDestination(defaultDestinationFilter ?? currentTrip?.destinationSummary ?? "");
  }, [defaultDestinationFilter, currentTrip?.destinationSummary]);

  // "Show all rated" clears the destination filter.
  const handleShowAll = useCallback(() => setDestination(""), []);

  /* ─────────────────────────────────────────────────────────────
     Picker-internal state (passed to RatedTripList)
  ──────────────────────────────────────────────────────────────── */
  const [expandedTripId, setExpandedTripId] = useState(/** @type {string|null} */ (null));
  const [selection, setSelection] = useState(/** @type {ReuseSelection} */ ({}));

  const handleTripToggle = useCallback((tripId) => {
    setExpandedTripId((prev) => (prev === tripId ? null : tripId));
    // Reset selection when changing expanded trip.
    setSelection({});
  }, []);

  const handleSelectionChange = useCallback((next) => {
    setSelection(next);
  }, []);

  /* ─────────────────────────────────────────────────────────────
     A11y — focus management
     Capture active element on open; restore on close.
  ──────────────────────────────────────────────────────────────── */
  const dialogRef = useRef(/** @type {HTMLDivElement|null} */ (null));
  const priorFocusRef = useRef(/** @type {Element|null} */ (null));

  useEffect(() => {
    if (isOpen) {
      priorFocusRef.current = document.activeElement;
      // Move focus into panel on next paint so CSS transition has begun.
      const raf = requestAnimationFrame(() => {
        const el = dialogRef.current;
        if (!el) return;
        const first = el.querySelector(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        /** @type {HTMLElement|null} */ (first)?.focus();
      });
      return () => cancelAnimationFrame(raf);
    } else {
      /** @type {HTMLElement|null} */ (priorFocusRef.current)?.focus?.();
    }
  }, [isOpen]);

  /* ─────────────────────────────────────────────────────────────
     A11y — Escape key
  ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  /* ─────────────────────────────────────────────────────────────
     A11y — Focus trap
     Tab / Shift+Tab cycle within the panel only.
  ──────────────────────────────────────────────────────────────── */
  const handleKeyDownTrap = useCallback((e) => {
    if (e.key !== "Tab") return;
    const el = dialogRef.current;
    if (!el) return;

    const focusables = Array.from(
      el.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        /** @type {HTMLElement} */ (last).focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        /** @type {HTMLElement} */ (first).focus();
      }
    }
  }, []);

  /* ─────────────────────────────────────────────────────────────
     Layout — mode determines panel shape
     editor / clientItinerary → fixed right-edge, full-height side panel
     slash → floating sheet anchored above the composer
  ──────────────────────────────────────────────────────────────── */
  const isSlash = mode === "slash";

  // Panel position classes (Tailwind).
  // Mobile: full-width, slides in from bottom.
  // Desktop (md+): 440px, slides in from right.
  const panelClasses = [
    "fixed z-50",
    "flex flex-col overflow-hidden",
    // Surface & border
    "bg-[var(--surface)] border border-[rgba(var(--color-border-rgb),0.12)]",
    isSlash
      ? [
          // Slash mode: floating sheet above composer
          "bottom-[72px] right-4",
          "w-[440px] max-w-[calc(100vw-2rem)]",
          "max-h-[60vh]",
          "rounded-3xl",
          "shadow-[0_16px_48px_rgba(0,0,0,0.18)]",
        ].join(" ")
      : [
          // Side-panel mode: right edge, full height
          // On mobile (<md) the panel becomes a bottom drawer (full-width, rounded top corners).
          "top-0 right-0 bottom-0",
          "w-full md:w-[440px]",
          "rounded-l-[28px] md:rounded-l-[28px]",
          "shadow-[0_0_64px_rgba(0,0,0,0.14)]",
        ].join(" "),
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  /* ─────────────────────────────────────────────────────────────
     Animation — inline style controls transform & opacity.
     The globals.css @media (prefers-reduced-motion: reduce) rule
     overrides transform: none globally, so the slide effectively
     degrades to opacity-only. The [data-reduced-motion-fallback]
     selector below reinforces this within the component.
  ──────────────────────────────────────────────────────────────── */
  const panelStyle = {
    transition: isOpen
      ? "transform 320ms cubic-bezier(0.4, 0, 0.2, 1), opacity 320ms cubic-bezier(0.4, 0, 0.2, 1)"
      : "transform 320ms cubic-bezier(0.4, 0, 0.2, 1), opacity 320ms cubic-bezier(0.4, 0, 0.2, 1)",
    transform: isOpen
      ? "translateX(0)"
      : isSlash
      ? "translateY(12px)"
      : "translateX(100%)",
    opacity: isOpen ? 1 : 0,
    // Prevent interaction while hidden (Esc handler is already gated on isOpen).
    pointerEvents: isOpen ? "auto" : "none",
  };

  const backdropStyle = {
    transition: "opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)",
    opacity: isOpen ? 1 : 0,
    pointerEvents: isOpen ? "auto" : "none",
  };

  /* ─────────────────────────────────────────────────────────────
     Derived values
  ──────────────────────────────────────────────────────────────── */
  const tripCount = Array.isArray(trips) ? trips.length : 0;
  const hasTrips = Array.isArray(trips) && trips.length > 0;
  // trips undefined → not yet provided (empty state); trips [] → fetched empty.
  const showEmptyState = !hasTrips;
  // True when the caller provided trips but the active destination filter
  // removed all of them — so the user should be nudged to clear the filter.
  const hasFilteredAway =
    Array.isArray(trips) && trips.length === 0 && destination.trim().length > 0;

  /* ─────────────────────────────────────────────────────────────
     Duration options per spec §7.1.
     "10+" stores as numeric 10 — a UI-level alias:
       server interprets durationDays=10 as duration >= 10 days.
       This simplification is not in the spec; documented here as a
       v1 UI alias. See: useRatedHistory filter docs in Stage 5A.
  ──────────────────────────────────────────────────────────────── */
  const DURATION_OPTIONS = [
    { label: "Any length", value: undefined },
    { label: "3 days", value: 3 },
    { label: "5 days", value: 5 },
    { label: "7 days", value: 7 },
    // "10+" is a UI alias: sends durationDays=10 to the server;
    // the server list endpoint interprets this as duration >= 10.
    { label: "10+ days", value: 10 },
  ];

  const SEASON_OPTIONS = [
    { label: "Any season", value: undefined },
    { label: "Spring", value: "spring" },
    { label: "Summer", value: "summer" },
    { label: "Fall", value: "fall" },
    { label: "Winter", value: "winter" },
  ];

  /* ─────────────────────────────────────────────────────────────
     Chip style helpers
  ──────────────────────────────────────────────────────────────── */
  const chipBase = {
    active: {
      background: "rgba(var(--color-secondary-rgb), 0.10)",
      borderColor: "rgba(var(--color-secondary-rgb), 0.35)",
    },
    inactive: {
      background: "rgba(var(--color-text-rgb), 0.05)",
      borderColor: "rgba(var(--color-border-rgb), 0.15)",
    },
  };

  return (
    <>
      {/* ── Backdrop (editor / clientItinerary only; no backdrop in slash mode) ── */}
      {!isSlash && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
          style={backdropStyle}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* ── Panel ── */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rated-history-title"
        className={panelClasses}
        style={panelStyle}
        onKeyDown={handleKeyDownTrap}
        data-reduced-motion-fallback=""
      >
        {/* ── Header ── */}
        <header className="flex-shrink-0 px-6 py-4 border-b border-[rgba(var(--color-border-rgb),0.08)] flex flex-col gap-3">
          {/* Title row */}
          <div className="flex items-center justify-between gap-3">
            <h2
              id="rated-history-title"
              className="m-0 text-[18px] font-semibold tracking-tight leading-snug"
              style={{ color: "rgb(var(--color-text-rgb))" }}
            >
              Rated history
            </h2>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close rated history picker"
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-200 cursor-pointer border-none flex-shrink-0"
              style={{
                background: "rgba(var(--color-text-rgb), 0.07)",
                color: "rgb(var(--color-text-muted-rgb))",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(var(--color-text-rgb), 0.13)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(var(--color-text-rgb), 0.07)")
              }
            >
              {/* × icon */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <line
                  x1="3"
                  y1="3"
                  x2="13"
                  y2="13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="13"
                  y1="3"
                  x2="3"
                  y2="13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* ── Filter chip row ── */}
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filters"
          >
            {/* Destination chip
                - When filled: shows value as a chip with a small × to clear.
                  Alongside it: "Show all rated" pill to explicitly clear.
                - When empty: shows "+ Add destination" pill (inline input reveals on click).
            */}
            <DestinationChip
              value={destination}
              onChange={setDestination}
              onShowAll={handleShowAll}
              chipBase={chipBase}
            />

            {/* Duration chip — dropdown */}
            <select
              value={durationDays ?? ""}
              onChange={(e) =>
                setDurationDays(e.target.value !== "" ? Number(e.target.value) : undefined)
              }
              aria-label="Filter by duration"
              className="text-[13px] h-7 px-3 rounded-full border outline-none cursor-pointer transition-all duration-200 appearance-none"
              style={{
                ...(durationDays !== undefined ? chipBase.active : chipBase.inactive),
                color: "rgb(var(--color-text-rgb))",
              }}
            >
              {DURATION_OPTIONS.map(({ label, value }) => (
                <option key={label} value={value ?? ""}>
                  {label}
                </option>
              ))}
            </select>

            {/* Season chip — dropdown */}
            <select
              value={season ?? ""}
              onChange={(e) => setSeason(e.target.value || undefined)}
              aria-label="Filter by season"
              className="text-[13px] h-7 px-3 rounded-full border outline-none cursor-pointer transition-all duration-200 appearance-none"
              style={{
                ...(season !== undefined ? chipBase.active : chipBase.inactive),
                color: "rgb(var(--color-text-rgb))",
              }}
            >
              {SEASON_OPTIONS.map(({ label, value }) => (
                <option key={label} value={value ?? ""}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* ── Body (scrollable) ── */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ overscrollBehavior: "contain" }}
        >
          {isLoading ? (
            <div
              role="status"
              aria-label="Loading rated trips"
              className="flex flex-col gap-3 px-4 py-5"
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-[10px] animate-pulse"
                  style={{ background: "rgba(var(--color-text-rgb), 0.07)" }}
                />
              ))}
              <span className="sr-only">Loading…</span>
            </div>
          ) : showEmptyState ? (
            <EmptyRatedState hasFilteredAway={hasFilteredAway} />
          ) : (
            <RatedTripList
              trips={trips}
              expandedTripId={expandedTripId}
              onTripToggle={handleTripToggle}
              selection={selection}
              onSelectionChange={handleSelectionChange}
            />
          )}
        </div>

        {/* ── Slash-mode confirm bar (Stage 6C) ──
            When mode === "slash" AND a selection is present (item/day/segment
            with ≥1 id), render a sticky bar above the standard footer giving
            click-confirm access to insertion. The drag-first row UI in the
            picker tree is unchanged; this bar is purely additive.
        */}
        {isSlash && hasSlashSelection(selection) && (
          <SlashConfirmBar
            selection={selection}
            onConfirm={(comment) => {
              if (typeof onConfirmInsertions === "function") {
                onConfirmInsertions(selection, { comment });
              }
              onClose();
            }}
          />
        )}

        {/* ── Footer ── */}
        <footer
          className="flex-shrink-0 px-6 py-3 border-t border-[rgba(var(--color-border-rgb),0.08)] flex items-center justify-between"
          style={{ color: "rgb(var(--color-text-soft-rgb))" }}
        >
          <span className="text-[12px]">
            {tripCount === 0
              ? "No trips available"
              : `${tripCount} rated trip${tripCount === 1 ? "" : "s"}`}
          </span>

          <button
            type="button"
            onClick={onClose}
            className="text-[13px] h-7 px-4 rounded-full border cursor-pointer transition-all duration-200 font-medium"
            style={{
              background: "transparent",
              borderColor: "rgba(var(--color-border-rgb), 0.20)",
              color: "rgb(var(--color-text-soft-rgb))",
            }}
          >
            Close
          </button>
        </footer>
      </div>

      {/*
        Reduced-motion reinforcement.
        globals.css already sets transform:none on prefers-reduced-motion:reduce
        globally (line 428+). This inline <style> ensures the opacity fade
        (200ms) remains even after the global rule strips the transform.
        Without this, the panel would snap in/out with no transition at all
        under reduced-motion preference.
      */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          [data-reduced-motion-fallback] {
            transition: opacity 200ms ease !important;
            transform: none !important;
          }
        }
      `}</style>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DestinationChip — sub-component
   Encapsulates the destination filter chip pattern:
     • Filled: displays value as a chip with inline × button + "Show all rated" pill
     • Empty: displays an "+ Add destination" pill that becomes an input on click
─────────────────────────────────────────────────────────────────────────────── */

/**
 * @param {{ value: string, onChange: (v:string)=>void, onShowAll: ()=>void, chipBase: object }} props
 */
function DestinationChip({ value, onChange, onShowAll, chipBase }) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(/** @type {HTMLInputElement|null} */ (null));

  // When the user clicks the "+ Add destination" pill, activate the input.
  const handleAddClick = () => {
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleBlur = () => {
    // Collapse to pill if the value is still empty.
    if (!value.trim()) setEditing(false);
  };

  const handleClear = () => {
    onChange("");
    setEditing(false);
  };

  if (value) {
    // Destination is set — show filled chip with × + "Show all rated" pill.
    return (
      <>
        <div
          className="flex items-center h-7 pl-3 pr-1 gap-1.5 rounded-full border text-[13px]"
          style={{
            ...chipBase.active,
            color: "rgb(var(--color-text-rgb))",
          }}
        >
          <span className="max-w-[120px] truncate">{value}</span>
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear destination filter"
            className="w-4 h-4 flex items-center justify-center rounded-full cursor-pointer border-none p-0"
            style={{
              background: "rgba(var(--color-text-rgb), 0.10)",
              color: "rgb(var(--color-text-soft-rgb))",
            }}
          >
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="none"
              aria-hidden="true"
            >
              <line
                x1="1"
                y1="1"
                x2="7"
                y2="7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="7"
                y1="1"
                x2="1"
                y2="7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* "Show all rated" mini-toggle */}
        <button
          type="button"
          onClick={onShowAll}
          className="text-[12px] h-7 px-3 rounded-full border cursor-pointer transition-all duration-200 font-medium"
          style={{
            background: "transparent",
            borderColor: "rgba(var(--color-border-rgb), 0.20)",
            color: "rgb(var(--color-text-soft-rgb))",
          }}
        >
          Show all rated
        </button>
      </>
    );
  }

  if (editing) {
    // Input mode — user is typing a destination.
    return (
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="Destination…"
          aria-label="Filter by destination"
          className="text-[13px] h-7 pl-3 pr-3 rounded-full border outline-none transition-all duration-200"
          style={{
            ...chipBase.inactive,
            color: "rgb(var(--color-text-rgb))",
            width: "140px",
          }}
          // Pressing Escape while editing collapses the input without setting a value.
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation(); // prevent panel-close handler from firing
              setEditing(false);
            }
            if (e.key === "Enter") {
              e.preventDefault();
              if (!value.trim()) setEditing(false);
            }
          }}
        />
      </div>
    );
  }

  // Default: empty pill — shows "+ Add destination".
  return (
    <button
      type="button"
      onClick={handleAddClick}
      aria-label="Add destination filter"
      className="text-[13px] h-7 px-3 rounded-full border cursor-pointer transition-all duration-200"
      style={{
        ...chipBase.inactive,
        color: "rgb(var(--color-text-soft-rgb))",
      }}
    >
      + Add destination
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Stage 6C — Slash-mode selection helpers + confirm bar
─────────────────────────────────────────────────────────────────────────────── */

/**
 * True when the selection has at least one targetable id for its kind.
 */
function hasSlashSelection(selection) {
  if (!selection || !selection.kind) return false;
  if (selection.kind === "item") {
    return Array.isArray(selection.itemIds) && selection.itemIds.length > 0;
  }
  if (selection.kind === "day" || selection.kind === "segment") {
    return Array.isArray(selection.dayIds) && selection.dayIds.length > 0;
  }
  return false;
}

function describeSelection(selection) {
  if (!selection) return "";
  if (selection.kind === "item") {
    const n = selection.itemIds?.length ?? 0;
    return `${n} item${n === 1 ? "" : "s"} selected`;
  }
  if (selection.kind === "day") {
    const n = selection.dayIds?.length ?? 0;
    return `${n} day${n === 1 ? "" : "s"} selected`;
  }
  if (selection.kind === "segment") {
    const n = selection.dayIds?.length ?? 0;
    return `${n}-day segment selected`;
  }
  return "Selection ready";
}

/**
 * Sticky bar above the picker footer that turns the (drag-first) selection UI
 * into a click-confirm flow for the slash-command entry point. Includes an
 * optional "Add a note" input whose value is forwarded to onConfirm.
 */
function SlashConfirmBar({ selection, onConfirm }) {
  const [comment, setComment] = useState("");

  return (
    <div
      className="flex-shrink-0 px-6 py-3 border-t border-[rgba(var(--color-border-rgb),0.08)] flex flex-col gap-2"
      style={{ background: "rgba(var(--color-secondary-rgb), 0.05)" }}
      data-testid="slash-confirm-bar"
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className="text-[13px] font-medium"
          style={{ color: "rgb(var(--color-text-rgb))" }}
        >
          {describeSelection(selection)}
        </span>
        <button
          type="button"
          onClick={() => onConfirm(comment)}
          data-testid="slash-confirm-button"
          className="text-[13px] h-8 px-4 rounded-full cursor-pointer border-none font-semibold"
          style={{
            background: "rgb(var(--color-secondary-rgb))",
            color: "rgb(var(--color-on-secondary-rgb), 1)",
          }}
        >
          Add to this trip
        </button>
      </div>
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a note (optional)"
        aria-label="Add a note for this insertion"
        className="text-[13px] h-8 px-3 rounded-full border outline-none w-full"
        style={{
          background: "rgb(var(--color-surface-rgb))",
          borderColor: "rgba(var(--color-border-rgb), 0.18)",
          color: "rgb(var(--color-text-rgb))",
        }}
      />
    </div>
  );
}
