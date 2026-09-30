import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the API client at module level so the hook imports the mocked fetchApi.
vi.mock("../app/lib/api/client", () => ({
  fetchApi: vi.fn()
}));

import { fetchApi } from "../app/lib/api/client";
import { useDashboardPoll } from "../app/hooks/useDashboardPoll";

const PAYLOAD = { view: "owner", period: "30d", generatedAt: "2026-05-26T12:00:00Z" };

beforeEach(() => {
  fetchApi.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDashboardPoll", () => {
  it("seeds with initialData and fires an initial fetch", async () => {
    fetchApi.mockResolvedValue(PAYLOAD);
    const { result } = renderHook(() =>
      useDashboardPoll({
        agencyId: "agency-1",
        view: "owner",
        period: "30d",
        initialData: PAYLOAD,
        intervalMs: 60_000
      })
    );
    expect(result.current.data).toEqual(PAYLOAD);
    await waitFor(() => expect(fetchApi).toHaveBeenCalledTimes(1));
  });

  it("returns updated data after refetch resolves", async () => {
    fetchApi.mockResolvedValueOnce(PAYLOAD);
    const { result } = renderHook(() =>
      useDashboardPoll({
        agencyId: "agency-1",
        view: "owner",
        period: "30d",
        initialData: null,
        intervalMs: 60_000
      })
    );

    await waitFor(() => expect(result.current.data).toEqual(PAYLOAD));

    const next = { ...PAYLOAD, generatedAt: "later" };
    fetchApi.mockResolvedValueOnce(next);
    await act(() => result.current.refetch());
    expect(result.current.data).toEqual(next);
  });

  it("dedupes in-flight requests", async () => {
    let resolveFetch;
    fetchApi.mockImplementation(
      () => new Promise((resolve) => { resolveFetch = resolve; })
    );

    const { result } = renderHook(() =>
      useDashboardPoll({
        agencyId: "agency-1",
        view: "owner",
        period: "30d",
        initialData: PAYLOAD,
        intervalMs: 60_000
      })
    );

    // Trigger a second refetch while the first is in flight.
    await act(async () => {
      result.current.refetch();
      result.current.refetch();
    });

    // Only one underlying fetch should have been issued.
    expect(fetchApi).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFetch(PAYLOAD);
    });
  });

  it("preserves previous data on fetch error and surfaces it via `error`", async () => {
    fetchApi.mockResolvedValueOnce(PAYLOAD); // initial
    const { result } = renderHook(() =>
      useDashboardPoll({
        agencyId: "agency-1",
        view: "owner",
        period: "30d",
        initialData: null,
        intervalMs: 60_000
      })
    );
    await waitFor(() => expect(result.current.data).toEqual(PAYLOAD));

    const fail = new Error("boom");
    fetchApi.mockRejectedValueOnce(fail);
    await act(async () => {
      try {
        await result.current.refetch();
      } catch {}
    });

    expect(result.current.data).toEqual(PAYLOAD); // still showing previous good data
    expect(result.current.error).toBe(fail);
  });

  it("does nothing when enabled is false", async () => {
    fetchApi.mockResolvedValue(PAYLOAD);
    renderHook(() =>
      useDashboardPoll({
        agencyId: "agency-1",
        view: "owner",
        period: "30d",
        initialData: null,
        intervalMs: 60_000,
        enabled: false
      })
    );
    // No fetch should have been issued.
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchApi).not.toHaveBeenCalled();
  });

  it("does nothing when agencyId is falsy", async () => {
    fetchApi.mockResolvedValue(PAYLOAD);
    renderHook(() =>
      useDashboardPoll({
        agencyId: null,
        view: "owner",
        period: "30d",
        initialData: null,
        intervalMs: 60_000
      })
    );
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchApi).not.toHaveBeenCalled();
  });
});
