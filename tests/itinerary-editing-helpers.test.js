import { describe, expect, it } from "vitest";
import {
  describeEditError,
  emptyStopForm,
  isItineraryLocked,
  otherDayOptions,
  shouldReloadAfterError,
  stopDisplayTitle,
  stopFormFromItem,
  stopMoveOptions,
  stopPatchFromForm,
  stopPayloadFromForm,
  validateStopForm,
} from "../app/lib/trip-dashboard/itineraryEditing.js";

const lunch = { id: "s2", type: "MEAL", title: "Lunch", startTime: "12:00 PM", endTime: null, description: "Noodles", clientNotes: null, staffNotes: "Call ahead" };
const days = [
  { id: "day-1", dayNumber: 1, title: "Arrival", items: [{ id: "s1" }, lunch] },
  { id: "day-2", dayNumber: 2, title: "", items: [] },
];

describe("isItineraryLocked", () => {
  it("locks when either the trip label or the itinerary status says approved", () => {
    expect(isItineraryLocked({ approvalStatus: "Approved", itineraryStatus: "NEEDS_REVIEW" })).toBe(true);
    expect(isItineraryLocked({ approvalStatus: "In review", itineraryStatus: "APPROVED_INTERNAL" })).toBe(true);
    expect(isItineraryLocked({ approvalStatus: "In review", itineraryStatus: "NEEDS_REVIEW" })).toBe(false);
  });
});

describe("stop forms", () => {
  it("fills a form from a stop, with empty strings for missing fields", () => {
    expect(stopFormFromItem(lunch)).toEqual({
      type: "MEAL",
      title: "Lunch",
      startTime: "12:00 PM",
      endTime: "",
      description: "Noodles",
      clientNotes: "",
      staffNotes: "Call ahead",
    });
  });

  it("falls back to Activity for a type the form doesn't offer", () => {
    expect(stopFormFromItem({ type: "SOMETHING_NEW", title: "x" }).type).toBe("ACTIVITY");
  });

  it("needs a title and keeps fields within the server's limits", () => {
    expect(validateStopForm({ ...emptyStopForm(), title: "  " })).toEqual({ title: "Add a title." });
    expect(validateStopForm({ ...emptyStopForm(), title: "x", startTime: "1".repeat(21) })).toEqual({
      startTime: "Keep this under 20 characters.",
    });
    expect(validateStopForm({ ...emptyStopForm(), title: "Museum" })).toEqual({});
  });

  it("builds a new stop without empty fields", () => {
    expect(stopPayloadFromForm({ ...emptyStopForm(), type: "NOTE", title: " Coffee ", startTime: "3:00 PM " })).toEqual({
      type: "NOTE",
      title: "Coffee",
      startTime: "3:00 PM",
    });
  });

  it("sends only what changed, with a cleared field as an empty string", () => {
    const form = { ...stopFormFromItem(lunch), startTime: "1:00 PM", description: "" };
    expect(stopPatchFromForm(form, lunch)).toEqual({ startTime: "1:00 PM", description: "" });
    expect(stopPatchFromForm(stopFormFromItem(lunch), lunch)).toEqual({});
  });
});

describe("moves", () => {
  it("offers up and down only where they make sense", () => {
    expect(stopMoveOptions(days, 0, 0)).toMatchObject({ canMoveUp: false, canMoveDown: true });
    expect(stopMoveOptions(days, 0, 1)).toMatchObject({ canMoveUp: true, canMoveDown: false });
  });

  it("lists the other days by number and title", () => {
    expect(otherDayOptions(days, 0)).toEqual([{ id: "day-2", label: "Day 2" }]);
    expect(otherDayOptions(days, 1)).toEqual([{ id: "day-1", label: "Day 1: Arrival" }]);
  });
});

describe("stopDisplayTitle", () => {
  it("prefers the stop's title, then its place", () => {
    expect(stopDisplayTitle(lunch)).toBe("Lunch");
    expect(stopDisplayTitle({ placeSnapshot: { name: "Museo" } })).toBe("Museo");
    expect(stopDisplayTitle(null)).toBe("this stop");
  });
});

describe("edit errors", () => {
  it("explains a lock and asks for a reload", () => {
    const error = { status: 409, code: "ITINERARY_LOCKED" };
    expect(describeEditError(error)).toMatch(/approved/i);
    expect(shouldReloadAfterError(error)).toBe(true);
  });

  it("asks for a reload when the stop is gone", () => {
    expect(shouldReloadAfterError({ status: 404, code: "ITINERARY_NOT_FOUND" })).toBe(true);
  });

  it("keeps the dialog for a network failure", () => {
    const error = { status: 0, code: "NETWORK_ERROR" };
    expect(describeEditError(error)).toMatch(/couldn't reach the server/i);
    expect(shouldReloadAfterError(error)).toBe(false);
  });
});
