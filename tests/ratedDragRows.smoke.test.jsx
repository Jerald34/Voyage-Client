/**
 * Smoke tests for Stage 4C — RatedDayCard and RatedItemRow drag payloads.
 *
 * Verifies:
 *  - RatedItemRow fires `application/x-voyage-reuse` with kind='item' on dragstart
 *  - RatedDayCard fires kind='day' when no range mode is active
 *  - RatedDayCard fires kind='segment' when ≥2 consecutive days are selected in range mode
 *  - Toggling range mode and selecting a non-consecutive day is rejected (no dayId added)
 *
 * jsdom does not implement the HTML5 DataTransfer API, so we patch it onto
 * the synthetic event in fireEvent options.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RatedItemRow from "../app/components/ratedHistory/RatedItemRow.jsx";
import RatedDayCard, { isConsecutive } from "../app/components/ratedHistory/RatedDayCard.jsx";

// ── DataTransfer mock factory ─────────────────────────────────────────────────

/**
 * Creates a minimal DataTransfer-like object whose setData/getData calls are
 * recorded so we can assert payload values.
 */
function createMockDataTransfer() {
  const store = {};
  return {
    store, // expose for assertions
    effectAllowed: "",
    setData: vi.fn((type, value) => {
      store[type] = value;
    }),
    getData: vi.fn((type) => store[type] ?? ""),
    clearData: vi.fn(),
    files: [],
    items: [],
    types: [],
  };
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const fixtureItem = {
  itemId: "item-1",
  sortOrder: 1,
  type: "ACTIVITY",
  title: "Senso-ji Temple",
  description: "Famous Buddhist temple in Asakusa.",
  startTime: "09:00",
  endTime: "11:00",
  place: {
    name: "Senso-ji",
    formattedAddress: "2-3-1 Asakusa, Taito City, Tokyo",
    latitude: 35.7148,
    longitude: 139.7967,
  },
  staffNotes: "Arrive before 9 to beat crowds.",
};

const fixtureDay = {
  dayId: "day-1",
  dayNumber: 1,
  date: "2025-04-10",
  title: "Tokyo Temples",
  summary: "A cultural day exploring shrines and temples.",
  items: [fixtureItem],
};

const fixtureDayTwo = {
  dayId: "day-2",
  dayNumber: 2,
  date: "2025-04-11",
  title: "Shibuya Day",
  summary: "Urban exploration in Shibuya.",
  items: [],
};

const fixtureDayThree = {
  dayId: "day-3",
  dayNumber: 3,
  date: "2025-04-12",
  title: "Day Three",
  summary: null,
  items: [],
};

const allDays = [
  { dayId: "day-1", dayNumber: 1 },
  { dayId: "day-2", dayNumber: 2 },
  { dayId: "day-3", dayNumber: 3 },
];

// ── isConsecutive unit tests ──────────────────────────────────────────────────

describe("isConsecutive (exported helper)", () => {
  it("returns true for a single day", () => {
    expect(isConsecutive(["day-1"], allDays)).toBe(true);
  });

  it("returns true for empty array", () => {
    expect(isConsecutive([], allDays)).toBe(true);
  });

  it("returns true for consecutive days [day-1, day-2]", () => {
    expect(isConsecutive(["day-1", "day-2"], allDays)).toBe(true);
  });

  it("returns true for consecutive days [day-2, day-3]", () => {
    expect(isConsecutive(["day-2", "day-3"], allDays)).toBe(true);
  });

  it("returns true for all three consecutive days", () => {
    expect(isConsecutive(["day-1", "day-2", "day-3"], allDays)).toBe(true);
  });

  it("returns false for non-consecutive [day-1, day-3] (gap)", () => {
    expect(isConsecutive(["day-1", "day-3"], allDays)).toBe(false);
  });

  it("returns false for IDs not found in allDays", () => {
    expect(isConsecutive(["day-1", "unknown-id"], allDays)).toBe(false);
  });
});

// ── RatedItemRow ──────────────────────────────────────────────────────────────

describe("RatedItemRow — drag payload", () => {
  it("calls dataTransfer.setData with MIME application/x-voyage-reuse and kind='item'", () => {
    const onSelectionChange = vi.fn();
    render(
      <RatedItemRow
        item={fixtureItem}
        dayId="day-1"
        tripId="trip-abc"
        selection={{}}
        onSelectionChange={onSelectionChange}
      />
    );

    const handle = screen.getByRole("button", {
      name: `Drag ${fixtureItem.title}`,
    });

    const dt = createMockDataTransfer();
    // Wrap the draggable div — fireEvent dragstart on the parent div
    const draggableEl = handle.parentElement;
    fireEvent.dragStart(draggableEl, { dataTransfer: dt });

    expect(dt.setData).toHaveBeenCalledWith(
      "application/x-voyage-reuse",
      expect.any(String)
    );

    const raw = dt.store["application/x-voyage-reuse"];
    expect(raw).toBeDefined();
    const payload = JSON.parse(raw);

    expect(payload.kind).toBe("item");
    expect(payload.itemIds).toEqual(["item-1"]);
    expect(payload.sourceDayId).toBe("day-1");
    expect(payload.sourceTripId).toBe("trip-abc");
  });

  it("sets effectAllowed to 'copy'", () => {
    render(
      <RatedItemRow
        item={fixtureItem}
        dayId="day-1"
        tripId="trip-abc"
        selection={{}}
        onSelectionChange={vi.fn()}
      />
    );
    const handle = screen.getByRole("button", {
      name: `Drag ${fixtureItem.title}`,
    });
    const dt = createMockDataTransfer();
    fireEvent.dragStart(handle.parentElement, { dataTransfer: dt });
    expect(dt.effectAllowed).toBe("copy");
  });

  it("shows 'HH:MM – HH:MM' when both startTime and endTime are present", () => {
    render(
      <RatedItemRow
        item={fixtureItem}
        dayId="day-1"
        selection={{}}
        onSelectionChange={vi.fn()}
      />
    );
    expect(screen.getByText("09:00 – 11:00")).toBeDefined();
  });

  it("shows only startTime when endTime is absent", () => {
    const item = { ...fixtureItem, itemId: "item-2", endTime: null };
    render(
      <RatedItemRow
        item={item}
        dayId="day-1"
        selection={{}}
        onSelectionChange={vi.fn()}
      />
    );
    expect(screen.getByText("09:00")).toBeDefined();
  });

  it("shows 'Time pending' when both times are absent", () => {
    const item = { ...fixtureItem, itemId: "item-3", startTime: null, endTime: null };
    render(
      <RatedItemRow
        item={item}
        dayId="day-1"
        selection={{}}
        onSelectionChange={vi.fn()}
      />
    );
    expect(screen.getByText("Time pending")).toBeDefined();
  });

  it("calls onKeyboardMove with item payload on Enter key on the handle", () => {
    const onKeyboardMove = vi.fn();
    render(
      <RatedItemRow
        item={fixtureItem}
        dayId="day-1"
        tripId="trip-abc"
        selection={{}}
        onSelectionChange={vi.fn()}
        onKeyboardMove={onKeyboardMove}
      />
    );
    const handle = screen.getByRole("button", { name: `Drag ${fixtureItem.title}` });
    fireEvent.keyDown(handle, { key: "Enter" });
    expect(onKeyboardMove).toHaveBeenCalledWith({
      kind: "item",
      sourceTripId: "trip-abc",
      itemIds: ["item-1"],
      sourceDayId: "day-1",
    });
  });
});

// ── RatedDayCard — single-day drag ────────────────────────────────────────────

describe("RatedDayCard — single-day drag (no range mode)", () => {
  it("fires kind='day' payload with this dayId when not in range mode", () => {
    const onSelectionChange = vi.fn();
    render(
      <RatedDayCard
        day={fixtureDay}
        tripId="trip-abc"
        selection={null}
        onSelectionChange={onSelectionChange}
        rangeMode={false}
        onRangeModeToggle={vi.fn()}
        selectedDayIds={[]}
        consecutiveError={false}
        allDays={allDays}
      />
    );

    const handle = screen.getByRole("button", {
      name: `Drag Day ${fixtureDay.dayNumber}: ${fixtureDay.title}`,
    });

    const dt = createMockDataTransfer();
    fireEvent.dragStart(handle.parentElement, { dataTransfer: dt });

    const raw = dt.store["application/x-voyage-reuse"];
    expect(raw).toBeDefined();
    const payload = JSON.parse(raw);

    expect(payload.kind).toBe("day");
    expect(payload.dayIds).toEqual(["day-1"]);
    expect(payload.sourceTripId).toBe("trip-abc");
  });

  it("sets effectAllowed to 'copy'", () => {
    render(
      <RatedDayCard
        day={fixtureDay}
        tripId="trip-abc"
        selection={null}
        onSelectionChange={vi.fn()}
        rangeMode={false}
        onRangeModeToggle={vi.fn()}
        selectedDayIds={[]}
        consecutiveError={false}
        allDays={allDays}
      />
    );
    const handle = screen.getByRole("button", {
      name: `Drag Day ${fixtureDay.dayNumber}: ${fixtureDay.title}`,
    });
    const dt = createMockDataTransfer();
    fireEvent.dragStart(handle.parentElement, { dataTransfer: dt });
    expect(dt.effectAllowed).toBe("copy");
  });
});

// ── RatedDayCard — multi-day segment drag ─────────────────────────────────────

describe("RatedDayCard — segment drag (range mode active, ≥2 consecutive days)", () => {
  it("fires kind='segment' with all selected dayIds when checked and consecutive", () => {
    const onSelectionChange = vi.fn();
    // Simulate: day-1 and day-2 are both selected; day-1 card fires the drag
    render(
      <RatedDayCard
        day={fixtureDay}
        tripId="trip-abc"
        selection={{ kind: "segment", sourceTripId: "trip-abc", dayIds: ["day-1", "day-2"] }}
        onSelectionChange={onSelectionChange}
        rangeMode={true}
        onRangeModeToggle={vi.fn()}
        selectedDayIds={["day-1", "day-2"]}
        consecutiveError={false}
        allDays={allDays}
      />
    );

    const handle = screen.getByRole("button", {
      name: `Drag Day ${fixtureDay.dayNumber}: ${fixtureDay.title}`,
    });

    const dt = createMockDataTransfer();
    fireEvent.dragStart(handle.parentElement, { dataTransfer: dt });

    const raw = dt.store["application/x-voyage-reuse"];
    expect(raw).toBeDefined();
    const payload = JSON.parse(raw);

    expect(payload.kind).toBe("segment");
    expect(payload.sourceTripId).toBe("trip-abc");
    // dayIds should include both selected days, sorted by dayNumber
    expect(payload.dayIds).toEqual(["day-1", "day-2"]);
  });

  it("falls back to kind='day' when consecutiveError is true", () => {
    // Even if 2 days are selected, if they're non-consecutive the payload reverts to 'day'
    render(
      <RatedDayCard
        day={fixtureDay}
        tripId="trip-abc"
        selection={{ kind: "segment", sourceTripId: "trip-abc", dayIds: ["day-1", "day-3"] }}
        onSelectionChange={vi.fn()}
        rangeMode={true}
        onRangeModeToggle={vi.fn()}
        selectedDayIds={["day-1", "day-3"]}
        consecutiveError={true}
        allDays={allDays}
      />
    );

    const handle = screen.getByRole("button", {
      name: `Drag Day ${fixtureDay.dayNumber}: ${fixtureDay.title}`,
    });

    const dt = createMockDataTransfer();
    fireEvent.dragStart(handle.parentElement, { dataTransfer: dt });

    const raw = dt.store["application/x-voyage-reuse"];
    expect(raw).toBeDefined();
    const payload = JSON.parse(raw);

    // Should fall back to single-day payload because consecutiveError=true
    expect(payload.kind).toBe("day");
    expect(payload.dayIds).toEqual(["day-1"]);
  });
});

// ── RatedDayCard — range mode toggle ─────────────────────────────────────────

describe("RatedDayCard — range mode UI", () => {
  it("shows 'Select range' button with aria-pressed=false when rangeMode is off", () => {
    render(
      <RatedDayCard
        day={fixtureDay}
        tripId="trip-abc"
        selection={null}
        onSelectionChange={vi.fn()}
        rangeMode={false}
        onRangeModeToggle={vi.fn()}
        selectedDayIds={[]}
        consecutiveError={false}
        allDays={allDays}
      />
    );
    const btn = screen.getByRole("button", { name: "Select range" });
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  it("shows 'Select range' button with aria-pressed=true when rangeMode is on", () => {
    render(
      <RatedDayCard
        day={fixtureDay}
        tripId="trip-abc"
        selection={null}
        onSelectionChange={vi.fn()}
        rangeMode={true}
        onRangeModeToggle={vi.fn()}
        selectedDayIds={["day-1"]}
        consecutiveError={false}
        allDays={allDays}
      />
    );
    const btn = screen.getByRole("button", { name: "Select range" });
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });

  it("calls onRangeModeToggle when 'Select range' is clicked", () => {
    const onRangeModeToggle = vi.fn();
    render(
      <RatedDayCard
        day={fixtureDay}
        tripId="trip-abc"
        selection={null}
        onSelectionChange={vi.fn()}
        rangeMode={false}
        onRangeModeToggle={onRangeModeToggle}
        selectedDayIds={[]}
        consecutiveError={false}
        allDays={allDays}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Select range" }));
    expect(onRangeModeToggle).toHaveBeenCalledOnce();
  });

  it("shows the consecutive-error banner when consecutiveError is true", () => {
    render(
      <RatedDayCard
        day={fixtureDay}
        tripId="trip-abc"
        selection={null}
        onSelectionChange={vi.fn()}
        rangeMode={true}
        onRangeModeToggle={vi.fn()}
        selectedDayIds={["day-1", "day-3"]}
        consecutiveError={true}
        allDays={allDays}
      />
    );
    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText(/Days must be consecutive/i)).toBeDefined();
  });

  it("does NOT show the error banner when consecutiveError is false", () => {
    render(
      <RatedDayCard
        day={fixtureDay}
        tripId="trip-abc"
        selection={null}
        onSelectionChange={vi.fn()}
        rangeMode={true}
        onRangeModeToggle={vi.fn()}
        selectedDayIds={["day-1"]}
        consecutiveError={false}
        allDays={allDays}
      />
    );
    const alert = document.querySelector("[role='alert']");
    expect(alert).toBeNull();
  });

  it("shows a checkbox for this day when rangeMode is true", () => {
    render(
      <RatedDayCard
        day={fixtureDay}
        tripId="trip-abc"
        selection={null}
        onSelectionChange={vi.fn()}
        rangeMode={true}
        onRangeModeToggle={vi.fn()}
        selectedDayIds={[]}
        consecutiveError={false}
        allDays={allDays}
      />
    );
    const checkbox = screen.getByRole("checkbox", {
      name: /Select Day 1/i,
    });
    expect(checkbox).toBeDefined();
  });

  it("checkbox is checked when this dayId is in selectedDayIds", () => {
    render(
      <RatedDayCard
        day={fixtureDay}
        tripId="trip-abc"
        selection={null}
        onSelectionChange={vi.fn()}
        rangeMode={true}
        onRangeModeToggle={vi.fn()}
        selectedDayIds={["day-1"]}
        consecutiveError={false}
        allDays={allDays}
      />
    );
    const checkbox = screen.getByRole("checkbox", { name: /Select Day 1/i });
    expect(checkbox.checked).toBe(true);
  });

  it("checkbox calls onSelectionChange with updated dayIds when toggled", () => {
    const onSelectionChange = vi.fn();
    render(
      <RatedDayCard
        day={fixtureDay}
        tripId="trip-abc"
        selection={null}
        onSelectionChange={onSelectionChange}
        rangeMode={true}
        onRangeModeToggle={vi.fn()}
        selectedDayIds={[]}
        consecutiveError={false}
        allDays={allDays}
      />
    );
    const checkbox = screen.getByRole("checkbox", { name: /Select Day 1/i });
    fireEvent.click(checkbox);
    expect(onSelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "day",
        dayIds: expect.arrayContaining(["day-1"]),
      })
    );
  });
});
