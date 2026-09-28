import { describe, expect, it } from "vitest";
import { describeWorklistItem } from "../app/agency/[agencyId]/components/dashboard/worklistContext.js";

const NOW = Date.parse("2026-09-27T04:00:00Z");
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const iso = (offsetMs) => new Date(NOW + offsetMs).toISOString();

describe("describeWorklistItem", () => {
  it("quotes an unread comment and says how long the client has waited", () => {
    const item = { commentExcerpt: "Can we swap the day 2 lunch spot?", createdAt: iso(-6 * HOUR) };

    expect(describeWorklistItem("unreadComments", item, NOW)).toEqual({
      subtitle: "“Can we swap the day 2 lunch spot?”",
      hint: "Waiting 6h",
    });
  });

  it("counts short waits in minutes and long ones in days", () => {
    const at = (offsetMs) => describeWorklistItem("unreadComments", { commentExcerpt: "Hi", createdAt: iso(offsetMs) }, NOW).hint;

    expect(at(-45 * MINUTE)).toBe("Waiting 45m");
    expect(at(-20 * 1000)).toBe("Waiting 1m");
    expect(at(-30 * HOUR)).toBe("Waiting 1d");
  });

  it("says how often and how recently the client viewed a proposal", () => {
    expect(describeWorklistItem("viewedNotReplied", { viewCount: 4, lastViewedAt: iso(-5 * HOUR) }, NOW)).toEqual({
      subtitle: "Viewed 4 times",
      hint: "Last viewed 5h ago",
    });
    expect(describeWorklistItem("viewedNotReplied", { viewCount: 1, lastViewedAt: iso(-2 * DAY) }, NOW).subtitle).toBe(
      "Viewed once",
    );
  });

  it.each(["draftsStuck", "myDraftsStuck"])("says when a stuck draft (%s) was last edited", (kind) => {
    expect(describeWorklistItem(kind, { updatedAt: iso(-9 * DAY) }, NOW)).toEqual({
      subtitle: null,
      hint: "Last edited 9d ago",
    });
  });

  it.each(["sharesExpiring", "mySharesExpiring"])("says when a shared link (%s) expires", (kind) => {
    expect(describeWorklistItem(kind, { expiresAt: iso(20 * HOUR) }, NOW)).toEqual({
      subtitle: null,
      hint: "Link expires in 20h",
    });
  });

  it("says a link has expired once its time has passed", () => {
    expect(describeWorklistItem("sharesExpiring", { expiresAt: iso(-1000) }, NOW).hint).toBe("Link has expired");
  });

  it("shows a low rating out of five and when it was given", () => {
    expect(describeWorklistItem("lowRated", { rating: 2, ratedAt: iso(-6 * DAY) }, NOW)).toEqual({
      subtitle: "Rated 2 out of 5",
      hint: "6d ago",
    });
  });

  it("says when an upcoming trip starts", () => {
    const starts = (daysToStart) => describeWorklistItem("startingSoon", { daysToStart }, NOW).hint;

    expect(starts(0)).toBe("Starts today");
    expect(starts(1)).toBe("Starts tomorrow");
    expect(starts(3)).toBe("Starts in 3 days");
  });

  it("leaves out context it cannot work out", () => {
    expect(describeWorklistItem("unreadComments", { commentExcerpt: "", createdAt: "not a date" }, NOW)).toEqual({
      subtitle: null,
      hint: null,
    });
    expect(describeWorklistItem("somethingNew", { tripId: "trip-1" }, NOW)).toEqual({ subtitle: null, hint: null });
  });
});
