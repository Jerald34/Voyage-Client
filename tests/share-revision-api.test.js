import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../app/lib/api/client.js", () => ({ API_URL: "/api", fetchApi: vi.fn() }));

import { fetchPublicShareRevision } from "../app/lib/api/index.js";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function respond(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe("fetchPublicShareRevision", () => {
  it("asks the revision endpoint for the share and returns the body", async () => {
    fetchMock.mockResolvedValue(respond(200, { revision: "rev-2" }));

    await expect(fetchPublicShareRevision("tok-1")).resolves.toEqual({ revision: "rev-2" });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/shared/tok-1/revision");
    // The answer has to be current every time; never a cached copy.
    expect(options.cache).toBe("no-store");
  });

  it("throws an error carrying the status and code the server sent", async () => {
    fetchMock.mockResolvedValue(
      respond(410, { error: { code: "SHARE_REVOKED", message: "This link was revoked." } }),
    );

    await expect(fetchPublicShareRevision("tok-1")).rejects.toMatchObject({
      status: 410,
      code: "SHARE_REVOKED",
      message: "This link was revoked.",
    });
  });

  it("still throws a usable error when the failure has no JSON body", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    });

    await expect(fetchPublicShareRevision("tok-1")).rejects.toMatchObject({
      status: 404,
      code: "UNKNOWN_ERROR",
    });
  });
});
