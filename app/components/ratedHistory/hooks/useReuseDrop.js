"use client";

/**
 * useReuseDrop — Stage 5B
 *
 * Owns the drop-target side of the Rated Itinerary Reuse feature (spec §3 / §7.2).
 * Wires drop zones onto two distinct surfaces (the page-style canvas at
 * `ItineraryCanvas` and the floating draggable card at `ItineraryDraftPanel`)
 * and brokers the `POST /trips/:tripId/itinerary/insert-from-rated` call with
 * full error→toast mapping plus a keyboard fallback.
 *
 * Toast surface
 * ─────────────
 * The client doesn't yet have a real toast utility (only `sessionStorage` flag
 * hand-offs in `TeamPage.jsx`). Stage 7 polishes this; for v1 we use a tiny
 * inline `emitToast()` that:
 *   1. Logs `console.warn("[reuse-drop] {message}")` so it's visible in dev.
 *   2. Calls `onError(code, message)` so consumers can render their own surface.
 * A `<Toaster />`-style component will subsume this in Stage 7.
 *
 * Hook API
 * ────────
 *   const {
 *     registerCanvas,        // (ref) => void
 *     registerPanel,         // (ref, { onDockModeChange }) => void
 *     isDragging,            // boolean — true while a valid drag is over a surface
 *     getKeyboardTargets,    // (payload) => Array<{ dayIndex, position?, label }>
 *     moveTo,                // (payload, target) => Promise<void>
 *   } = useReuseDrop({
 *     targetTripId,
 *     targetItineraryId,
 *     currentVersion,
 *     targetItinerary,       // optional — synchronous source for getKeyboardTargets
 *     onInserted,            // (updatedItinerary, advisory?) => void
 *     onError,               // (errorCode, message) => void
 *     onStaleVersion,        // () => void
 *     onSourceDeleted,       // (sourceTripId) => void
 *   });
 *
 * Drop-zone semantics
 * ───────────────────
 * Each registered surface exposes three kinds of zones:
 *   • BETWEEN day panels (gap zones)              — valid for kind: day | segment
 *   • INSIDE a day panel, between items           — valid for kind: item
 *   • ON a day panel header (append to end)       — valid for kind: item
 *
 * Day panels and item rows are discovered at drop time via DOM attributes:
 *   • `[data-reuse-day]`     on the day panel root (value is the day index)
 *   • `[data-reuse-day-header]` on the header (item drags only)
 *   • `[data-reuse-item]`    on each item row (value is the sortOrder)
 * The hook does NOT walk arbitrary DOM — surfaces opt in by tagging their
 * children. `ItineraryCanvas` and `ItineraryDraftPanel` add these in this stage.
 *
 * Animation
 * ─────────
 * After a successful insertion the hook returns an opaque list of inserted-id
 * hints in the callback; the caller is responsible for adding the
 * `reuse-inserted-glow` class to those DOM nodes. The CSS for that class is
 * declared in this file as an injected `<style>` tag so consumers don't need
 * to remember to import a stylesheet.
 *
 * Cancel handling
 * ───────────────
 * `dragleave` clears the highlight after an 80 ms grace window (fast cursor
 * movement between adjacent child elements wouldn't otherwise be smooth).
 * A native `dragend` on the source clears state immediately.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL } from "../../../lib/api/client";

// ── Style injection (one-shot, browser only) ──────────────────────────────────

const GLOW_STYLE_ID = "voyage-reuse-inserted-glow";
const HIGHLIGHT_STYLE_ID = "voyage-reuse-highlight";

function ensureStylesInjected() {
  if (typeof document === "undefined") return;

  if (!document.getElementById(GLOW_STYLE_ID)) {
    const tag = document.createElement("style");
    tag.id = GLOW_STYLE_ID;
    tag.textContent = `
      .reuse-inserted-glow {
        background-color: var(--accent, rgba(215, 122, 97, 0.35));
        transition: background-color 1.2s ease-out;
      }
    `;
    document.head.appendChild(tag);
  }

  if (!document.getElementById(HIGHLIGHT_STYLE_ID)) {
    const tag = document.createElement("style");
    tag.id = HIGHLIGHT_STYLE_ID;
    tag.textContent = `
      .reuse-drop-highlight {
        position: absolute;
        left: 0;
        right: 0;
        height: 4px;
        background-color: var(--accent, rgba(215, 122, 97, 0.65));
        border-radius: 2px;
        pointer-events: none;
        z-index: 60;
        box-shadow: 0 0 8px var(--accent, rgba(215, 122, 97, 0.65));
      }
    `;
    document.head.appendChild(tag);
  }
}

// ── Toast fallback ────────────────────────────────────────────────────────────

/**
 * Emit a "toast" — currently console.warn + onError callback. A real toast
 * surface will land in Stage 7 (spec §7.2 polish). Until then this gives
 * tests + the parent component enough information to render a fallback.
 */
