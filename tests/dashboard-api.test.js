import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchApi: vi.fn() }));
vi.mock("../app/lib/api/client.js", () => ({ API_URL: "/api", fetchApi: (...args) => mocks.fetchApi(...args) }));

import { extendShare, fetchTripPreview } from "../app/lib/api/index.js";

beforeEach(() => mocks.fetchApi.mockReset().mockResolvedValue({}));

describe("dashboard API helpers", () => {
  it("reads one trip for the trip panel", async () => {
    await fetchTripPreview("agency-1", "trip-1");
    expect(mocks.fetchApi).toHaveBeenCalledWith("/agencies/agency-1/dashboard/trips/trip-1");
  });

  it("extends a share link by the chosen days", async () => {
    await extendShare("agency-1", "share-1", 30);
    expect(mocks.fetchApi).toHaveBeenCalledWith("/agencies/agency-1/shares/share-1/expiry", {
      method: "PATCH",
      body: JSON.stringify({ extendDays: 30 }),
    });
  });
});
