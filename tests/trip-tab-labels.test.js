import { describe, expect, it } from "vitest";
import { buildTripTabLabels } from "../app/lib/trip-dashboard/savedItineraries.js";

describe("buildTripTabLabels", () => {
  it("keeps the destination when a client has one trip there", () => {
    const labels = buildTripTabLabels([
      { id: "a", destination: "Tokyo" },
      { id: "b", destination: "Lisbon" },
    ]);
    expect(labels.get("a")).toBe("Tokyo");
    expect(labels.get("b")).toBe("Lisbon");
  });

  it("numbers trips to the same place as options, oldest first", () => {
    const labels = buildTripTabLabels([
      { id: "new", destination: "Baguio City", createdAt: "2026-10-12T02:00:00Z" },
      { id: "tokyo", destination: "Tokyo", createdAt: "2026-10-05T00:00:00Z" },
      { id: "old", destination: "baguio city ", createdAt: "2026-10-01T00:00:00Z" },
    ]);
    expect(labels.get("old")).toBe("Option 1 · baguio city");
    expect(labels.get("new")).toBe("Option 2 · Baguio City");
    expect(labels.get("tokyo")).toBe("Tokyo");
  });

  it("uses list order (newest first) when creation times are missing", () => {
    const labels = buildTripTabLabels([
      { id: "second", destination: "Baguio City" },
      { id: "first", destination: "Baguio City" },
    ]);
    expect(labels.get("first")).toBe("Option 1 · Baguio City");
    expect(labels.get("second")).toBe("Option 2 · Baguio City");
  });

  it("names trips without a destination", () => {
    expect(buildTripTabLabels([{ id: "x" }]).get("x")).toBe("Unnamed Trip");
  });
});
