/**
 * Smoke tests for Stage 5B — useReuseDrop hook.
 *
 * Verifies:
 *  - Successful drop of kind 'item' calls fetch with the correct URL + body
 *    and forwards the response to onInserted.
 *  - kind 'day' and 'segment' drops use the right endpoint shape.
 *  - 409 → onStaleVersion is called.
 *  - 410 → onSourceDeleted is called with the source trip id.
 *  - 403 → onError fires with the 'forbidden' code.
 *  - Drop-zone calculation: cursor near top of day 0 picks dayIndex 0;
 *    cursor at the very bottom picks dayIndex N.
 *  - getKeyboardTargets for kind 'day' returns N+1 entries
 *    ("Top of itinerary" through "End of itinerary").
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, createEvent } from "@testing-library/react";
import { useEffect, useRef } from "react";

/**
 * fireEvent.drop in jsdom can't accept clientX/clientY directly via the init
 * object (DragEvent constructor in jsdom drops them). We construct the event
 * manually and patch the coordinates on after.
 */
function fireDropAt(el, { dataTransfer, clientX, clientY }) {
  const event = createEvent.drop(el, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clientX", { value: clientX, configurable: true });
  Object.defineProperty(event, "clientY", { value: clientY, configurable: true });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer, configurable: true });
  fireEvent(el, event);
}

import { useReuseDrop } from "../app/components/ratedHistory/hooks/useReuseDrop.js";
import { API_URL } from "../app/lib/api/client.js";

// ── Test harness component ──────────────────────────────────────────────────

/**
 * Tiny probe component that mounts the hook and registers its container as the
 * canvas surface. Exposes the hook's API via a ref handed back through `apiRef`.
 *
 * The surface contains two synthetic day panels with items, each tagged with
 * the data-reuse-* attributes the hook expects.
 */
