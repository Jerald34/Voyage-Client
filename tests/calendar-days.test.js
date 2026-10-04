import { describe, expect, it } from "vitest";
import {
  buildCalendarDays,
  describeDayItems,
  fullDayLabel,
  gridRange,
  relativeDayLabel,
  toDateKey,
  EVENT_COPY,
} from "../app/lib/calendarDays.js";
import { KNOWN_EVENT_KINDS } from "../app/lib/calendarActions.js";

const OCT = new Date(2026, 9, 1);
const TODAY = new Date(2026, 9, 3, 10, 0);

function payload(overrides = {}) {
  return {
    from: "2026-09-27",
    to: "2026-11-07",
    generatedAt: "2026-10-03T02:00:00.000Z",
    tripsWithoutDates: 0,
    trips: [],
    events: [],
    ...overrides,
  };
}

const kyoto = {
  tripId: "t-kyoto",
  tripTitle: "Kyoto Autumn Escape",
  clientName: "Reyes",
  placeLabel: "Kyoto",
  startDate: "2026-10-08",
  endDate: "2026-10-14",
  status: "APPROVED_INTERNAL",
  travelerCount: 2,
};

const cellFor = (cells, key) => cells.find((cell) => cell.key === key);

describe("gridRange", () => {
  it("covers six Sunday-first weeks around the month", () => {
    const { start, end } = gridRange(OCT);
    expect(toDateKey(start)).toBe("2026-09-27");
    expect(toDateKey(end)).toBe("2026-11-07");
  });
});

describe("buildCalendarDays", () => {
  it("returns 42 days and flags the month and today", () => {
    const cells = buildCalendarDays(payload(), OCT, TODAY);
    expect(cells).toHaveLength(42);
    expect(cellFor(cells, "2026-09-30").inMonth).toBe(false);
    expect(cellFor(cells, "2026-10-01").inMonth).toBe(true);
    expect(cells.filter((cell) => cell.isToday).map((cell) => cell.key)).toEqual(["2026-10-03"]);
    expect(cellFor(cells, "2026-10-02").isPast).toBe(true);
    expect(cellFor(cells, "2026-10-03").isPast).toBe(false);
  });

  it("spreads a trip across its days and labels the start of each week", () => {
    const cells = buildCalendarDays(payload({ trips: [kyoto] }), OCT, TODAY);
    expect(cells.filter((cell) => cell.spans.length > 0).map((cell) => cell.key)).toEqual([
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
    ]);
    expect(cellFor(cells, "2026-10-08").spans[0]).toMatchObject({ isStart: true, showLabel: true, dayNumber: 1, totalDays: 7 });
    expect(cellFor(cells, "2026-10-10").spans[0].showLabel).toBe(false);
    expect(cellFor(cells, "2026-10-11").spans[0].showLabel).toBe(true); // Sunday starts a new row
    expect(cellFor(cells, "2026-10-14").spans[0]).toMatchObject({ isEnd: true, dayNumber: 7 });
  });

  it("marks trips that already ended", () => {
    const cells = buildCalendarDays(payload({ trips: [{ ...kyoto, startDate: "2026-09-27", endDate: "2026-10-02" }] }), OCT, TODAY);
    expect(cellFor(cells, "2026-09-28").spans[0].isPast).toBe(true);
  });

  it("puts an event on the viewer's local day", () => {
    const lateEvening = new Date(2026, 9, 8, 23, 30).toISOString();
    const event = {
      id: "client_viewed:s1",
      kind: "client_viewed",
      tripId: "t1",
      tripTitle: "Lisbon Getaway",
      clientName: "Tanaka",
      occurredAt: lateEvening,
      detail: { viewCount: 4 },
    };
    const cells = buildCalendarDays(payload({ events: [event] }), OCT, TODAY);
    expect(cellFor(cells, "2026-10-08").events).toEqual([event]);
    expect(cellFor(cells, "2026-10-09").events).toEqual([]);
  });

  it("shows an empty grid while the calendar is loading", () => {
    const cells = buildCalendarDays(null, OCT, TODAY);
    expect(cells.every((cell) => cell.spans.length === 0 && cell.events.length === 0)).toBe(true);
  });
});

