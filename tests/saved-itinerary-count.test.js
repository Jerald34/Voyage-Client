import { describe, expect, it } from "vitest";
import { formatSavedItineraryCount } from "../app/lib/trip-dashboard/savedItineraries.js";

describe("formatSavedItineraryCount", () => {
  it.each([
    [0, "0 saved itineraries"],
    [1, "1 saved itinerary"],
    [2, "2 saved itineraries"],
  ])("counts %i", (count, text) => {
    expect(formatSavedItineraryCount(count)).toBe(text);
  });
});
