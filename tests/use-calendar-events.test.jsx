import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchApi: vi.fn() }));

vi.mock("../app/lib/api/client.js", () => ({
  API_URL: "/api",
  fetchApi: (...args) => mocks.fetchApi(...args),
}));

import { useCalendarEvents } from "../app/hooks/useCalendarEvents.js";

const OCT = new Date(2026, 9, 1);
const NOV = new Date(2026, 10, 1);

const payloadFrom = (from) => ({ from, to: "", generatedAt: "", tripsWithoutDates: 0, trips: [], events: [] });
const fromOf = (url) => new URLSearchParams(url.split("?")[1]).get("from");

beforeEach(() => {
  mocks.fetchApi.mockReset();
});

describe("useCalendarEvents", () => {
  it("asks for the six-week grid around the month", async () => {
    mocks.fetchApi.mockResolvedValue(payloadFrom("2026-09-27"));

    const { result } = renderHook(() => useCalendarEvents({ agencyId: "agency-1", month: OCT }));

    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(mocks.fetchApi).toHaveBeenCalledWith("/agencies/agency-1/dashboard/calendar?from=2026-09-27&to=2026-11-07");
  });

  it("keeps the last good calendar when a refresh fails", async () => {
    mocks.fetchApi.mockResolvedValueOnce(payloadFrom("2026-09-27"));
    const { result } = renderHook(() => useCalendarEvents({ agencyId: "agency-1", month: OCT }));
    await waitFor(() => expect(result.current.data).not.toBeNull());

    mocks.fetchApi.mockRejectedValueOnce(new Error("offline"));
    await act(() => result.current.refetch());

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.data).toEqual(payloadFrom("2026-09-27"));
  });

  it("shows a month it already loaded straight away", async () => {
    mocks.fetchApi.mockImplementation((url) => Promise.resolve(payloadFrom(fromOf(url))));
    const { result, rerender } = renderHook(({ month }) => useCalendarEvents({ agencyId: "agency-1", month }), {
      initialProps: { month: OCT },
    });
    await waitFor(() => expect(result.current.data?.from).toBe("2026-09-27"));

    rerender({ month: NOV });
    await waitFor(() => expect(result.current.data?.from).toBe("2026-11-01"));

    mocks.fetchApi.mockImplementation(() => new Promise(() => {}));
    rerender({ month: OCT });
    expect(result.current.data?.from).toBe("2026-09-27");
  });

  it("does nothing without an agency", () => {
    renderHook(() => useCalendarEvents({ agencyId: null, month: OCT }));
    expect(mocks.fetchApi).not.toHaveBeenCalled();
  });
});
