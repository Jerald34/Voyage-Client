import { describe, expect, it } from "vitest";
import { buildCalendarDays } from "../app/lib/calendarDays.js";
import { daySummaryText, eventAction, spanAction, summarizeDay } from "../app/lib/calendarActions.js";

const OCT = new Date(2026, 9, 1);
const TODAY = new Date(2026, 9, 3, 10, 0); // Saturday, October 3

function cells({ trips = [], events = [] } = {}) {
  const payload = { from: "2026-09-27", to: "2026-11-07", generatedAt: "", tripsWithoutDates: 0, trips, events };
  return buildCalendarDays(payload, OCT, TODAY);
}
const cellOn = (all, key) => all.find((cell) => cell.key === key);

let nextId = 0;
/** An event at 09:00 local on October `day`. */
function event(kind, day, detail = {}) {
  nextId += 1;
  return {
    id: `${kind}:${nextId}`,
    kind,
    tripId: "t1",
    tripTitle: "Lisbon Getaway",
    clientName: "Tanaka",
    occurredAt: new Date(2026, 9, day, 9).toISOString(),
    detail,
  };
}

function trip(startDate, endDate = startDate) {
  return {
    tripId: `t-${startDate}`,
    tripTitle: "Kyoto Autumn Escape",
    clientName: "Reyes",
    placeLabel: "Kyoto",
    startDate,
    endDate,
    status: "IN_REVIEW",
    travelerCount: 2,
  };
}

describe("buildCalendarDays", () => {
  it("says how many days each cell is from today", () => {
    const all = cells();
    expect(cellOn(all, "2026-10-01").daysFromToday).toBe(-2);
    expect(cellOn(all, "2026-10-03").daysFromToday).toBe(0);
    expect(cellOn(all, "2026-10-10").daysFromToday).toBe(7);
  });
});

describe("eventAction", () => {
  const day = (key) => cellOn(cells(), key);

  it("flags a comment only when the server says it needs a reply", () => {
    expect(eventAction(event("client_commented", 2, { needsReply: true }), day("2026-10-02"))).toBe("reply");
    expect(eventAction(event("client_commented", 2, { needsReply: false }), day("2026-10-02"))).toBeNull();
    // An older server doesn't send needsReply: quiet, never a false alarm.
    expect(eventAction(event("client_commented", 2, {}), day("2026-10-02"))).toBeNull();
  });

  it.each([
    ["proposal_rated", 3, "lowRating"],
    ["proposal_rated", 4, null],
    ["review_submitted", 1, "lowRating"],
    ["review_submitted", 5, null],
  ])("%s at %i stars is %s", (kind, rating, expected) => {
    expect(eventAction(event(kind, 2, { rating }), day("2026-10-02"))).toBe(expected);
  });

  it("keeps a low rating flagged on a past day", () => {
    expect(eventAction(event("proposal_rated", 1, { rating: 2 }), day("2026-10-01"))).toBe("lowRating");
  });

  it("flags a link expiring today or later, not one that already expired", () => {
    expect(eventAction(event("share_expires", 2), day("2026-10-02"))).toBeNull();
    expect(eventAction(event("share_expires", 3), day("2026-10-03"))).toBe("expiring");
    expect(eventAction(event("share_expires", 10), day("2026-10-10"))).toBe("expiring");
  });

  it("treats sent links and views as quiet", () => {
    expect(eventAction(event("share_sent", 2), day("2026-10-02"))).toBeNull();
    expect(eventAction(event("client_viewed", 2, { viewCount: 3 }), day("2026-10-02"))).toBeNull();
  });
});

describe("spanAction", () => {
  it.each([
    ["2026-10-02", null], // started yesterday
    ["2026-10-03", "departing"], // today
    ["2026-10-10", "departing"], // 7 days out
    ["2026-10-11", null], // 8 days out
  ])("a trip starting %s is %s on its first day", (startDate, expected) => {
    const all = cells({ trips: [trip(startDate, "2026-10-20")] });
    const first = cellOn(all, startDate);
    expect(spanAction(first.spans[0], first)).toBe(expected);
  });

  it("flags only the first day, not the rest of the trip", () => {
    const all = cells({ trips: [trip("2026-10-05", "2026-10-07")] });
    const middle = cellOn(all, "2026-10-06");
    expect(spanAction(middle.spans[0], middle)).toBeNull();
  });
});

describe("summarizeDay", () => {
  it("counts actions in priority order, then other trips and quiet activity", () => {
    const all = cells({
      trips: [trip("2026-10-05"), trip("2026-10-01", "2026-10-09")],
      events: [
        event("share_expires", 5),
        event("client_viewed", 5, { viewCount: 2 }),
        event("client_commented", 5, { needsReply: true }),
        event("client_commented", 5, { needsReply: true }),
        event("proposal_rated", 5, { rating: 2 }),
        event("share_sent", 5),
      ],
    });

    expect(summarizeDay(cellOn(all, "2026-10-05"))).toEqual({
      actions: [
        { kind: "reply", count: 2 },
        { kind: "lowRating", count: 1 },
        { kind: "expiring", count: 1 },
        { kind: "departing", count: 1 },
      ],
      actionCount: 5,
      otherTripCount: 1,
      quietCount: 2,
    });
  });

  it("is empty for an empty day", () => {
    expect(summarizeDay(cellOn(cells(), "2026-10-05"))).toEqual({
      actions: [],
      actionCount: 0,
      otherTripCount: 0,
      quietCount: 0,
    });
  });
});

describe("daySummaryText", () => {
  it("names each part in the singular", () => {
    expect(
      daySummaryText({
        actions: [
          { kind: "reply", count: 1 },
          { kind: "lowRating", count: 1 },
          { kind: "expiring", count: 1 },
          { kind: "departing", count: 1 },
        ],
        otherTripCount: 1,
        quietCount: 1,
      }),
    ).toBe("1 comment needs a reply, 1 low rating, 1 link expiring, 1 trip departing soon, 1 trip, 1 other update");
  });

  it("names each part in the plural", () => {
    expect(
      daySummaryText({
        actions: [
          { kind: "reply", count: 2 },
          { kind: "lowRating", count: 2 },
          { kind: "expiring", count: 3 },
          { kind: "departing", count: 2 },
        ],
        otherTripCount: 2,
        quietCount: 3,
      }),
    ).toBe("2 comments need a reply, 2 low ratings, 3 links expiring, 2 trips departing soon, 2 trips, 3 other updates");
  });

  it("is empty when nothing is on the day", () => {
    expect(daySummaryText({ actions: [], otherTripCount: 0, quietCount: 0 })).toBe("");
  });
});