describe("describeDayItems", () => {
  it("describes departure, middle and return days", () => {
    const cells = buildCalendarDays(payload({ trips: [kyoto] }), OCT, TODAY);
    expect(describeDayItems(cellFor(cells, "2026-10-08"))[0]).toMatchObject({
      kind: "trip",
      tripId: "t-kyoto",
      title: "Reyes · Kyoto departs",
      detail: "6 nights · 2 travelers",
      actionLabel: "Open trip",
    });
    expect(describeDayItems(cellFor(cells, "2026-10-10"))[0]).toMatchObject({ title: "Reyes in Kyoto", detail: "Day 3 of 7" });
    expect(describeDayItems(cellFor(cells, "2026-10-14"))[0]).toMatchObject({ title: "Reyes · Kyoto returns", detail: "2 travelers" });
  });

  it("calls a one-day trip a day trip", () => {
    const cells = buildCalendarDays(payload({ trips: [{ ...kyoto, endDate: "2026-10-08", travelerCount: null }] }), OCT, TODAY);
    expect(describeDayItems(cellFor(cells, "2026-10-08"))[0]).toMatchObject({ title: "Reyes · Kyoto departs", detail: "Day trip" });
  });

  it("does not repeat the trip name when it is also the place", () => {
    const trip = { ...kyoto, clientName: null, tripTitle: "Kyoto Trip", placeLabel: "Kyoto Trip" };
    const cells = buildCalendarDays(payload({ trips: [trip] }), OCT, TODAY);
    expect(describeDayItems(cellFor(cells, "2026-10-10"))[0].title).toBe("Kyoto Trip");

    const named = { ...trip, tripTitle: "Autumn Escape", placeLabel: "Kyoto" };
    const namedCells = buildCalendarDays(payload({ trips: [named] }), OCT, TODAY);
    expect(describeDayItems(cellFor(namedCells, "2026-10-10"))[0].title).toBe("Autumn Escape in Kyoto");
  });

  it("says a link expired once its day has passed", () => {
    const base = { tripId: "t1", tripTitle: "Lisbon Getaway", clientName: "Tanaka", kind: "share_expires", detail: {} };
    const events = [
      { ...base, id: "share_expires:past", occurredAt: new Date(2026, 9, 1, 9).toISOString() },
      { ...base, id: "share_expires:today", occurredAt: new Date(2026, 9, 3, 18).toISOString() },
      { ...base, id: "share_expires:later", occurredAt: new Date(2026, 9, 6, 9).toISOString() },
    ];
    const cells = buildCalendarDays(payload({ events }), OCT, TODAY);
    expect(describeDayItems(cellFor(cells, "2026-10-01"))[0].title).toBe("Lisbon Getaway link expired");
    expect(describeDayItems(cellFor(cells, "2026-10-03"))[0].title).toBe("Lisbon Getaway link expires");
    expect(describeDayItems(cellFor(cells, "2026-10-06"))[0].title).toBe("Lisbon Getaway link expires");
  });

  it("describes each kind of client activity", () => {
    const at = new Date(2026, 9, 5, 9).toISOString();
    const base = { tripId: "t1", tripTitle: "Lisbon Getaway", clientName: "Tanaka", occurredAt: at };
    const events = [
      { ...base, id: "share_sent:s1", kind: "share_sent", detail: {} },
      { ...base, id: "share_expires:s1", kind: "share_expires", detail: {} },
      { ...base, id: "client_viewed:s1", kind: "client_viewed", detail: { viewCount: 4 } },
      { ...base, id: "client_commented:c1", kind: "client_commented", detail: { excerpt: "Can we swap lunch?" } },
      { ...base, id: "proposal_rated:s1", kind: "proposal_rated", detail: { rating: 5 } },
      { ...base, id: "review_submitted:r1", kind: "review_submitted", detail: { rating: 4, excerpt: "Lovely" } },
    ];
    const cells = buildCalendarDays(payload({ events }), OCT, TODAY);
    expect(
      describeDayItems(cellFor(cells, "2026-10-05")).map(({ title, detail, actionLabel }) => [title, detail, actionLabel]),
    ).toEqual([
      // October 5 is after today, so the expiring link needs you and comes first.
      ["Lisbon Getaway link expires", "Shared with Tanaka", "Open trip"],
      ["Sent Lisbon Getaway to Tanaka", "Itinerary link shared", "Open trip"],
      ["Tanaka viewed Lisbon Getaway", "4 views in total", "Open trip"],
      ["Tanaka commented", "“Can we swap lunch?”", "Reply"],
      ["Tanaka rated the proposal", "5 out of 5", "Open trip"],
      ["Tanaka reviewed Lisbon Getaway", "4 out of 5 · “Lovely”", "Open trip"],
    ]);
  });

  it("lists what needs you first, most urgent first, then trips, then the rest", () => {
    const at = new Date(2026, 9, 8, 9).toISOString();
    const base = { tripId: "t1", tripTitle: "Lisbon Getaway", clientName: "Tanaka", occurredAt: at };
    const events = [
      { ...base, id: "client_viewed:s1", kind: "client_viewed", detail: { viewCount: 2 } },
      { ...base, id: "share_expires:s1", kind: "share_expires", detail: {} },
      { ...base, id: "proposal_rated:s1", kind: "proposal_rated", detail: { rating: 2 } },
      { ...base, id: "client_commented:c1", kind: "client_commented", detail: { excerpt: "Hi", needsReply: true } },
    ];
    const longTrip = { ...kyoto, tripId: "t-long", startDate: "2026-10-01", endDate: "2026-10-20" };
    const cells = buildCalendarDays(payload({ trips: [kyoto, longTrip], events }), OCT, TODAY);

    expect(describeDayItems(cellFor(cells, "2026-10-08")).map((item) => [item.key, item.actionKind])).toEqual([
      ["client_commented:c1", "reply"],
      ["proposal_rated:s1", "lowRating"],
      ["share_expires:s1", "expiring"],
      ["trip:t-kyoto", "departing"], // starts in 5 days
      ["trip:t-long", null], // mid-trip
      ["client_viewed:s1", null],
    ]);
  });
});

