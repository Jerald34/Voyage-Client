/**
 * ratedHistoryPicker.smoke.test.jsx
 *
 * Smoke tests for RatedHistoryPicker (Stage 4A) and EmptyRatedState.
 * Verifies:
 *   1. role="dialog" present when isOpen=true
 *   2. Empty-state copy appears when no trips are provided
 *   3. Pressing Escape calls onClose
 *
 * RatedTripList (Stage 4B) is mocked so this file can run independently
 * of its parallel implementation.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

// ── Mock RatedTripList (Stage 4B, parallel task) ──────────────────────────────
// The picker imports RatedTripList; mock it so smoke tests remain isolated.
vi.mock(
  "../app/components/ratedHistory/RatedTripList.jsx",
  () => ({
    default: ({ trips }) => (
      <ul data-testid="rated-trip-list">
        {trips.map((t) => (
          <li key={t.tripId}>{t.title}</li>
        ))}
      </ul>
    ),
  })
);

import RatedHistoryPicker from "../app/components/ratedHistory/RatedHistoryPicker.jsx";

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPicker(props = {}) {
  const defaults = {
    isOpen: true,
    onClose: vi.fn(),
    currentTrip: { destinationSummary: "Tokyo" },
    mode: "editor",
    agencyId: "agency-1",
  };
  return render(<RatedHistoryPicker {...defaults} {...props} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("RatedHistoryPicker — smoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. renders role=dialog when isOpen=true", () => {
    renderPicker();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("2. renders empty-state copy when trips prop is omitted", () => {
    // No `trips` prop provided → undefined → empty state rendered.
    renderPicker();
    expect(screen.getByText("No rated trips yet")).toBeInTheDocument();
    expect(
      screen.getByText(/Once travelers rate trips/i)
    ).toBeInTheDocument();
  });

  it("2b. renders filtered-away hint when trips is empty but destination filter is set", () => {
    // Default renderPicker includes currentTrip: { destinationSummary: "Tokyo" }
    // so the destination chip is pre-filled — hasFilteredAway=true → hint copy shown.
    renderPicker({ trips: [] });
    expect(
      screen.getByText("No matches for this destination")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No rated trips match this destination/i)
    ).toBeInTheDocument();
  });

  it("2c. renders 'No rated trips yet' when trips is empty and no destination filter", () => {
    // Pass currentTrip=null and no defaultDestinationFilter → empty chip → generic copy.
    renderPicker({ trips: [], currentTrip: null });
    expect(screen.getByText("No rated trips yet")).toBeInTheDocument();
  });

  it("3. pressing Escape calls onClose", () => {
    const onClose = vi.fn();
    renderPicker({ onClose });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("4. aria-labelledby points to the heading with text 'Rated history'", () => {
    renderPicker();
    const dialog = screen.getByRole("dialog");
    const labelId = dialog.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();

    const heading = document.getElementById(labelId);
    expect(heading).not.toBeNull();
    expect(heading.textContent).toBe("Rated history");
  });

  it("5. close button has correct aria-label", () => {
    renderPicker();
    // There are two close buttons (header X + footer Close); check header X.
    const closeBtn = screen.getByRole("button", {
      name: "Close rated history picker",
    });
    expect(closeBtn).toBeInTheDocument();
  });

  it("6. destination filter is pre-filled from currentTrip.destinationSummary", () => {
    renderPicker({ currentTrip: { destinationSummary: "Tokyo" } });
    // With a value, DestinationChip renders the value as text inside a chip.
    expect(screen.getByText("Tokyo")).toBeInTheDocument();
  });

  it("7. renders RatedTripList when trips are provided", () => {
    const trips = [
      {
        tripId: "trip-1",
        title: "Tokyo Family Spring 2025",
        destinationSummary: "Tokyo",
        dayCount: 7,
        startDate: "2025-03-10",
        endDate: "2025-03-16",
        rating: 4,
        ratedAt: "2025-04-01T00:00:00Z",
      },
    ];
    renderPicker({ trips });
    // Mock RatedTripList renders trip titles.
    expect(screen.getByTestId("rated-trip-list")).toBeInTheDocument();
    expect(screen.getByText("Tokyo Family Spring 2025")).toBeInTheDocument();
    // Empty state should NOT appear.
    expect(screen.queryByText("No rated trips yet")).not.toBeInTheDocument();
  });

  it("8. Escape does NOT call onClose when panel is closed", () => {
    const onClose = vi.fn();
    renderPicker({ isOpen: false, onClose });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("9. duration dropdown contains 10+ days option (stored as 10)", () => {
    renderPicker();
    const durationSelect = screen.getByRole("combobox", { name: /duration/i });
    const options = Array.from(durationSelect.querySelectorAll("option"));
    const tenPlusDays = options.find((o) => o.textContent.trim() === "10+ days");
    expect(tenPlusDays).not.toBeUndefined();
    expect(tenPlusDays.value).toBe("10");
    // Spec: "10+" is a UI alias that stores as 10.

    // Also verify there is NO 14-day option (which would be wrong per spec).
    const fourteenDays = options.find((o) => o.textContent.includes("14"));
    expect(fourteenDays).toBeUndefined();
  });

  it("10. footer shows trip count text", () => {
    const trips = [
      {
        tripId: "t1",
        title: "Trip A",
        destinationSummary: null,
        dayCount: 5,
        startDate: null,
        endDate: null,
        rating: 4,
        ratedAt: "2025-01-01T00:00:00Z",
      },
      {
        tripId: "t2",
        title: "Trip B",
        destinationSummary: null,
        dayCount: 3,
        startDate: null,
        endDate: null,
        rating: 5,
        ratedAt: "2025-01-02T00:00:00Z",
      },
    ];
    renderPicker({ trips });
    expect(screen.getByText("2 rated trips")).toBeInTheDocument();
  });
});
