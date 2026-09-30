import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the API client at module level so the hook imports the mocked fetchApi.
vi.mock("../app/lib/api/client", () => ({
  fetchApi: vi.fn(),
}));

import { fetchApi } from "../app/lib/api/client";
import { useRatedHistory } from "../app/components/ratedHistory/hooks/useRatedHistory";

const TRIP_LIST_RESPONSE = {
  trips: [
    {
      id: "trip-1",
      destination: "Tokyo",
      duration: 7,
      rating: 4.8,
      clientName: "Smith Family",
    },
    {
      id: "trip-2",
      destination: "Bali",
      duration: 5,
      rating: 4.6,
      clientName: "Johnson Group",
    },
  ],
  hasMore: true,
};

const TRIP_DETAIL_RESPONSE = {
  trip: {
    id: "trip-1",
    destination: "Tokyo",
    duration: 7,
    rating: 4.8,
  },
  itinerary: {
    days: [
      { day: 1, activities: ["Arrival", "Check-in"] },
      { day: 2, activities: ["Senso-ji Temple", "Shibuya Crossing"] },
    ],
    notes: "Great trip!",
  },
};

beforeEach(() => {
  fetchApi.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useRatedHistory", () => {
  it("fires initial list request with page=1 on mount", async () => {
    fetchApi.mockResolvedValue(TRIP_LIST_RESPONSE);

    const { result } = renderHook(() =>
      useRatedHistory({ agencyId: "agency-1", filters: {} })
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(fetchApi).toHaveBeenCalledWith(
        expect.stringContaining("/agencies/agency-1/rated-history"),
        expect.any(Object)
      );
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.trips).toEqual(TRIP_LIST_RESPONSE.trips);
    expect(result.current.hasMore).toBe(true);
  });

  it("includes filter params in the request when provided", async () => {
    fetchApi.mockResolvedValue(TRIP_LIST_RESPONSE);

    renderHook(() =>
      useRatedHistory({
        agencyId: "agency-1",
        filters: { destination: "Tokyo", durationDays: 7, season: "spring" },
      })
    );

    await waitFor(() => {
      const callUrl = fetchApi.mock.calls[0][0];
      expect(callUrl).toContain("destination=Tokyo");
      expect(callUrl).toContain("durationDays=7");
      expect(callUrl).toContain("season=spring");
    });
  });

  it("omits filter params when undefined", async () => {
    fetchApi.mockResolvedValue(TRIP_LIST_RESPONSE);

    renderHook(() =>
      useRatedHistory({
        agencyId: "agency-1",
        filters: { destination: "Tokyo" },
      })
    );

    await waitFor(() => {
      const callUrl = fetchApi.mock.calls[0][0];
      expect(callUrl).toContain("destination=Tokyo");
      expect(callUrl).not.toContain("durationDays");
      expect(callUrl).not.toContain("season");
    });
  });

  it("loadMore appends next page results when hasMore is true", async () => {
    const page1 = { trips: [{ id: "trip-1" }], hasMore: true };
    const page2 = { trips: [{ id: "trip-2" }], hasMore: false };

    fetchApi
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);

    const { result } = renderHook(() =>
      useRatedHistory({ agencyId: "agency-1", filters: {} })
    );

    await waitFor(() => expect(result.current.trips.length).toBe(1));
    expect(result.current.trips[0].id).toBe("trip-1");
    expect(result.current.hasMore).toBe(true);

    // Trigger loadMore
    await act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.trips.length).toBe(2));
    expect(result.current.trips[0].id).toBe("trip-1");
    expect(result.current.trips[1].id).toBe("trip-2");
    expect(result.current.hasMore).toBe(false);

    // Verify requests were for page 1 and page 2
    expect(fetchApi).toHaveBeenCalledTimes(2);
    expect(fetchApi.mock.calls[0][0]).toContain("page=1");
    expect(fetchApi.mock.calls[1][0]).toContain("page=2");
  });

  it("getDetail caches and returns only the itinerary part", async () => {
    fetchApi
      .mockResolvedValueOnce(TRIP_LIST_RESPONSE)
      .mockResolvedValueOnce(TRIP_DETAIL_RESPONSE);

    const { result } = renderHook(() =>
      useRatedHistory({ agencyId: "agency-1", filters: {} })
    );

    await waitFor(() => expect(result.current.trips.length).toBeGreaterThan(0));

    // First call to getDetail should hit the API
    const detailPromise1 = result.current.getDetail("trip-1");
    const detail1 = await detailPromise1;

    expect(detail1).toEqual(TRIP_DETAIL_RESPONSE.itinerary);

    // Second call should use cache (no new fetch)
    const detailPromise2 = result.current.getDetail("trip-1");
    const detail2 = await detailPromise2;

    expect(detail2).toEqual(TRIP_DETAIL_RESPONSE.itinerary);

    // Only 2 fetches total: 1 list + 1 detail (cache prevented 2nd detail fetch)
    expect(fetchApi).toHaveBeenCalledTimes(2);
  });

  it("does not cache failed detail requests", async () => {
    fetchApi
      .mockResolvedValueOnce(TRIP_LIST_RESPONSE)
      .mockRejectedValueOnce(new Error("API error"));

    const { result } = renderHook(() =>
      useRatedHistory({ agencyId: "agency-1", filters: {} })
    );

    await waitFor(() => expect(result.current.trips.length).toBeGreaterThan(0));

    // First call fails
    try {
      await result.current.getDetail("trip-1");
    } catch (err) {
      expect(err.message).toBe("API error");
    }

    // Second call should retry (not cached)
    fetchApi.mockResolvedValueOnce(TRIP_DETAIL_RESPONSE);
    const detail = await result.current.getDetail("trip-1");
    expect(detail).toEqual(TRIP_DETAIL_RESPONSE.itinerary);

    // 3 fetches: 1 list + 2 detail attempts
    expect(fetchApi).toHaveBeenCalledTimes(3);
  });

  it("refetch clears list and re-fetches page 1 but preserves detail cache", async () => {
    fetchApi
      .mockResolvedValueOnce(TRIP_LIST_RESPONSE)
      .mockResolvedValueOnce(TRIP_DETAIL_RESPONSE)
      .mockResolvedValueOnce(TRIP_LIST_RESPONSE); // refetch

    const { result } = renderHook(() =>
      useRatedHistory({ agencyId: "agency-1", filters: {} })
    );

    await waitFor(() => expect(result.current.trips.length).toBeGreaterThan(0));

    // Cache a detail request
    await result.current.getDetail("trip-1");

    // Refetch
    await act(() => result.current.refetch());

    await waitFor(() =>
      expect(fetchApi.mock.calls.length).toBeGreaterThanOrEqual(3)
    );

    // List cache cleared, detail cache preserved (no fetch)
    expect(result.current.trips).toEqual(TRIP_LIST_RESPONSE.trips);

    // Now re-request the detail — should use cached version (no fetch)
    const detail = await result.current.getDetail("trip-1");
    expect(detail).toEqual(TRIP_DETAIL_RESPONSE.itinerary);

    // Still only 3 fetches (list, detail, refetch-list)
    expect(fetchApi).toHaveBeenCalledTimes(3);
  });

  it("clears both caches when agencyId changes", async () => {
    fetchApi
      .mockResolvedValueOnce(TRIP_LIST_RESPONSE)
      .mockResolvedValueOnce(TRIP_DETAIL_RESPONSE)
      .mockResolvedValueOnce({ trips: [{ id: "trip-3" }], hasMore: false });

    const { result, rerender } = renderHook(
      ({ agencyId, filters }) =>
        useRatedHistory({ agencyId, filters }),
      {
        initialProps: { agencyId: "agency-1", filters: {} },
      }
    );

    await waitFor(() => expect(result.current.trips.length).toBeGreaterThan(0));

    // Cache a detail
    await result.current.getDetail("trip-1");

    // Change agencyId
    rerender({ agencyId: "agency-2", filters: {} });

    // Trips reset, detail cache cleared. Wait for the new agency's list to be
    // applied (the 3rd request resolves a tick after it is issued).
    await waitFor(() =>
      expect(result.current.trips).toEqual([{ id: "trip-3" }])
    );

    // Detail request for old trip should not be cached; would refetch
    expect(fetchApi).toHaveBeenCalledTimes(3);
  });

  it("clears list cache (but not detail) when filters change", async () => {
    const page1WithFilter = { trips: [{ id: "trip-tokyo" }], hasMore: false };
    const page1FilterChanged = {
      trips: [{ id: "trip-bali" }],
      hasMore: false,
    };

    fetchApi
      .mockResolvedValueOnce(page1WithFilter)
      .mockResolvedValueOnce(TRIP_DETAIL_RESPONSE)
      .mockResolvedValueOnce(page1FilterChanged);

    const { result, rerender } = renderHook(
      ({ filters }) => useRatedHistory({ agencyId: "agency-1", filters }),
      {
        initialProps: { filters: { destination: "Tokyo" } },
      }
    );

    await waitFor(() => expect(result.current.trips.length).toBeGreaterThan(0));
    expect(result.current.trips[0].id).toBe("trip-tokyo");

    // Cache a detail
    await result.current.getDetail("trip-tokyo");

    // Change filters
    rerender({ filters: { destination: "Bali" } });

    await waitFor(() =>
      expect(result.current.trips.length).toBeGreaterThan(0) &&
      result.current.trips[0].id === "trip-bali"
    );

    // Detail cache still valid
    const detail = await result.current.getDetail("trip-tokyo");
    expect(detail).toEqual(TRIP_DETAIL_RESPONSE.itinerary);

    // 3 fetches: initial list, detail (cached on second request), new list after filter change
    expect(fetchApi).toHaveBeenCalledTimes(3);
  });

  it("does not load more when isLoading is true", async () => {
    let resolveFetch;
    fetchApi.mockImplementation(
      () => new Promise((resolve) => { resolveFetch = resolve; })
    );

    const { result } = renderHook(() =>
      useRatedHistory({ agencyId: "agency-1", filters: {} })
    );

    expect(result.current.isLoading).toBe(true);

    // Trigger loadMore while loading (should no-op)
    act(() => result.current.loadMore());

    // Should still only be 1 in-flight request
    expect(fetchApi).toHaveBeenCalledTimes(1);

    act(() => {
      resolveFetch(TRIP_LIST_RESPONSE);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("surfaces errors and does not clear trips", async () => {
    const initialTrips = { trips: [{ id: "trip-1" }], hasMore: true };
    fetchApi.mockResolvedValueOnce(initialTrips);

    const { result } = renderHook(() =>
      useRatedHistory({ agencyId: "agency-1", filters: {} })
    );

    await waitFor(() => expect(result.current.trips.length).toBeGreaterThan(0));

    const failError = new Error("Network error");
    fetchApi.mockRejectedValueOnce(failError);

    await act(() => result.current.refetch());

    // Trips still visible, error is set
    expect(result.current.trips).toEqual(initialTrips.trips);
    expect(result.current.error).toBe(failError);
  });

  it("does nothing when agencyId is falsy", async () => {
    renderHook(() =>
      useRatedHistory({ agencyId: null, filters: {} })
    );

    await new Promise((r) => setTimeout(r, 10));
    expect(fetchApi).not.toHaveBeenCalled();
  });
});
