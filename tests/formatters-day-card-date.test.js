import { describe, expect, it } from "vitest";
import { formatDayCardDate } from "../app/lib/formatters.js";

// Local-time dates so the expectations hold in any test-runner time zone.
const oct8 = new Date(2026, 9, 8).toISOString();

describe("formatDayCardDate", () => {
  it("shows one date for a day with its own date", () => {
    expect(formatDayCardDate({ dayNumber: 1, date: oct8 }, null)).toBe("Thu, Oct 8");
  });

  it("counts from the trip start when the day has no date", () => {
    expect(formatDayCardDate({ dayNumber: 2, date: null }, oct8)).toBe("Fri, Oct 9");
  });

  it("is empty without a day date or trip start", () => {
    expect(formatDayCardDate({ dayNumber: 1, date: null }, null)).toBe("");
  });
});
