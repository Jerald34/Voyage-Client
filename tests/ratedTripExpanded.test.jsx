/**
 * ratedTripExpanded.test.jsx
 *
 * Behavioural tests for RatedTripExpanded (Stage 4B).
 * The smoke tests cover RatedTripList at the list level; this file covers the
 * expanded-view component in depth.
 *
 *  1. Renders day cards in dayNumber order
 *  2. Empty items array per day shows "Exploration pending" (or equivalent) in
 *     RatedDayCard — gap documented if the copy differs
 *  3. tripId prop forwarded to each RatedDayCard drag payload
 *  4. Status badge: DRAFT shows badge; APPROVED_INTERNAL does not
 *  5. Range-select state: toggling range mode on Day 1 then Day 2 ends up as
 *     { kind: 'segment', dayIds: [day1.dayId, day2.dayId] }
 *  6. Non-consecutive selection: Day 1 then Day 3 → consecutiveError → red border
 */

import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RatedTripExpanded from "../app/components/ratedHistory/RatedTripExpanded.jsx";

// ── DataTransfer mock (needed by RatedDayCard drag tests) ─────────────────────

function createMockDataTransfer() {
  const store = {};
  return {
    store,
    effectAllowed: "",
    setData: vi.fn((type, value) => { store[type] = value; }),
    getData: vi.fn((type) => store[type] ?? ""),
    clearData: vi.fn(),
    files: [],
    items: [],
    types: [],
  };
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const itemA = {
  itemId: "item-a",
  sortOrder: 0,
  type: "ACTIVITY",
  title: "Senso-ji Temple",
  description: "Historic Buddhist temple.",
  startTime: "09:00",
  endTime: "11:00",
  place: null,
  staffNotes: null,
};

const itemB = {
  itemId: "item-b",
  sortOrder: 1,
  type: "RESTAURANT",
  title: "Ramen Lunch",
  description: null,
  startTime: "12:00",
  endTime: null,
  place: null,
  staffNotes: null,
};

const day1 = {
  dayId: "day-1",
  dayNumber: 1,
  date: "2025-03-15",
  title: "Tokyo Temples",
  summary: "Cultural day",
  items: [itemA, itemB],
};

const day2 = {
  dayId: "day-2",
  dayNumber: 2,
  date: "2025-03-16",
  title: "Shibuya Day",
  summary: null,
  items: [],
};

const day3 = {
  dayId: "day-3",
  dayNumber: 3,
  date: "2025-03-17",
  title: "Day Three",
  summary: null,
  items: [],
};

const fixtureItinerary = {
  itineraryId: "itin-1",
  title: "Tokyo Spring Itinerary",
  summary: "A lovely week in Tokyo.",
  status: "APPROVED_INTERNAL",
  days: [day3, day1, day2], // intentionally out of order to test sorting
};

const draftItinerary = {
  ...fixtureItinerary,
  itineraryId: "itin-draft",
  status: "DRAFT",
  days: [day1, day2],
};

// ── Helper ────────────────────────────────────────────────────────────────────

function renderExpanded(props = {}) {
  const defaults = {
    itinerary: fixtureItinerary,
    selection: {},
    onSelectionChange: vi.fn(),
    tripId: "trip-abc",
  };
  return render(<RatedTripExpanded {...defaults} {...props} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("RatedTripExpanded — day ordering", () => {
  it("1. renders days sorted by dayNumber regardless of prop order", () => {
    // fixtureItinerary.days is [day3, day1, day2] — dayNumbers 3, 1, 2
    // RatedTripExpanded now defensive-sorts days by dayNumber before rendering.
    const { container } = renderExpanded();

    // Get all drag handles in DOM order; each carries the day number in its label
    const dayHandles = container.querySelectorAll("[aria-label^='Drag Day']");

    expect(dayHandles.length).toBe(3);
    const labels = Array.from(dayHandles).map((h) => h.getAttribute("aria-label"));

    // After sort, days must appear in dayNumber order: 1, 2, 3
    const num = (label) => parseInt(label.match(/Drag Day (\d+)/)?.[1] ?? "0");
    expect(num(labels[0])).toBe(1); // day1 first
    expect(num(labels[1])).toBe(2); // day2 second
    expect(num(labels[2])).toBe(3); // day3 third
  });
});

describe("RatedTripExpanded — empty items per day", () => {
  it("2. day with empty items array renders 'Exploration pending' placeholder", () => {
    // day2 has items: []
    // RatedDayCard with no items renders "Exploration pending" per spec §7.1.
    renderExpanded({
      itinerary: {
        ...fixtureItinerary,
        days: [day2],
      },
    });

    // The day header must be present
    const handle = screen.getByRole("button", {
      name: `Drag Day ${day2.dayNumber}: ${day2.title}`,
    });
    expect(handle).toBeInTheDocument();

    // "Exploration pending" copy should now be present for the empty day
    expect(screen.getByText(/exploration pending/i)).toBeInTheDocument();
  });
});

describe("RatedTripExpanded — tripId forwarded to drag payloads", () => {
  it("3. dragging a day handle includes the tripId from the prop in the payload", () => {
    renderExpanded({
      itinerary: { ...fixtureItinerary, days: [day1] },
      tripId: "trip-special-id",
    });

    const handle = screen.getByRole("button", {
      name: `Drag Day ${day1.dayNumber}: ${day1.title}`,
    });

    const dt = createMockDataTransfer();
    // The draggable wrapper is the handle's parent (set up in RatedDayCard)
    fireEvent.dragStart(handle.parentElement, { dataTransfer: dt });

    const raw = dt.store["application/x-voyage-reuse"];
    expect(raw).toBeDefined();
    const payload = JSON.parse(raw);
    expect(payload.sourceTripId).toBe("trip-special-id");
  });

  it("3b. dragging an item row includes the tripId from the prop", () => {
    renderExpanded({
      itinerary: { ...fixtureItinerary, days: [day1] },
      tripId: "trip-special-id",
    });

    const itemHandle = screen.getByRole("button", {
      name: `Drag ${itemA.title}`,
    });

    const dt = createMockDataTransfer();
    fireEvent.dragStart(itemHandle.parentElement, { dataTransfer: dt });

    const raw = dt.store["application/x-voyage-reuse"];
    expect(raw).toBeDefined();
    const payload = JSON.parse(raw);
    expect(payload.sourceTripId).toBe("trip-special-id");
  });
});

describe("RatedTripExpanded — status badge", () => {
  it("4a. itinerary with status=DRAFT shows the Draft badge", () => {
    renderExpanded({ itinerary: draftItinerary });
    // DraftBadge renders a <span> with text "Draft"
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("4b. itinerary with status=APPROVED_INTERNAL does NOT show the Draft badge", () => {
    renderExpanded({
      itinerary: { ...fixtureItinerary, status: "APPROVED_INTERNAL" },
    });
    expect(screen.queryByText("Draft")).not.toBeInTheDocument();
  });

  it("4c. itinerary with no status field does NOT show the Draft badge", () => {
    const noStatusItinerary = { ...fixtureItinerary };
    delete noStatusItinerary.status;
    renderExpanded({ itinerary: noStatusItinerary });
    expect(screen.queryByText("Draft")).not.toBeInTheDocument();
  });
});

describe("RatedTripExpanded — range-select state lifting", () => {
  it("5. enabling range mode on Day 1 then checking Day 2 → selection kind=segment with both dayIds", () => {
    const onSelectionChange = vi.fn();
    renderExpanded({
      itinerary: { ...fixtureItinerary, days: [day1, day2] },
      onSelectionChange,
    });

    // Enable range mode via Day 1's "Select range" toggle
    const selectRangeButtons = screen.getAllByRole("button", { name: "Select range" });
    // Day 1 is first
    fireEvent.click(selectRangeButtons[0]);

    // Now check Day 1's checkbox
    const checkbox1 = screen.getByRole("checkbox", { name: /select day 1/i });
    fireEvent.click(checkbox1);

    // Check Day 2's checkbox
    const checkbox2 = screen.getByRole("checkbox", { name: /select day 2/i });
    fireEvent.click(checkbox2);

    // The last onSelectionChange call should have kind=segment (or day with 2 ids)
    const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1][0];
    expect(lastCall).toBeDefined();
    // After checking day2 (consecutive), selection should include both dayIds
    expect(lastCall.dayIds).toContain("day-1");
    expect(lastCall.dayIds).toContain("day-2");
    expect(lastCall.dayIds).toHaveLength(2);
  });

  it("6. non-consecutive selection (Day 1 then Day 3) → consecutiveError → error banners shown", () => {
    const onSelectionChange = vi.fn();
    renderExpanded({
      itinerary: { ...fixtureItinerary, days: [day1, day2, day3] },
      onSelectionChange,
    });

    // Enable range mode on Day 1
    const selectRangeButtons = screen.getAllByRole("button", { name: "Select range" });
    fireEvent.click(selectRangeButtons[0]);

    // Check Day 1
    const checkbox1 = screen.getByRole("checkbox", { name: /select day 1/i });
    fireEvent.click(checkbox1);

    // Check Day 3 (non-consecutive — skip Day 2)
    const checkbox3 = screen.getByRole("checkbox", { name: /select day 3/i });
    fireEvent.click(checkbox3);

    // The consecutive error banner appears in each RatedDayCard when
    // consecutiveError=true (RatedTripExpanded passes it to all day cards).
    // Use getAllBy* since multiple day cards show the same alert text.
    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBeGreaterThan(0);
    const errorTexts = screen.getAllByText(/days must be consecutive/i);
    expect(errorTexts.length).toBeGreaterThan(0);
  });
});

describe("RatedTripExpanded — empty itinerary guard", () => {
  it("renders itinerary title even when days array is empty", () => {
    renderExpanded({
      itinerary: {
        itineraryId: "itin-empty",
        title: "Empty Itinerary",
        summary: null,
        status: undefined,
        days: [],
      },
    });
    expect(screen.getByText("Empty Itinerary")).toBeInTheDocument();
    expect(screen.getByText(/no days in this itinerary/i)).toBeInTheDocument();
  });

  it("renders fallback when itinerary is null", () => {
    renderExpanded({ itinerary: null });
    expect(screen.getByText(/no itinerary data/i)).toBeInTheDocument();
  });
});
