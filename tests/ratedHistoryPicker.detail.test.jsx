/**
 * ratedHistoryPicker.detail.test.jsx
 *
 * Expanding a trip in RatedHistoryPicker loads its itinerary via the
 * `getDetail` prop (useRatedHistory's cached detail fetch) and hands it to
 * the real RatedTripList as `itineraryByTripId`.
 *
 *  1. Expanding a trip calls getDetail(tripId) and renders the itinerary
 *  2. A failed load shows an error with Retry; Retry loads it
 *  3. Collapsing and re-expanding a loaded trip shows it without a loader
 *  4. Without a getDetail prop the row keeps the loading placeholder
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RatedHistoryPicker from "../app/components/ratedHistory/RatedHistoryPicker.jsx";

const trips = [
  {
    tripId: "trip-1",
    title: "Tokyo Spring 2025",
    destinationSummary: "Tokyo",
    dayCount: 1,
    startDate: "2025-03-15",
    endDate: "2025-03-15",
    rating: 5,
    ratedAt: "2025-04-01T00:00:00Z",
  },
];

const itinerary = {
  itineraryId: "itin-1",
  title: "Tokyo plan",
  summary: "Temples and ramen",
  days: [
    {
      dayId: "day-1",
      dayNumber: 1,
      date: "2025-03-15",
      title: "Arrival",
      summary: null,
      items: [],
    },
  ],
};

function renderPicker(props = {}) {
  return render(
    <RatedHistoryPicker
      isOpen
      onClose={vi.fn()}
      mode="editor"
      agencyId="agency-1"
      trips={trips}
      {...props}
    />
  );
}

function tripRow() {
  return screen.getByRole("button", { name: /Tokyo Spring 2025/ });
}

describe("RatedHistoryPicker — itinerary detail loading", () => {
  it("1. expanding a trip calls getDetail and renders the itinerary", async () => {
    const getDetail = vi.fn().mockResolvedValue(itinerary);
    renderPicker({ getDetail });

    fireEvent.click(tripRow());

    expect(getDetail).toHaveBeenCalledWith("trip-1");
    expect(await screen.findByText("Tokyo plan")).toBeInTheDocument();
    expect(screen.queryByText("Loading itinerary…")).not.toBeInTheDocument();
  });

  it("2. a failed load shows an error with Retry, and Retry loads it", async () => {
    const getDetail = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network down"))
      .mockResolvedValueOnce(itinerary);
    renderPicker({ getDetail });

    fireEvent.click(tripRow());

    expect(
      await screen.findByText("Couldn't load this itinerary.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Loading itinerary…")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Tokyo plan")).toBeInTheDocument();
    expect(getDetail).toHaveBeenCalledTimes(2);
    expect(
      screen.queryByText("Couldn't load this itinerary.")
    ).not.toBeInTheDocument();
  });

  it("3. re-expanding a loaded trip shows it straight away", async () => {
    const getDetail = vi.fn().mockResolvedValue(itinerary);
    renderPicker({ getDetail });

    fireEvent.click(tripRow());
    await screen.findByText("Tokyo plan");

    fireEvent.click(tripRow()); // collapse
    expect(screen.queryByText("Tokyo plan")).not.toBeInTheDocument();

    fireEvent.click(tripRow()); // expand again
    expect(screen.getByText("Tokyo plan")).toBeInTheDocument();
    expect(screen.queryByText("Loading itinerary…")).not.toBeInTheDocument();
  });

  it("4. without getDetail the expanded row keeps the loading placeholder", async () => {
    renderPicker();
    fireEvent.click(tripRow());
    await waitFor(() =>
      expect(screen.getByText("Loading itinerary…")).toBeInTheDocument()
    );
  });
});
