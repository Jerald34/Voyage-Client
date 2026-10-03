import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchApi: vi.fn() }));

vi.mock("../app/lib/api/client.js", () => ({
  API_URL: "/api",
  fetchApi: (...args) => mocks.fetchApi(...args),
}));

import { resetCalendarCacheForTests, useCalendarEvents } from "../app/hooks/useCalendarEvents.js";

const OCT = new Date(2026, 9, 1);
const NOV = new Date(2026, 10, 1);

const payloadFrom = (from) => ({ from, to: "", generatedAt: "", tripsWithoutDates: 0, trips: [], events: [] });
const fromOf = (url) => new URLSearchParams(url.split("?")[1]).get("from");

/** A fetchApi call that stays open until the test settles it. */
function deferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  mocks.fetchApi.mockReset();
  resetCalendarCacheForTests();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useCalendarEvents", () => {
  it("asks for the six-week grid around the month", async () => {
    mocks.fetchApi.mockResolvedValue(payloadFrom("2026-09-27"));

    const { result } = renderHook(() => useCalendarEvents({ agencyId: "agency-1", month: OCT }));

    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(mocks.fetchApi).toHaveBeenCalledWith(
      "/agencies/agency-1/dashboard/calendar?from=2026-09-27&to=2026-11-07",
      { signal: expect.any(AbortSignal) },
    );
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

describe("useCalendarEvents requests", () => {
  it("drops a response that lands after the agency was cleared", async () => {
    const pending = deferred();
    mocks.fetchApi.mockReturnValue(pending.promise);
    const { result, rerender } = renderHook(({ agencyId }) => useCalendarEvents({ agencyId, month: OCT }), {
      initialProps: { agencyId: "a1" },
    });
    expect(result.current.isLoading).toBe(true);

    rerender({ agencyId: null });
    await act(async () => {
      pending.resolve(payloadFrom("2026-09-27"));
    });

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("aborts the request for the previous range when the month changes", async () => {
    mocks.fetchApi.mockImplementation(() => new Promise(() => {}));
    const { rerender } = renderHook(({ month }) => useCalendarEvents({ agencyId: "agency-1", month }), {
      initialProps: { month: OCT },
    });
    const firstSignal = mocks.fetchApi.mock.calls[0][1].signal;
    expect(firstSignal.aborted).toBe(false);

    rerender({ month: NOV });

    expect(firstSignal.aborted).toBe(true);
    expect(mocks.fetchApi.mock.calls[1][1].signal.aborted).toBe(false);
  });

  it("aborts an in-flight request when it unmounts", () => {
    mocks.fetchApi.mockImplementation(() => new Promise(() => {}));
    const { unmount } = renderHook(() => useCalendarEvents({ agencyId: "agency-1", month: OCT }));
    const { signal } = mocks.fetchApi.mock.calls[0][1];

    unmount();

    expect(signal.aborted).toBe(true);
  });

  it("does not report an aborted request as an error", async () => {
    // fetchApi turns every fetch failure, aborts included, into a network error.
    mocks.fetchApi.mockImplementation(
      (url, { signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener("abort", () => {
            reject(Object.assign(new Error("Unable to connect. Please try again."), { code: "NETWORK_ERROR", status: 0 }));
          });
        }),
    );
    const { result, rerender } = renderHook(({ month }) => useCalendarEvents({ agencyId: "agency-1", month }), {
      initialProps: { month: OCT },
    });

    mocks.fetchApi.mockImplementation(() => Promise.resolve(payloadFrom("2026-11-01")));
    rerender({ month: NOV });
    await waitFor(() => expect(result.current.data?.from).toBe("2026-11-01"));

    expect(result.current.error).toBeNull();
  });

  it("logs a rejected range once and still shows the error state", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.fetchApi.mockRejectedValue(Object.assign(new Error("bad range"), { code: "CALENDAR_RANGE_INVALID", status: 400 }));
    const { result } = renderHook(() => useCalendarEvents({ agencyId: "agency-1", month: OCT }));
    await waitFor(() => expect(result.current.error).not.toBeNull());

    await act(() => result.current.refetch());

    expect(result.current.error.code).toBe("CALENDAR_RANGE_INVALID");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("CALENDAR_RANGE_INVALID");
  });

  it("does not log other failures", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.fetchApi.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useCalendarEvents({ agencyId: "agency-1", month: OCT }));
    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(warn).not.toHaveBeenCalled();
  });
});

describe("useCalendarEvents session cache", () => {
  it("shows a month loaded earlier when the calendar is opened again", async () => {
    mocks.fetchApi.mockResolvedValue(payloadFrom("2026-09-27"));
    const first = renderHook(() => useCalendarEvents({ agencyId: "agency-1", month: OCT }));
    await waitFor(() => expect(first.result.current.data).not.toBeNull());
    first.unmount();

    mocks.fetchApi.mockImplementation(() => new Promise(() => {}));
    const second = renderHook(() => useCalendarEvents({ agencyId: "agency-1", month: OCT }));

    await waitFor(() => expect(second.result.current.data?.from).toBe("2026-09-27"));
  });

  it("keeps each agency's months apart", async () => {
    mocks.fetchApi.mockResolvedValue(payloadFrom("2026-09-27"));
    const first = renderHook(() => useCalendarEvents({ agencyId: "agency-1", month: OCT }));
    await waitFor(() => expect(first.result.current.data).not.toBeNull());
    first.unmount();

    mocks.fetchApi.mockImplementation(() => new Promise(() => {}));
    const second = renderHook(() => useCalendarEvents({ agencyId: "agency-2", month: OCT }));

    expect(second.result.current.data).toBeNull();
  });
});

describe("useCalendarEvents when the tab comes back", () => {
  function setHidden(value) {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => value });
  }

  afterEach(() => {
    delete document.hidden;
  });

  async function loaded() {
    mocks.fetchApi.mockResolvedValue(payloadFrom("2026-09-27"));
    const view = renderHook(() => useCalendarEvents({ agencyId: "agency-1", month: OCT }));
    await waitFor(() => expect(view.result.current.data).not.toBeNull());
    mocks.fetchApi.mockClear();
    return view;
  }

  it("refetches when the last fetch is older than the refresh interval", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 3, 10, 0, 0));
    await loaded();

    vi.setSystemTime(new Date(2026, 9, 3, 10, 5, 0));
    setHidden(false);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(mocks.fetchApi).toHaveBeenCalledTimes(1);
  });

  it("leaves a fresh calendar alone", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 3, 10, 0, 0));
    await loaded();

    vi.setSystemTime(new Date(2026, 9, 3, 10, 0, 20));
    setHidden(false);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(mocks.fetchApi).not.toHaveBeenCalled();
  });

  it("does nothing while the tab is hidden", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 3, 10, 0, 0));
    await loaded();

    vi.setSystemTime(new Date(2026, 9, 3, 10, 5, 0));
    setHidden(true);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(mocks.fetchApi).not.toHaveBeenCalled();
  });
});
