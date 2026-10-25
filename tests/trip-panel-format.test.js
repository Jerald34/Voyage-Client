import { describe, expect, it } from "vitest";
import {
  commentPlace,
  describeLinkState,
  describeLinkViews,
  describeTripLine,
  orderPanelComments,
} from "../app/agency/[agencyId]/components/dashboard/tripPanel/tripPanelFormat.js";

const NOW = Date.parse("2026-10-20T12:00:00.000Z");
const HOUR = 3_600_000;
const iso = (offsetMs) => new Date(NOW + offsetMs).toISOString();

describe("describeTripLine", () => {
  it("joins client, dates and travelers, leaving out what is missing", () => {
    expect(
      describeTripLine({ clientName: "Maria Santos", startDate: "2026-11-03T12:00:00.000Z", endDate: "2026-11-08T12:00:00.000Z", travelerCount: 4 }),
    ).toBe("Maria Santos · Nov 3, 2026 - Nov 8, 2026 · 4 travelers");
    expect(describeTripLine({ clientName: null, startDate: null, travelerCount: 1 }, "Fallback")).toBe("Fallback · 1 traveler");
    expect(describeTripLine(undefined, "From the row")).toBe("From the row");
    expect(describeTripLine({ clientName: null, startDate: null, travelerCount: null })).toBeNull();
  });
});

describe("describeLinkState", () => {
  it("names each state and whether it can be extended", () => {
    expect(describeLinkState({ revokedAt: iso(-HOUR), expiresAt: iso(HOUR) }, NOW)).toEqual({ label: "Link turned off", tone: "danger", canExtend: false });
    expect(describeLinkState({ revokedAt: null, expiresAt: null }, NOW)).toEqual({ label: "Never expires", tone: "neutral", canExtend: false });
    expect(describeLinkState({ revokedAt: null, expiresAt: iso(-HOUR) }, NOW)).toEqual({ label: "Link has expired", tone: "danger", canExtend: true });
    expect(describeLinkState({ revokedAt: null, expiresAt: iso(20 * HOUR) }, NOW)).toEqual({ label: "Expires in 20h", tone: "warning", canExtend: true });
    expect(describeLinkState({ revokedAt: null, expiresAt: "2026-11-30T12:00:00.000Z" }, NOW)).toEqual({ label: "Expires Nov 30, 2026", tone: "neutral", canExtend: true });
  });
});

describe("describeLinkViews", () => {
  it("counts views and says when the last one was", () => {
    expect(describeLinkViews({ viewCount: 0 }, NOW)).toBe("Not opened yet");
    expect(describeLinkViews({ viewCount: 1, lastViewedAt: iso(-2 * HOUR) }, NOW)).toBe("Viewed once · last viewed 2h ago");
    expect(describeLinkViews({ viewCount: 4, lastViewedAt: null }, NOW)).toBe("Viewed 4 times");
  });
});

describe("commentPlace", () => {
  it("says where on the trip a comment points", () => {
    expect(commentPlace({ dayNumber: 1, itemId: "i1", itemTitle: "Ryokan check-in" })).toBe("Day 1 · Ryokan check-in");
    expect(commentPlace({ dayNumber: 2, itemId: null, itemTitle: null })).toBe("Day 2");
    expect(commentPlace({ dayNumber: 3, itemId: "gone", itemTitle: null })).toBe("Day 3 · Removed stop");
    expect(commentPlace({ dayNumber: null, itemId: null, itemTitle: null })).toBe("General");
  });
});

describe("orderPanelComments", () => {
  it("puts unanswered comments first, oldest first, then answered ones newest first", () => {
    const comments = [
      { id: "answered-old", agencyReply: "Ok", createdAt: iso(-5 * HOUR) },
      { id: "waiting-new", agencyReply: null, createdAt: iso(-1 * HOUR) },
      { id: "answered-new", agencyReply: "Done", createdAt: iso(-2 * HOUR) },
      { id: "waiting-old", agencyReply: null, createdAt: iso(-4 * HOUR) },
    ];
    const { waiting, answered } = orderPanelComments(comments);
    expect(waiting.map((c) => c.id)).toEqual(["waiting-old", "waiting-new"]);
    expect(answered.map((c) => c.id)).toEqual(["answered-new", "answered-old"]);
  });
});