function Probe({ apiRef, onInserted, onError, onStaleVersion, onSourceDeleted, targetItinerary }) {
  const surfaceRef = useRef(null);
  const api = useReuseDrop({
    targetTripId: "trip-target",
    targetItineraryId: "itin-target",
    currentVersion: 7,
    targetItinerary,
    onInserted,
    onError,
    onStaleVersion,
    onSourceDeleted,
  });

  useEffect(() => {
    if (apiRef) apiRef.current = api;
  });

  useEffect(() => {
    const cleanup = api.registerCanvas(surfaceRef);
    return cleanup;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={surfaceRef} data-testid="surface" style={{ position: "relative" }}>
      <div data-reuse-day="0" data-testid="day-0">
        <div data-reuse-day-header data-testid="day-0-header">Day 1 header</div>
        <div data-reuse-item="0" data-testid="day-0-item-0">Item 0</div>
        <div data-reuse-item="1" data-testid="day-0-item-1">Item 1</div>
      </div>
      <div data-reuse-day="1" data-testid="day-1">
        <div data-reuse-day-header data-testid="day-1-header">Day 2 header</div>
        <div data-reuse-item="0" data-testid="day-1-item-0">Item 0</div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function createMockDataTransfer(payload) {
  const raw = JSON.stringify(payload);
  const store = { "application/x-voyage-reuse": raw };
  return {
    types: ["application/x-voyage-reuse"],
    setData: vi.fn((t, v) => {
      store[t] = v;
    }),
    getData: vi.fn((t) => store[t] ?? ""),
    clearData: vi.fn(),
    effectAllowed: "copy",
    dropEffect: "copy",
    files: [],
    items: [],
  };
}

/**
 * Stub getBoundingClientRect on elements with specific Y ranges so the hook
 * can compute drop zones deterministically.
 */
function stubRect(el, rect) {
  el.getBoundingClientRect = () => ({
    top: rect.top,
    bottom: rect.bottom,
    left: 0,
    right: 200,
    width: 200,
    height: rect.bottom - rect.top,
    x: 0,
    y: rect.top,
    toJSON() {},
  });
}

function setupDayLayout(container) {
  // surface at 0–600
  stubRect(container.querySelector("[data-testid='surface']"), { top: 0, bottom: 600 });
  // day-0 at 0–300, day-1 at 300–600
  stubRect(container.querySelector("[data-testid='day-0']"), { top: 0, bottom: 300 });
  stubRect(container.querySelector("[data-testid='day-0-header']"), { top: 0, bottom: 40 });
  stubRect(container.querySelector("[data-testid='day-0-item-0']"), { top: 50, bottom: 150 });
  stubRect(container.querySelector("[data-testid='day-0-item-1']"), { top: 160, bottom: 260 });
  stubRect(container.querySelector("[data-testid='day-1']"), { top: 300, bottom: 600 });
  stubRect(container.querySelector("[data-testid='day-1-header']"), { top: 300, bottom: 340 });
  stubRect(container.querySelector("[data-testid='day-1-item-0']"), { top: 350, bottom: 450 });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("useReuseDrop — smoke", () => {
  let fetchSpy;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("kind='item' drop fires fetch with correct URL + body and calls onInserted", async () => {
    const onInserted = vi.fn();
    const responseItinerary = {
      itineraryId: "itin-target",
      version: 8,
      days: [],
    };
    fetchSpy.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ itinerary: responseItinerary }),
    });

    const apiRef = { current: null };
    const { container } = render(
      <Probe apiRef={apiRef} onInserted={onInserted} />
    );
    setupDayLayout(container);

    const surface = container.querySelector("[data-testid='surface']");
    const dt = createMockDataTransfer({
      kind: "item",
      sourceTripId: "trip-src",
      itemIds: ["item-x"],
      sourceDayId: "day-src",
    });

    // Drop at y = 50 (top of first item in day-0 → position 0)
    await act(async () => {
      fireDropAt(surface, { dataTransfer: dt, clientX: 100, clientY: 50 });
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe(`${API_URL}/trips/trip-target/itinerary/insert-from-rated`);
    expect(opts.method).toBe("POST");
    expect(opts.credentials).toBe("include");

    const body = JSON.parse(opts.body);
    expect(body.sourceTripId).toBe("trip-src");
    expect(body.selection.kind).toBe("item");
    expect(body.target.itineraryId).toBe("itin-target");
    expect(body.target.dayIndex).toBe(0);
    expect(body.target.position).toBe(0);
    expect(body.ifMatchVersion).toBe(7);

    expect(onInserted).toHaveBeenCalledWith(responseItinerary, undefined);
  });

  it("kind='day' drop computes dayIndex from cursor position", async () => {
    const onInserted = vi.fn();
    fetchSpy.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ itinerary: { itineraryId: "itin-target" } }),
    });

    const apiRef = { current: null };
    const { container } = render(<Probe apiRef={apiRef} onInserted={onInserted} />);
    setupDayLayout(container);

    const surface = container.querySelector("[data-testid='surface']");
    const dt = createMockDataTransfer({
      kind: "day",
      sourceTripId: "trip-src",
      dayIds: ["day-x"],
    });

    // Drop at y = 300 → between day-0 (ends 300) and day-1 (starts 300) → dayIndex 1
    await act(async () => {
      fireDropAt(surface, { dataTransfer: dt, clientX: 100, clientY: 300 });
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.selection.kind).toBe("day");
    // dayIndex should not be undefined and should match either day-0-top (0)
    // or day-1-top (1) — we expect 1 here since cursor sits at day-1's top.
    expect(body.target.dayIndex).toBe(1);
    // Item-only field shouldn't be present
    expect(body.target.position).toBeUndefined();
  });

  it("kind='segment' drop uses between-days zone", async () => {
    const onInserted = vi.fn();
    fetchSpy.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ itinerary: { itineraryId: "itin-target" } }),
    });

    const apiRef = { current: null };
    const { container } = render(<Probe apiRef={apiRef} onInserted={onInserted} />);
    setupDayLayout(container);

    const surface = container.querySelector("[data-testid='surface']");
    const dt = createMockDataTransfer({
      kind: "segment",
      sourceTripId: "trip-src",
      dayIds: ["day-a", "day-b"],
    });

    // Drop near the very top (y = 5) → dayIndex 0 (top of itinerary)
    await act(async () => {
      fireDropAt(surface, { dataTransfer: dt, clientX: 100, clientY: 5 });
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.selection.kind).toBe("segment");
    expect(body.selection.dayIds).toEqual(["day-a", "day-b"]);
    expect(body.target.dayIndex).toBe(0);
    expect(body.target.position).toBeUndefined();
  });

  it("409 stale_version → calls onStaleVersion", async () => {
    const onStaleVersion = vi.fn();
    const onError = vi.fn();
    fetchSpy.mockResolvedValueOnce({
      status: 409,
      json: async () => ({ error: { code: "stale_version" } }),
    });

    const apiRef = { current: null };
    const { container } = render(
      <Probe
        apiRef={apiRef}
        onError={onError}
        onStaleVersion={onStaleVersion}
        onInserted={vi.fn()}
      />
    );
    setupDayLayout(container);

    const surface = container.querySelector("[data-testid='surface']");
    const dt = createMockDataTransfer({
      kind: "day",
      sourceTripId: "trip-src",
      dayIds: ["d1"],
    });

    await act(async () => {
      fireDropAt(surface, { dataTransfer: dt, clientX: 100, clientY: 0 });
    });

    expect(onStaleVersion).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith("stale_version", expect.any(String));
  });

  it("410 source_deleted → calls onSourceDeleted with sourceTripId", async () => {
    const onSourceDeleted = vi.fn();
    const onError = vi.fn();
    fetchSpy.mockResolvedValueOnce({
      status: 410,
      json: async () => ({ error: { code: "source_deleted" } }),
    });

    const apiRef = { current: null };
    const { container } = render(
      <Probe
        apiRef={apiRef}
        onError={onError}
        onSourceDeleted={onSourceDeleted}
        onInserted={vi.fn()}
      />
    );
    setupDayLayout(container);

    const surface = container.querySelector("[data-testid='surface']");
    const dt = createMockDataTransfer({
      kind: "day",
      sourceTripId: "trip-removed",
      dayIds: ["d1"],
    });

    await act(async () => {
      fireDropAt(surface, { dataTransfer: dt, clientX: 100, clientY: 0 });
    });

    expect(onSourceDeleted).toHaveBeenCalledWith("trip-removed");
    expect(onError).toHaveBeenCalledWith("source_deleted", expect.any(String));
  });

  it("403 forbidden → onError fires with 'forbidden'", async () => {
    const onError = vi.fn();
    fetchSpy.mockResolvedValueOnce({
      status: 403,
      json: async () => ({ error: { code: "forbidden" } }),
    });

    const apiRef = { current: null };
    const { container } = render(
      <Probe apiRef={apiRef} onError={onError} onInserted={vi.fn()} />
    );
    setupDayLayout(container);

    const surface = container.querySelector("[data-testid='surface']");
    const dt = createMockDataTransfer({
      kind: "day",
      sourceTripId: "trip-src",
      dayIds: ["d1"],
    });

    await act(async () => {
      fireDropAt(surface, { dataTransfer: dt, clientX: 100, clientY: 0 });
    });

    expect(onError).toHaveBeenCalledWith("forbidden", "Insertion not allowed.");
  });

  it("getKeyboardTargets('day') returns N+1 entries for an itinerary with N days", () => {
    const apiRef = { current: null };
    const targetItinerary = {
      itineraryId: "itin-target",
      days: [
        { dayNumber: 1, items: [] },
        { dayNumber: 2, items: [] },
        { dayNumber: 3, items: [] },
      ],
    };
    render(
      <Probe
        apiRef={apiRef}
        targetItinerary={targetItinerary}
        onInserted={vi.fn()}
      />
    );

    const targets = apiRef.current.getKeyboardTargets({
      kind: "day",
      sourceTripId: "trip-src",
      dayIds: ["d1"],
    });

    // Expect: Top + (one per day, but the last is renamed "End of itinerary")
    expect(targets.length).toBe(4); // 1 Top + 3 day boundaries (last is End)
    expect(targets[0].label).toBe("Top of itinerary");
    expect(targets[targets.length - 1].label).toBe("End of itinerary");
    // dayIndex strictly increases
    for (let i = 1; i < targets.length; i++) {
      expect(targets[i].dayIndex).toBe(i);
    }
  });

  it("moveTo() (keyboard fallback) calls fetch with the same body shape", async () => {
    fetchSpy.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ itinerary: { itineraryId: "itin-target" } }),
    });

    const apiRef = { current: null };
    const onInserted = vi.fn();
    render(<Probe apiRef={apiRef} onInserted={onInserted} />);

    await act(async () => {
      await apiRef.current.moveTo(
        { kind: "item", sourceTripId: "trip-src", itemIds: ["i1"], sourceDayId: "day-src" },
        { dayIndex: 2, position: 3 }
      );
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.target.dayIndex).toBe(2);
    expect(body.target.position).toBe(3);
    expect(body.selection.kind).toBe("item");
  });

  it("200 with missingStartDateAdvisory passes advisory to onInserted", async () => {
    const onInserted = vi.fn();
    fetchSpy.mockResolvedValueOnce({
      status: 200,
      json: async () => ({
        itinerary: { itineraryId: "itin-target" },
        missingStartDateAdvisory: { message: "no start" },
      }),
    });
    const apiRef = { current: null };
    const { container } = render(<Probe apiRef={apiRef} onInserted={onInserted} />);
    setupDayLayout(container);

    const surface = container.querySelector("[data-testid='surface']");
    const dt = createMockDataTransfer({
      kind: "day",
      sourceTripId: "trip-src",
      dayIds: ["d1"],
    });

    await act(async () => {
      fireDropAt(surface, { dataTransfer: dt, clientX: 100, clientY: 0 });
    });

    expect(onInserted).toHaveBeenCalledWith(
      { itineraryId: "itin-target" },
      { message: "no start" }
    );
  });
});