function emitToast(message, code, onError) {
  // eslint-disable-next-line no-console
  console.warn(`[reuse-drop] ${message}`);
  if (typeof onError === "function") onError(code, message);
}

// ── Drop-zone calculation ─────────────────────────────────────────────────────

/**
 * Inspect the registered DOM surface and the cursor's (x, y) to determine the
 * nearest valid drop zone for the given payload kind.
 *
 * Returns:
 *   { dayIndex, position?, anchor: HTMLElement, kind: 'between-days'|'between-items'|'day-header' }
 * or null when no valid zone is in range.
 *
 * Algorithm:
 *   1. Collect all `[data-reuse-day]` elements (in DOM order).
 *   2. For payload kind 'day' | 'segment':
 *      - Build "between-day" candidates: midpoint between consecutive day
 *        panels, plus one above the first and one below the last.
 *      - Pick the candidate whose midpoint Y is closest to cursorY (within a
 *        24 px tolerance).
 *   3. For payload kind 'item':
 *      - Find the day panel the cursor is currently over (by bounding box).
 *      - If cursor is over the header element of a day, return day-header zone
 *        with position = lastItem.sortOrder + 1.
 *      - Otherwise collect `[data-reuse-item]` inside that day, build
 *        between-item candidates, and pick the closest. Position is the
 *        sortOrder of the item AFTER the gap (so 0 means "before first item").
 */
