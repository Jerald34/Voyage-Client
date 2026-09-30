/**
 * Smoke tests for RatedTripList (Stage 4B)
 *
 * Exercises:
 *   1. Both trip titles render
 *   2. Star display: 5-star vs 4-star (filled vs outline count)
 *   3. Row click calls onTripToggle with the correct tripId
 *   4. Expanded row renders <RatedTripExpanded> when itinerary data is provided
 *   5. Loading placeholder renders when itinerary is absent
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RatedTripList from "../app/components/ratedHistory/RatedTripList.jsx";

// ── Fixture data ──────────────────────────────────────────────────────────────

const fixtureTrips = [
  {
    tripId: "trip-alpha",
    title: "Tokyo Family Spring",
    destinationSummary: "Tokyo, Japan",
    dayCount: 7,
    startDate: "2025-04-10",
    endDate: "2025-04-16",
    rating: 5,
    ratedAt: "2025-05-01T10:00:00Z",
  },
  {
    tripId: "trip-beta",
    title: "Kyoto Cherry Blossom",
    destinationSummary: "Kyoto, Japan",
    dayCount: 5,
    startDate: "2025-03-25",
    endDate: "2025-03-29",
    rating: 4,
    ratedAt: "2025-04-15T10:00:00Z",
  },
];

const fixtureItinerary = {
  itineraryId: "itin-1",
  title: "Sample Itinerary",
  summary: "A lovely trip",
  days: [
    {
      dayId: "day-1",
      dayNumber: 1,
      date: "2025-04-10",
      title: "Arrival",
      summary: null,
      items: [],
    },
  ],
};

// ── Helper ────────────────────────────────────────────────────────────────────

function renderList(overrides = {}) {
  const defaults = {
    trips: fixtureTrips,
    expandedTripId: null,
    onTripToggle: vi.fn(),
    selection: {},
    onSelectionChange: vi.fn(),
    itineraryByTripId: {},
  };
  return render(<RatedTripList {...defaults} {...overrides} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("RatedTripList smoke", () => {
  it("renders both trip titles", () => {
    renderList();
    expect(screen.getByText("Tokyo Family Spring")).toBeInTheDocument();
    expect(screen.getByText("Kyoto Cherry Blossom")).toBeInTheDocument();
  });

  it("renders destination, day count, and trip month for each row", () => {
    renderList();
    expect(screen.getByText("Tokyo, Japan")).toBeInTheDocument();
    expect(screen.getByText("7 days")).toBeInTheDocument();
    expect(screen.getByText("Apr 2025")).toBeInTheDocument();

    expect(screen.getByText("Kyoto, Japan")).toBeInTheDocument();
    expect(screen.getByText("5 days")).toBeInTheDocument();
    expect(screen.getByText("Mar 2025")).toBeInTheDocument();
  });

  it("shows '—' for null destinationSummary", () => {
    const trips = [
      {
        ...fixtureTrips[0],
        tripId: "trip-no-dest",
        destinationSummary: null,
      },
    ];
    renderList({ trips });
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows '—' for null startDate", () => {
    const trips = [
      {
        ...fixtureTrips[0],
        tripId: "trip-no-date",
        startDate: null,
      },
    ];
    renderList({ trips });
    // "—" appears for the month slot; use getAllByText since dest might also be "—"
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  describe("star display", () => {
    it("renders 5 filled stars for a 5-rated trip and 4 filled + 1 outline for a 4-rated trip", () => {
      const { container } = renderList();

      // StarRating renders radio-role buttons, 5 per trip row.
      // Filled star: SVG with fill="currentColor" (solid star path)
      // Outline star: SVG with fill="none" + stroke="currentColor"
      // The disabled display-only mode keeps value prop as the selected rating.
      const starButtons = container.querySelectorAll('[role="radio"]');
      // First 5 = Tokyo Family Spring (rating 5), next 5 = Kyoto Cherry Blossom (rating 4)
      const alphaStars = Array.from(starButtons).slice(0, 5);
      const betaStars = Array.from(starButtons).slice(5, 10);

      // Rating 5: all 5 stars use the filled SVG (fill="currentColor")
      const alphaFilledSvgs = alphaStars.filter((btn) =>
        btn.querySelector('svg[fill="currentColor"]')
      );
      const alphaOutlineSvgs = alphaStars.filter((btn) =>
        btn.querySelector('svg[fill="none"]')
      );
      expect(alphaFilledSvgs).toHaveLength(5);
      expect(alphaOutlineSvgs).toHaveLength(0);

      // Rating 4: 4 filled, 1 outline
      const betaFilledSvgs = betaStars.filter((btn) =>
        btn.querySelector('svg[fill="currentColor"]')
      );
      const betaOutlineSvgs = betaStars.filter((btn) =>
        btn.querySelector('svg[fill="none"]')
      );
      expect(betaFilledSvgs).toHaveLength(4);
      expect(betaOutlineSvgs).toHaveLength(1);

      // The selected star (value === n) has aria-checked="true" — confirms
      // the correct star is marked as the current rating value.
      const alphaCheckedStars = alphaStars.filter(
        (b) => b.getAttribute("aria-checked") === "true"
      );
      expect(alphaCheckedStars).toHaveLength(1); // only n===5 is "checked"
      expect(alphaCheckedStars[0].getAttribute("aria-label")).toMatch(/5 stars/i);

      const betaCheckedStars = betaStars.filter(
        (b) => b.getAttribute("aria-checked") === "true"
      );
      expect(betaCheckedStars).toHaveLength(1); // only n===4 is "checked"
      expect(betaCheckedStars[0].getAttribute("aria-label")).toMatch(/4 stars/i);
    });
  });

  describe("row click → onTripToggle", () => {
    it("calls onTripToggle with the correct tripId when a row is clicked", () => {
      const onTripToggle = vi.fn();
      renderList({ onTripToggle });

      // Each row button has aria-expanded attribute
      const rowButtons = screen
        .getAllByRole("button")
        .filter((b) => b.hasAttribute("aria-expanded"));

      // Click the first row (Tokyo Family Spring)
      fireEvent.click(rowButtons[0]);
      expect(onTripToggle).toHaveBeenCalledOnce();
      expect(onTripToggle).toHaveBeenCalledWith("trip-alpha");

      // Click the second row (Kyoto Cherry Blossom)
      fireEvent.click(rowButtons[1]);
      expect(onTripToggle).toHaveBeenCalledTimes(2);
      expect(onTripToggle).toHaveBeenNthCalledWith(2, "trip-beta");
    });

    it("marks the expanded row button as aria-expanded=true", () => {
      renderList({ expandedTripId: "trip-alpha" });
      const rowButtons = screen
        .getAllByRole("button")
        .filter((b) => b.hasAttribute("aria-expanded"));

      expect(rowButtons[0].getAttribute("aria-expanded")).toBe("true");
      expect(rowButtons[1].getAttribute("aria-expanded")).toBe("false");
    });
  });

  describe("expansion", () => {
    it("shows a loading placeholder when itinerary is not in the map", () => {
      renderList({ expandedTripId: "trip-alpha", itineraryByTripId: {} });
      // InlineLoading renders a status region with "Loading itinerary…"
      expect(screen.getByText("Loading itinerary…")).toBeInTheDocument();
    });

    it("renders RatedTripExpanded when itinerary data is available", () => {
      renderList({
        expandedTripId: "trip-alpha",
        itineraryByTripId: { "trip-alpha": fixtureItinerary },
      });
      // RatedTripExpanded renders the itinerary title
      expect(screen.getByText("Sample Itinerary")).toBeInTheDocument();
    });

    it("does not render expansion for a collapsed trip", () => {
      renderList({
        expandedTripId: "trip-alpha",
        itineraryByTripId: { "trip-alpha": fixtureItinerary },
      });
      // The beta trip is not expanded — its expanded panel should not appear
      expect(screen.queryByText("Loading itinerary…")).not.toBeInTheDocument();
    });
  });
});