describe("describeDayItems and the known event kinds", () => {
  const at = new Date(2026, 9, 8, 9).toISOString();
  const eventOf = (kind) => ({ id: `${kind}:1`, kind, tripId: "t1", tripTitle: "Lisbon Getaway", clientName: "Tanaka", occurredAt: at, detail: {} });

  it("guards against event-kind drift: EVENT_COPY keys must match KNOWN_EVENT_KINDS", () => {
    expect(Object.keys(EVENT_COPY).sort()).toEqual([...KNOWN_EVENT_KINDS].sort());
  });

  it("lists an event of every kind the day tile counts, so the popover and tile agree", () => {
    for (const kind of KNOWN_EVENT_KINDS) {
      const cells = buildCalendarDays(payload({ events: [eventOf(kind)] }), OCT, TODAY);
      expect(describeDayItems(cellFor(cells, "2026-10-08")).map((item) => item.key), kind).toEqual([`${kind}:1`]);
    }
  });

  it("leaves out an event kind it has no copy for", () => {
    const cells = buildCalendarDays(payload({ events: [eventOf("brand_new_kind")] }), OCT, TODAY);
    expect(describeDayItems(cellFor(cells, "2026-10-08"))).toEqual([]);
  });
});

describe("day labels", () => {
  it("names the day in full", () => {
    expect(fullDayLabel(new Date(2026, 9, 8))).toBe("Thursday, October 8");
  });

  it("says how far a day is from today", () => {
    expect(relativeDayLabel("2026-10-03", "2026-10-03")).toBe("Today");
    expect(relativeDayLabel("2026-10-04", "2026-10-03")).toBe("Tomorrow");
    expect(relativeDayLabel("2026-10-02", "2026-10-03")).toBe("Yesterday");
    expect(relativeDayLabel("2026-10-08", "2026-10-03")).toBe("In 5 days");
    expect(relativeDayLabel("2026-09-30", "2026-10-03")).toBe("3 days ago");
  });
});
