import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_URL } from "../app/lib/api/client.js";
import {
  addItineraryStop,
  deleteItineraryStop,
  moveItineraryStop,
  renameItineraryDay,
  reopenClientTrip,
  updateItineraryStop,
} from "../app/lib/api/itineraryEditing.js";

const body = { itinerary: { id: "itin-1", days: [] } };

describe("itinerary editing API", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body, headers: new Headers() });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  function lastRequest() {
    const [url, options] = fetchMock.mock.calls.at(-1);
    return { url, method: options.method, body: options.body ? JSON.parse(options.body) : undefined };
  }

  const itineraryPath = `${API_URL}/agencies/ag-1/itineraries/itin-1`;

  it("renames a day", async () => {
    await expect(renameItineraryDay("ag-1", "itin-1", "day-1", "Old town")).resolves.toEqual(body);
    expect(lastRequest()).toEqual({ url: `${itineraryPath}/days/day-1`, method: "PATCH", body: { title: "Old town" } });
  });

  it("adds a stop to a day", async () => {
    await addItineraryStop("ag-1", "itin-1", "day-1", { type: "NOTE", title: "Coffee" });
    expect(lastRequest()).toEqual({ url: `${itineraryPath}/days/day-1/items`, method: "POST", body: { type: "NOTE", title: "Coffee" } });
  });

  it("updates a stop", async () => {
    await updateItineraryStop("ag-1", "itin-1", "s1", { startTime: "9:00 AM" });
    expect(lastRequest()).toEqual({ url: `${itineraryPath}/items/s1`, method: "PATCH", body: { startTime: "9:00 AM" } });
  });

  it("deletes a stop", async () => {
    await deleteItineraryStop("ag-1", "itin-1", "s1");
    expect(lastRequest()).toEqual({ url: `${itineraryPath}/items/s1`, method: "DELETE", body: undefined });
  });

  it("moves a stop", async () => {
    await moveItineraryStop("ag-1", "itin-1", "s1", { toDayId: "day-2" });
    expect(lastRequest()).toEqual({ url: `${itineraryPath}/items/s1/move`, method: "POST", body: { toDayId: "day-2" } });
  });

  it("reopens a trip", async () => {
    await reopenClientTrip("ag-1", "t1");
    expect(lastRequest()).toEqual({ url: `${API_URL}/agencies/ag-1/itineraries/trips/t1/reopen`, method: "POST", body: undefined });
  });
});
