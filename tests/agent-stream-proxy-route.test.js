import { describe, it, expect, vi, afterEach } from "vitest";
import { GET } from "../app/api/stream/route.js";

function makeRequest(query = "agencyId=a1&runId=r1", cookie = "voyage_session=abc") {
  return {
    url: `http://localhost:3000/api/stream?${query}`,
    headers: new Headers({ cookie }),
    signal: new AbortController().signal,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("agent run SSE proxy route (/api/stream)", () => {
  it("pipes the upstream body through with event-stream headers", async () => {
    const upstreamBody = new ReadableStream({ start(c) { c.close(); } });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: upstreamBody,
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(res.headers.get("cache-control")).toContain("no-transform");
    expect(res.headers.get("x-accel-buffering")).toBe("no");
  });

  it("forwards the session cookie and targets the correct upstream run", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: new ReadableStream({ start(c) { c.close(); } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await GET(makeRequest("agencyId=a1&runId=r1", "voyage_session=xyz"));

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/agencies\/a1\/agent\/runs\/r1\/stream$/);
    expect(opts.headers.cookie).toBe("voyage_session=xyz");
    expect(opts.cache).toBe("no-store");
  });

  it("returns 400 when agencyId or runId is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(makeRequest("agencyId=a1"));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes through a non-OK upstream status", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      body: null,
      text: async () => "unauthorized",
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
  });

  it("returns 502 when the upstream fetch throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(makeRequest());

    expect(res.status).toBe(502);
  });
});
