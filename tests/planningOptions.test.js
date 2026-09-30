import { describe, it, expect } from "vitest";
import { buildPlanningOptions } from "../app/lib/trip-dashboard/planningOptions.js";

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
});
