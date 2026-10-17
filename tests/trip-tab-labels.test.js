import { describe, expect, it } from "vitest";
import { buildTripTabLabels, orderTripsForTabs } from "../app/lib/trip-dashboard/savedItineraries.js";

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

  it("falls back to list order for the whole group when only some trips have a creation time", () => {
    const labels = buildTripTabLabels([
      { id: "C", destination: "Baguio City", createdAt: "2026-10-12T00:00:00Z" },
      { id: "B", destination: "Baguio City" },
      { id: "A", destination: "Baguio City", createdAt: "2026-10-01T00:00:00Z" },
    ]);
    expect(labels.get("A")).toBe("Option 1 · Baguio City");
    expect(labels.get("B")).toBe("Option 2 · Baguio City");
    expect(labels.get("C")).toBe("Option 3 · Baguio City");
  });

  it("falls back to list order when creation times are equal", () => {
    const time = "2026-10-12T02:00:00Z";
    const labels = buildTripTabLabels([
      { id: "second", destination: "Baguio City", createdAt: time },
      { id: "first", destination: "Baguio City", createdAt: time },
    ]);
    expect(labels.get("first")).toBe("Option 1 · Baguio City");
    expect(labels.get("second")).toBe("Option 2 · Baguio City");
  });

  it("groups destinations that differ only in inner whitespace", () => {
    const labels = buildTripTabLabels([
      { id: "a", destination: "Baguio  City" },
      { id: "b", destination: "Baguio City" },
    ]);
    expect(labels.get("a")).toBe("Option 2 · Baguio City");
    expect(labels.get("b")).toBe("Option 1 · Baguio City");
  });

  it("skips null entries and trips without an id", () => {
    const labels = buildTripTabLabels([null, { destination: "Tokyo" }, { id: "ok", destination: "Tokyo" }]);
    expect(labels.size).toBe(1);
    expect(labels.get("ok")).toBe("Tokyo");
  });
});

describe("orderTripsForTabs", () => {
  it("puts trips to the same place together, oldest first, where the group first appears", () => {
    const baguioNew = { id: "baguioNew", destination: "Baguio City", createdAt: "2026-10-12T02:00:00Z" };
    const tokyo = { id: "tokyo", destination: "Tokyo", createdAt: "2026-10-05T00:00:00Z" };
    const baguioOld = { id: "baguioOld", destination: "baguio city ", createdAt: "2026-10-01T00:00:00Z" };
    const input = [baguioNew, tokyo, baguioOld];

    expect(orderTripsForTabs(input)).toEqual([baguioOld, baguioNew, tokyo]);
    expect(input).toEqual([baguioNew, tokyo, baguioOld]);
  });

  it("leaves the order unchanged when no two trips share a destination", () => {
    const input = [
      { id: "a", destination: "Tokyo" },
      { id: "b", destination: "Lisbon" },
      { id: "c", destination: "Cebu" },
    ];
    const ordered = orderTripsForTabs(input);
    expect(ordered).toEqual(input);
    expect(ordered).not.toBe(input);
  });

  it("keeps trips without an id at their own position", () => {
    const loose = { destination: "Tokyo" };
    const input = [loose, { id: "a", destination: "Tokyo" }];
    expect(orderTripsForTabs(input)).toEqual([loose, { id: "a", destination: "Tokyo" }]);
  });
});
