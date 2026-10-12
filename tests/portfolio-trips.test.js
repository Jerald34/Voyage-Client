import { describe, expect, it } from "vitest";
import { toPortfolioTrip } from "../app/lib/trip-dashboard/portfolioTrips.js";

describe("toPortfolioTrip", () => {
  it("keeps what the Itineraries page and the Planner need, including when the trip was made", () => {
    const row = toPortfolioTrip({
      id: "trip-2",
      clientName: "Garcia",
      title: "Garcia itinerary",
      destinationSummary: "Baguio City",
      startDate: null,
      endDate: null,
      status: "IN_REVIEW",
      createdAt: "2026-10-12T02:00:00.000Z",
      itineraries: [{ id: "itin-2", status: "NEEDS_REVIEW", version: 1 }],
    });

    expect(row).toMatchObject({
      id: "trip-2",
      clientName: "Garcia",
      destination: "Baguio City",
      status: "active",
      approvalStatus: "In review",
      itineraryId: "itin-2",
      itineraryVersion: 1,
      createdAt: "2026-10-12T02:00:00.000Z",
    });
  });

  it("falls back to the title for the destination and marks archived trips", () => {
    const row = toPortfolioTrip({ id: "t", title: "Weekend", status: "ARCHIVED", itineraries: [] });
    expect(row).toMatchObject({ destination: "Weekend", status: "archived", itineraryId: null, createdAt: null });
  });
});