function computeDropZone(surface, cursor, payloadKind) {
  if (!surface || typeof surface.querySelectorAll !== "function") return null;

  const dayEls = Array.from(surface.querySelectorAll("[data-reuse-day]"));
  if (dayEls.length === 0) return null;

  // ── Day-level drops (between day panels) ───────────────────────────────────
  if (payloadKind === "day" || payloadKind === "segment") {
    const candidates = [];
    dayEls.forEach((dayEl, i) => {
      const rect = dayEl.getBoundingClientRect();
      // Zone above this day (between previous and this one, or the very top)
      candidates.push({ y: rect.top, dayIndex: i, anchor: dayEl });
    });
    // Zone after the last day (end of itinerary)
    const lastRect = dayEls[dayEls.length - 1].getBoundingClientRect();
    candidates.push({
      y: lastRect.bottom,
      dayIndex: dayEls.length,
      anchor: dayEls[dayEls.length - 1],
    });

    let best = null;
    let bestDist = Infinity;
    for (const c of candidates) {
      const d = Math.abs(c.y - cursor.y);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    if (!best) return null;
    return {
      kind: "between-days",
      dayIndex: best.dayIndex,
      anchor: best.anchor,
      y: best.y,
    };
  }

  // ── Item-level drops ──────────────────────────────────────────────────────
  if (payloadKind === "item") {
    // Find the day panel whose bounding box contains cursor.y.
    let containingDay = null;
    let containingDayIndex = -1;
    for (let i = 0; i < dayEls.length; i++) {
      const rect = dayEls[i].getBoundingClientRect();
      if (cursor.y >= rect.top && cursor.y <= rect.bottom) {
        containingDay = dayEls[i];
        containingDayIndex = i;
        break;
      }
    }
    // Fallback: nearest day by midpoint
    if (!containingDay) {
      let bestDist = Infinity;
      for (let i = 0; i < dayEls.length; i++) {
        const rect = dayEls[i].getBoundingClientRect();
        const mid = (rect.top + rect.bottom) / 2;
        const d = Math.abs(mid - cursor.y);
        if (d < bestDist) {
          bestDist = d;
          containingDay = dayEls[i];
          containingDayIndex = i;
        }
      }
    }
    if (!containingDay) return null;

    // Check header
    const header = containingDay.querySelector("[data-reuse-day-header]");
    if (header) {
      const hRect = header.getBoundingClientRect();
      if (cursor.y >= hRect.top && cursor.y <= hRect.bottom) {
        // Append to end of day's items
        const itemEls = Array.from(
          containingDay.querySelectorAll("[data-reuse-item]")
        );
        const position = itemEls.length;
        return {
          kind: "day-header",
          dayIndex: containingDayIndex,
          position,
          anchor: header,
          y: hRect.bottom,
        };
      }
    }

    // Otherwise: between-item zones
    const itemEls = Array.from(
      containingDay.querySelectorAll("[data-reuse-item]")
    );

    if (itemEls.length === 0) {
      // No items in this day — drop inserts at position 0
      const dayRect = containingDay.getBoundingClientRect();
      return {
        kind: "between-items",
        dayIndex: containingDayIndex,
        position: 0,
        anchor: containingDay,
        y: dayRect.bottom - 4,
      };
    }

    const candidates = [];
    itemEls.forEach((itemEl, i) => {
      const rect = itemEl.getBoundingClientRect();
      candidates.push({ y: rect.top, position: i, anchor: itemEl });
    });
    const lastRect = itemEls[itemEls.length - 1].getBoundingClientRect();
    candidates.push({
      y: lastRect.bottom,
      position: itemEls.length,
      anchor: itemEls[itemEls.length - 1],
    });

    let best = null;
    let bestDist = Infinity;
    for (const c of candidates) {
      const d = Math.abs(c.y - cursor.y);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    if (!best) return null;
    return {
      kind: "between-items",
      dayIndex: containingDayIndex,
      position: best.position,
      anchor: best.anchor,
      y: best.y,
    };
  }

  return null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useReuseDrop({
  targetTripId,
  targetItineraryId,
  currentVersion,
  targetItinerary = null,
  onInserted,
  onError,
  onStaleVersion,
  onSourceDeleted,
}) {
  const [isDragging, setIsDragging] = useState(false);

  // Surface refs (one for each registered surface)
  const surfacesRef = useRef(
    /** @type {Array<{ el: HTMLElement, isPanel: boolean, onDockModeChange?: (b:boolean)=>void, highlightEl?: HTMLElement|null }>} */ ([])
  );

  // Grace-window timer for dragleave
  const leaveTimerRef = useRef(/** @type {number|null} */ (null));

  // Latest props (closed over by stable handlers)
  const propsRef = useRef({
    targetTripId,
    targetItineraryId,
    currentVersion,
    onInserted,
    onError,
    onStaleVersion,
    onSourceDeleted,
  });
  useEffect(() => {
    propsRef.current = {
      targetTripId,
      targetItineraryId,
      currentVersion,
      onInserted,
      onError,
      onStaleVersion,
      onSourceDeleted,
    };
  }, [
    targetTripId,
    targetItineraryId,
    currentVersion,
    onInserted,
    onError,
    onStaleVersion,
    onSourceDeleted,
  ]);

  useEffect(() => {
    ensureStylesInjected();
  }, []);

  // ── Highlight helpers ───────────────────────────────────────────────────────

  const clearHighlights = useCallback(() => {
    for (const s of surfacesRef.current) {
      if (s.highlightEl && s.highlightEl.parentNode) {
        s.highlightEl.parentNode.removeChild(s.highlightEl);
      }
      s.highlightEl = null;
    }
  }, []);

  const drawHighlight = useCallback((surface, zone) => {
    if (!surface || !zone || typeof document === "undefined") return;
    const surfaceRect = surface.el.getBoundingClientRect();
    const top = zone.y - surfaceRect.top + (surface.el.scrollTop || 0) - 2;

    let hl = surface.highlightEl;
    if (!hl) {
      hl = document.createElement("div");
      hl.className = "reuse-drop-highlight";
      hl.setAttribute("data-reuse-drop-highlight", "");
      // Ensure positioning context exists on surface
      const computed =
        typeof window !== "undefined" && window.getComputedStyle
          ? window.getComputedStyle(surface.el).position
          : "";
      if (!computed || computed === "static") {
        surface.el.style.position = "relative";
      }
      surface.el.appendChild(hl);
      surface.highlightEl = hl;
    }
    hl.style.top = `${top}px`;
  }, []);

  // ── Payload + zone parsing on drop ─────────────────────────────────────────

  const parsePayload = useCallback((dataTransfer) => {
    if (!dataTransfer) return null;
    try {
      const raw = dataTransfer.getData("application/x-voyage-reuse");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  // ── Insertion call ─────────────────────────────────────────────────────────

  const performInsert = useCallback(
    async (payload, target) => {
      const {
        targetTripId: tripId,
        targetItineraryId: itineraryId,
        currentVersion: version,
        onInserted: cbInserted,
        onError: cbError,
        onStaleVersion: cbStale,
        onSourceDeleted: cbDeleted,
      } = propsRef.current;

      if (!tripId || !itineraryId) {
        emitToast(
          "Couldn't add — missing target itinerary.",
          "missing_target",
          cbError
        );
        return;
      }

      const body = {
        sourceTripId: payload.sourceTripId,
        selection: payload,
        target: {
          itineraryId,
          dayIndex: target.dayIndex,
          ...(payload.kind === "item" ? { position: target.position } : {}),
        },
        ifMatchVersion: version,
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
        emitToast(
          "Couldn't reach the server.",
          "network_error",
          cbError
        );
        return;
      }

      // Try to parse JSON body regardless of status
      const data = await res.json().catch(() => ({}));

      switch (res.status) {
        case 200: {
          const { itinerary, missingStartDateAdvisory } = data || {};
          if (missingStartDateAdvisory) {
            emitToast(
              "Trip has no start date — added days don't have dates yet.",
              "missing_start_date_advisory",
              cbError
            );
          }
          if (typeof cbInserted === "function") {
            cbInserted(itinerary, missingStartDateAdvisory);
          }
          return;
        }
        case 400: {
          emitToast(
            "Couldn't add — please re-select and try again.",
            "malformed_selection",
            cbError
          );
          return;
        }
        case 403: {
          emitToast("Insertion not allowed.", "forbidden", cbError);
          return;
        }
        case 404: {
          emitToast(
            "Source trip not found — please refresh.",
            "not_found",
            cbError
          );
          return;
        }
        case 409: {
          emitToast(
            "Itinerary changed elsewhere — refreshing.",
            "stale_version",
            cbError
          );
          if (typeof cbStale === "function") cbStale();
          return;
        }
        case 410: {
          emitToast(
            "That trip was removed — please pick another.",
            "source_deleted",
            cbError
          );
          if (typeof cbDeleted === "function") cbDeleted(payload.sourceTripId);
          return;
        }
        default: {
          emitToast(
            "Couldn't add — please try again.",
            `http_${res.status}`,
            cbError
          );
          return;
        }
      }
    },
    []
  );

  // ── Drop-zone validity check ────────────────────────────────────────────────

  const isZoneValidForPayload = useCallback((zone, payloadKind) => {
    if (!zone) return false;
    if (payloadKind === "day" || payloadKind === "segment") {
      return zone.kind === "between-days";
    }
    if (payloadKind === "item") {
      return zone.kind === "between-items" || zone.kind === "day-header";
    }
    return false;
  }, []);

  // ── Event handler factory ───────────────────────────────────────────────────

  const buildHandlersFor = useCallback(
    (surfaceEntry) => {
      const onDragOver = (event) => {
        // We don't have access to the payload kind via dragover dataTransfer in
        // most browsers (security restriction). Best we can do is check that
        // our MIME type is present in `types`, then optimistically draw the
        // highlight for the closest zone of any kind.
        const types = event.dataTransfer?.types;
        const hasReuseType =
          types &&
          (Array.from(types).includes("application/x-voyage-reuse") ||
            // Some browsers expose .contains
            (typeof types.contains === "function" &&
              types.contains("application/x-voyage-reuse")));

        if (!hasReuseType) return; // ignore non-reuse drags

        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";

        // Cancel any pending grace-window clear
        if (leaveTimerRef.current !== null) {
          clearTimeout(leaveTimerRef.current);
          leaveTimerRef.current = null;
        }

        // Compute "best" zone optimistically — try item zones first since they
        // are the most specific. If no item zone is in range, fall back to a
        // between-days zone.
        const cursor = { x: event.clientX, y: event.clientY };
        const itemZone = computeDropZone(surfaceEntry.el, cursor, "item");
        const dayZone = computeDropZone(surfaceEntry.el, cursor, "day");
        const zone =
          itemZone && itemZone.kind === "day-header"
            ? itemZone
            : itemZone || dayZone;

        if (zone) drawHighlight(surfaceEntry, zone);
        setIsDragging(true);
      };

      const onDragLeave = (event) => {
        // Only act when leaving the surface (not just transitioning between
        // children). 80 ms grace window for fast cursor movement.
        const related = event.relatedTarget;
        if (related && surfaceEntry.el.contains(related)) {
          return;
        }
        if (leaveTimerRef.current !== null) {
          clearTimeout(leaveTimerRef.current);
        }
        leaveTimerRef.current = setTimeout(() => {
          clearHighlights();
          setIsDragging(false);
          leaveTimerRef.current = null;
        }, 80);
      };

      const onDrop = async (event) => {
        event.preventDefault();
        if (leaveTimerRef.current !== null) {
          clearTimeout(leaveTimerRef.current);
          leaveTimerRef.current = null;
        }

        const payload = parsePayload(event.dataTransfer);
        clearHighlights();
        setIsDragging(false);

        if (!payload || !payload.kind) {
          emitToast(
            "Couldn't read drag payload.",
            "malformed_selection",
            propsRef.current.onError
          );
          return;
        }

        const cursor = { x: event.clientX, y: event.clientY };
        const zone = computeDropZone(surfaceEntry.el, cursor, payload.kind);
        if (!isZoneValidForPayload(zone, payload.kind)) {
          // Silent: user dropped on an invalid zone. No error toast — the lack
          // of highlight at drop time is feedback enough. Spec §8 edge cases.
          return;
        }

        await performInsert(payload, {
          dayIndex: zone.dayIndex,
          position: zone.position,
        });
      };

      const onDragEnd = () => {
        if (leaveTimerRef.current !== null) {
          clearTimeout(leaveTimerRef.current);
          leaveTimerRef.current = null;
        }
        clearHighlights();
        setIsDragging(false);
      };

      return { onDragOver, onDragLeave, onDrop, onDragEnd };
    },
    [
      clearHighlights,
      drawHighlight,
      isZoneValidForPayload,
      parsePayload,
      performInsert,
    ]
  );

  // ── Registration ────────────────────────────────────────────────────────────

  const registerSurface = useCallback(
    (ref, opts = {}) => {
      const { isPanel = false, onDockModeChange } = opts;
      const el = ref && typeof ref === "object" && "current" in ref ? ref.current : ref;
      if (!el) return () => {};

      // De-dupe: replace any existing entry for this element
      surfacesRef.current = surfacesRef.current.filter((s) => s.el !== el);

      const entry = {
        el,
        isPanel,
        onDockModeChange,
        highlightEl: null,
      };
      const handlers = buildHandlersFor(entry);
      entry.handlers = handlers;

      el.addEventListener("dragover", handlers.onDragOver);
      el.addEventListener("dragleave", handlers.onDragLeave);
      el.addEventListener("drop", handlers.onDrop);
      el.addEventListener("dragend", handlers.onDragEnd);

      surfacesRef.current.push(entry);

      return () => {
        el.removeEventListener("dragover", handlers.onDragOver);
        el.removeEventListener("dragleave", handlers.onDragLeave);
        el.removeEventListener("drop", handlers.onDrop);
        el.removeEventListener("dragend", handlers.onDragEnd);
        if (entry.highlightEl && entry.highlightEl.parentNode) {
          entry.highlightEl.parentNode.removeChild(entry.highlightEl);
        }
        surfacesRef.current = surfacesRef.current.filter((s) => s !== entry);
      };
    },
    [buildHandlersFor]
  );

  const registerCanvas = useCallback(
    (ref) => registerSurface(ref, { isPanel: false }),
    [registerSurface]
  );

  const registerPanel = useCallback(
    (ref, opts = {}) =>
      registerSurface(ref, { isPanel: true, onDockModeChange: opts.onDockModeChange }),
    [registerSurface]
  );

  // ── Dock-mode broadcasting ─────────────────────────────────────────────────
  //
  // When a drag begins anywhere we tell every registered panel surface to dock.
  // We piggy-back on the document-level dragstart event so we don't need the
  // source element to be a child of the surface.

  useEffect(() => {
    if (typeof document === "undefined") return;

    function handleDocDragStart(e) {
      const types = e.dataTransfer?.types;
      const isReuse =
        types &&
        (Array.from(types).includes("application/x-voyage-reuse") ||
          (typeof types.contains === "function" &&
            types.contains("application/x-voyage-reuse")));
      if (!isReuse) return;
      for (const s of surfacesRef.current) {
        if (s.isPanel && typeof s.onDockModeChange === "function") {
          s.onDockModeChange(true);
        }
      }
    }

    function handleDocDragEnd() {
      for (const s of surfacesRef.current) {
        if (s.isPanel && typeof s.onDockModeChange === "function") {
          s.onDockModeChange(false);
        }
      }
    }

    document.addEventListener("dragstart", handleDocDragStart);
    document.addEventListener("dragend", handleDocDragEnd);
    document.addEventListener("drop", handleDocDragEnd);

    return () => {
      document.removeEventListener("dragstart", handleDocDragStart);
      document.removeEventListener("dragend", handleDocDragEnd);
      document.removeEventListener("drop", handleDocDragEnd);
    };
  }, []);

  // ── Keyboard fallback ──────────────────────────────────────────────────────

  const getKeyboardTargets = useCallback(
    (payload) => {
      if (!payload || !targetItinerary) return [];
      const days = Array.isArray(targetItinerary.days)
        ? targetItinerary.days
        : [];

      if (payload.kind === "day" || payload.kind === "segment") {
        const targets = [{ dayIndex: 0, label: "Top of itinerary" }];
        for (let i = 0; i < days.length; i++) {
          targets.push({
            dayIndex: i + 1,
            label: `After Day ${days[i].dayNumber ?? i + 1}`,
          });
        }
        // Final entry is "End of itinerary" (== last "After Day N")
        if (days.length > 0) {
          targets[targets.length - 1] = {
            dayIndex: days.length,
            label: "End of itinerary",
          };
        }
        return targets;
      }

      if (payload.kind === "item") {
        const targets = [];
        for (let d = 0; d < days.length; d++) {
          const day = days[d];
          const items = Array.isArray(day.items) ? day.items : [];
          for (let p = 0; p < items.length; p++) {
            targets.push({
              dayIndex: d,
              position: p,
              label: `Day ${day.dayNumber ?? d + 1}: before ${items[p].title || "item"}`,
            });
          }
          targets.push({
            dayIndex: d,
            position: items.length,
            label: `Day ${day.dayNumber ?? d + 1}: after last item`,
          });
        }
        return targets;
      }

      return [];
    },
    [targetItinerary]
  );

  const moveTo = useCallback(
    async (payload, target) => {
      if (!payload || !target) return;
      await performInsert(payload, target);
    },
    [performInsert]
  );

  return {
    registerCanvas,
    registerPanel,
    isDragging,
    getKeyboardTargets,
    moveTo,
  };
}

export default useReuseDrop;
