import { describe, it, expect } from "vitest";
import { buildPlanningOptions, buildTripPickerLabels } from "../app/lib/trip-dashboard/planningOptions.js";

describe("buildPlanningOptions", () => {
  it("sorts mixed drafts and trips strictly by createdAt desc", () => {
    const result = buildPlanningOptions({
      draftThreadOrder: ["d1"],
      draftThreadStates: {
        d1: { title: "Old draft", createdAt: "2026-05-20T00:00:00Z", itinerary: null }
      },
      safeTrips: [
        { id: "t1", clientName: "Newer trip", createdAt: "2026-05-25T00:00:00Z", status: "IN_REVIEW" }
      ],
      tripStates: {},
      activeContext: null,
    });
    expect(result.map((o) => o.id)).toEqual(["t1", "d1"]);
  });

  it("pins pending placeholder to the top", () => {
    const result = buildPlanningOptions({
      draftThreadOrder: [],
      draftThreadStates: {},
      safeTrips: [{ id: "t1", clientName: "Trip", createdAt: "2026-05-25T00:00:00Z" }],
      tripStates: {},
      activeContext: { type: "draft", id: "pending-123" },
    });
    expect(result[0].id).toBe("pending-123");
  });

  describe("with trip labels from the trip list", () => {
    // The Planner gets trips from their threads only (it is given no trip rows), and the
    // itinerary a thread loads carries neither the place nor the trip's status.
    const original = { id: "t1", clientName: "Alice", destination: "Baguio City", approvalStatus: "In review", itineraryId: "i1", createdAt: "2026-10-01T00:00:00Z" };
    const copy = { id: "t2", clientName: "Alice", destination: "Baguio City", approvalStatus: "Approved", itineraryId: "i2", createdAt: "2026-10-12T00:00:00Z" };
    const tripStates = {
      t1: { threadId: "th1", itinerary: { id: "i1", title: "Alice itinerary" }, createdAt: "2026-10-01T00:00:00Z" },
      t2: { threadId: "th2", itinerary: { id: "i2", title: "Alice itinerary" }, createdAt: "2026-10-12T00:00:00Z" },
    };

    it("tells two trips to the same place apart, and takes the status from the trip list", () => {
      const result = buildPlanningOptions({
        draftThreadOrder: [],
        draftThreadStates: {},
        safeTrips: [],
        tripStates,
        activeContext: null,
        tripLabels: buildTripPickerLabels([copy, original]),
      });

      expect(result.map((o) => [o.id, o.clientName, o.destination, o.statusLabel])).toEqual([
        ["t2", "Alice itinerary", "Option 2 · Baguio City", "Approved"],
        ["t1", "Alice itinerary", "Option 1 · Baguio City", "In review"],
      ]);
    });

    it("keeps the label and status read from the trip's own state when the trip is not in the map", () => {
      const result = buildPlanningOptions({
        draftThreadOrder: [],
        draftThreadStates: {},
        safeTrips: [],
        tripStates: { t1: tripStates.t1 },
        activeContext: null,
        tripLabels: new Map(),
      });

      expect(result[0]).toMatchObject({ destination: "", statusLabel: "Approved" });
    });
  });
});

describe("buildTripPickerLabels", () => {
  const trip = (id, clientName, destination, extra = {}) => ({
    id, clientName, destination, approvalStatus: "In review", itineraryId: `i-${id}`, createdAt: "2026-10-01T00:00:00Z", ...extra,
  });

  it("numbers one client's trips to the same place, oldest first, and leaves a single trip as its place", () => {
    const labels = buildTripPickerLabels([
      trip("t3", "Alice", "Baguio City", { createdAt: "2026-10-12T00:00:00Z" }),
      trip("t2", "Alice", "Tokyo", { createdAt: "2026-10-05T00:00:00Z" }),
      trip("t1", "Alice", "Baguio City"),
    ]);

    expect(labels.get("t1").label).toBe("Option 1 · Baguio City");
    expect(labels.get("t3").label).toBe("Option 2 · Baguio City");
    expect(labels.get("t2").label).toBe("Tokyo");
  });

  it("does not count another client's trip to the same place as an option", () => {
    const labels = buildTripPickerLabels([trip("t1", "Alice", "Baguio City"), trip("t2", "Bob", "Baguio City")]);

    expect(labels.get("t1").label).toBe("Baguio City");
    expect(labels.get("t2").label).toBe("Baguio City");
  });

  it("matches the Itineraries tabs: a draft or archived trip is no option, but still gets its place and status", () => {
    const labels = buildTripPickerLabels([
      trip("t2", "Alice", "Baguio City"),
      trip("t1", "Alice", "Baguio City", { approvalStatus: "Draft", itineraryId: null }),
      trip("t0", "Alice", "Baguio City", { approvalStatus: "Archived", status: "archived" }),
    ]);

    expect(labels.get("t2")).toEqual({ label: "Baguio City", statusLabel: "In review" });
    expect(labels.get("t1")).toEqual({ label: "Baguio City", statusLabel: "Draft" });
    expect(labels.get("t0")).toEqual({ label: "Baguio City", statusLabel: "Archived" });
  });

  it("returns nothing for no trips", () => {
    expect(buildTripPickerLabels(null).size).toBe(0);
  });
});
