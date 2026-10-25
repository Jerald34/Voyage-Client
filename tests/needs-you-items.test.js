import { describe, expect, it } from "vitest";
import fixtures from "./fixtures/dashboard-payloads.json";
import {
  OWNER_NEEDS_YOU_ORDER,
  STAFF_NEEDS_YOU_ORDER,
  buildNeedsYouItems,
  needsYouTarget,
} from "../app/agency/[agencyId]/components/dashboard/needsYouItems.js";

const NOW = Date.parse(fixtures.ownerBusy.generatedAt);
const ownerItems = () => buildNeedsYouItems(fixtures.ownerBusy.worklist, OWNER_NEEDS_YOU_ORDER, NOW);

describe("buildNeedsYouItems", () => {
  it("puts risks and deadlines before conversations and housekeeping", () => {
    expect(ownerItems().map((item) => item.kind)).toEqual([
      "lowRated",
      "sharesExpiring",
      "unreadComments",
      "unreadComments",
      "viewedNotReplied",
      "viewedNotReplied",
      "draftsStuck",
    ]);
  });

  it("answers the comment that has waited longest first", () => {
    const comments = ownerItems().filter((item) => item.kind === "unreadComments");
    expect(comments.map((item) => item.hint)).toEqual(["Waiting 1d", "Waiting 6h"]);
  });

  it("explains each row in plain words", () => {
    expect(ownerItems()[0]).toMatchObject({
      tone: "danger",
      subtitle: "Rated 2 out of 5",
      hint: "6d ago",
      actionLabel: "Open trip",
    });
  });

  it("gives every row a unique key", () => {
    const keys = ownerItems().map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("orders staff work by deadline, clients, upcoming trips, then drafts", () => {
    const items = buildNeedsYouItems(fixtures.staff.worklist, STAFF_NEEDS_YOU_ORDER, NOW);
    expect(items.map((item) => item.kind)).toEqual([
      "mySharesExpiring",
      "unreadComments",
      "unreadComments",
      "startingSoon",
      "myDraftsStuck",
    ]);
  });

  it("returns nothing for a missing worklist", () => {
    expect(buildNeedsYouItems(undefined, OWNER_NEEDS_YOU_ORDER, NOW)).toEqual([]);
  });
});

describe("needsYouTarget", () => {
  it("opens the trip panel at the comment, at the link, or at the top; drafts resume in the Planner", () => {
    const items = buildNeedsYouItems(fixtures.ownerBusy.worklist, OWNER_NEEDS_YOU_ORDER, NOW);
    const of = (kind) => items.find((item) => item.kind === kind);
    expect(needsYouTarget(of("unreadComments"))).toEqual({ to: "panel", focus: { type: "comment", id: of("unreadComments").rowId } });
    expect(needsYouTarget(of("sharesExpiring"))).toEqual({ to: "panel", focus: { type: "share" } });
    expect(needsYouTarget(of("lowRated"))).toEqual({ to: "panel", focus: null });
    expect(needsYouTarget(of("draftsStuck"))).toEqual({ to: "planner" });
  });

  it("calls the staff link action Extend, like the owner's", () => {
    const staffItems = buildNeedsYouItems(fixtures.staff.worklist, STAFF_NEEDS_YOU_ORDER, NOW);
    expect(staffItems.find((item) => item.kind === "mySharesExpiring").actionLabel).toBe("Extend");
  });

  it("keeps each row's own id for the panel to find", () => {
    const comment = ownerItems().find((item) => item.kind === "unreadComments");
    expect(comment.rowId).toBe(fixtures.ownerBusy.worklist.unreadComments.find((row) => comment.key.endsWith(row.id)).id);
  });
});
