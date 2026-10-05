import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  addItineraryStop: vi.fn(),
  updateItineraryStop: vi.fn(),
  deleteItineraryStop: vi.fn(),
  moveItineraryStop: vi.fn(),
  renameItineraryDay: vi.fn(),
}));
vi.mock("../app/lib/api/itineraryEditing.js", () => api);

import { useItineraryEditor } from "../app/hooks/useItineraryEditor.js";
import { emptyStopForm, stopFormFromItem } from "../app/lib/trip-dashboard/itineraryEditing.js";

const museum = { id: "s1", type: "ACTIVITY", title: "Museum" };
const lunch = { id: "s2", type: "MEAL", title: "Lunch" };
const day1 = { id: "day-1", dayNumber: 1, title: "Arrival", items: [museum, lunch] };
const updated = { itinerary: { id: "itin-1", days: [] } };

function setup(overrides = {}) {
  const onItineraryChange = vi.fn();
  const reload = vi.fn();
  const hook = renderHook((props) => useItineraryEditor(props), {
    initialProps: { agencyId: "ag-1", itineraryId: "itin-1", canEdit: true, onItineraryChange, reload, ...overrides },
  });
  return { ...hook, onItineraryChange, reload };
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(api).forEach((fn) => fn.mockResolvedValue(updated));
});

describe("useItineraryEditor", () => {
  it("adds a custom stop, hands over the new itinerary and closes the dialog", async () => {
    const { result, onItineraryChange } = setup();
    act(() => result.current.openAddStop(day1));
    expect(result.current.dialog).toMatchObject({ kind: "addStop", day: day1 });

    let outcome;
    await act(async () => {
      outcome = await result.current.submitStop({ ...emptyStopForm(), type: "NOTE", title: " Coffee " });
    });

    expect(api.addItineraryStop).toHaveBeenCalledWith("ag-1", "itin-1", "day-1", { type: "NOTE", title: "Coffee" });
    expect(onItineraryChange).toHaveBeenCalledWith(updated);
    expect(outcome).toEqual({ ok: true });
    expect(result.current.dialog).toBeNull();
  });

  it("sends only the changed fields when editing a stop", async () => {
    const { result } = setup();
    act(() => result.current.openEditStop(day1, museum));

    await act(async () => {
      await result.current.submitStop({ ...stopFormFromItem(museum), startTime: "9:00 AM" });
    });

    expect(api.updateItineraryStop).toHaveBeenCalledWith("ag-1", "itin-1", "s1", { startTime: "9:00 AM" });
  });

  it("closes without a request when nothing changed", async () => {
    const { result } = setup();
    act(() => result.current.openEditStop(day1, museum));

    await act(async () => {
      await result.current.submitStop(stopFormFromItem(museum));
    });

    expect(api.updateItineraryStop).not.toHaveBeenCalled();
    expect(result.current.dialog).toBeNull();
  });

  it("keeps the dialog open with the message when the save fails for another reason", async () => {
    api.updateItineraryStop.mockRejectedValue(Object.assign(new Error("offline"), { status: 0, code: "NETWORK_ERROR" }));
    const { result, reload } = setup();
    act(() => result.current.openEditStop(day1, museum));

    let outcome;
    await act(async () => {
      outcome = await result.current.submitStop({ ...stopFormFromItem(museum), title: "Art museum" });
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.message).toMatch(/couldn't reach the server/i);
    expect(result.current.dialog).toMatchObject({ kind: "editStop" });
    expect(reload).not.toHaveBeenCalled();
  });

  it("closes, explains and reloads when the trip was approved meanwhile", async () => {
    api.deleteItineraryStop.mockRejectedValue(Object.assign(new Error("locked"), { status: 409, code: "ITINERARY_LOCKED" }));
    const { result, reload } = setup();
    act(() => result.current.openDeleteStop(day1, lunch));

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(reload).toHaveBeenCalledOnce();
    expect(result.current.dialog).toBeNull();
    expect(result.current.notice).toMatch(/approved/i);
  });

  it("moves a stop by sending its new position", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.moveStopBy(day1, 0, 1);
    });
    expect(api.moveItineraryStop).toHaveBeenLastCalledWith("ag-1", "itin-1", "s1", { toDayId: "day-1", toSortOrder: 2 });

    await act(async () => {
      await result.current.moveStopBy(day1, 1, -1);
    });
    expect(api.moveItineraryStop).toHaveBeenLastCalledWith("ag-1", "itin-1", "s2", { toDayId: "day-1", toSortOrder: 1 });
  });

  it("moves a stop to the end of another day", async () => {
    const { result } = setup();
    act(() => result.current.openMoveStop(day1, lunch));

    await act(async () => {
      await result.current.submitMove("day-2");
    });

    expect(api.moveItineraryStop).toHaveBeenCalledWith("ag-1", "itin-1", "s2", { toDayId: "day-2" });
  });

  it("renames a day with a trimmed title", async () => {
    const { result } = setup();
    act(() => result.current.openRenameDay(day1));

    await act(async () => {
      await result.current.submitRenameDay("  Old town ");
    });

    expect(api.renameItineraryDay).toHaveBeenCalledWith("ag-1", "itin-1", "day-1", "Old town");
  });

  it("does nothing while editing is off", async () => {
    const { result } = setup({ canEdit: false });
    act(() => result.current.openAddStop(day1));

    await act(async () => {
      await result.current.moveStopBy(day1, 0, 1);
    });

    expect(result.current.dialog).toBeNull();
    expect(api.moveItineraryStop).not.toHaveBeenCalled();
  });

  it("closes an open dialog when the page switches itinerary", () => {
    const { result, rerender, onItineraryChange, reload } = setup();
    act(() => result.current.openAddStop(day1));

    rerender({ agencyId: "ag-1", itineraryId: "itin-2", canEdit: true, onItineraryChange, reload });

    expect(result.current.dialog).toBeNull();
  });
});
