import { act, renderHook, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchApi: vi.fn() }));
vi.mock("../app/lib/api/client.js", () => ({ API_URL: "/api", fetchApi: (...args) => mocks.fetchApi(...args) }));

import { useTripPreview } from "../app/hooks/useTripPreview.js";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => mocks.fetchApi.mockReset());

describe("useTripPreview", () => {
  it("loads the trip while enabled", async () => {
    mocks.fetchApi.mockResolvedValue({ trip: { id: "t1", title: "Kyoto" }, share: null, comments: [] });
    const { result } = renderHook(() => useTripPreview({ agencyId: "a1", tripId: "t1", enabled: true }));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data?.trip.title).toBe("Kyoto"));
    expect(result.current.loading).toBe(false);
  });

  it("does nothing while disabled", () => {
    renderHook(() => useTripPreview({ agencyId: "a1", tripId: "t1", enabled: false }));
    expect(mocks.fetchApi).not.toHaveBeenCalled();
  });

  it("keeps the open trip when an earlier trip's answer lands late", async () => {
    const first = deferred();
    const second = deferred();
    mocks.fetchApi.mockImplementation((path) => (String(path).endsWith("/t1") ? first.promise : second.promise));
    const { result, rerender } = renderHook((props) => useTripPreview(props), {
      initialProps: { agencyId: "a1", tripId: "t1", enabled: true },
    });
    rerender({ agencyId: "a1", tripId: "t2", enabled: true });
    await act(async () => second.resolve({ trip: { id: "t2", title: "Baguio" }, share: null, comments: [] }));
    await act(async () => first.resolve({ trip: { id: "t1", title: "Kyoto" }, share: null, comments: [] }));
    expect(result.current.data.trip.title).toBe("Baguio");
  });

  it("reports a failure and loads again on reload", async () => {
    mocks.fetchApi.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce({ trip: { id: "t1" }, share: null, comments: [] });
    const { result } = renderHook(() => useTripPreview({ agencyId: "a1", tripId: "t1", enabled: true }));
    await waitFor(() => expect(result.current.error).toBeTruthy());
    await act(async () => result.current.reload());
    await waitFor(() => expect(result.current.data?.trip.id).toBe("t1"));
    expect(result.current.error).toBeNull();
  });

  it("applies local edits with update", async () => {
    mocks.fetchApi.mockResolvedValue({ trip: { id: "t1" }, share: { expiresAt: "a" }, comments: [] });
    const { result } = renderHook(() => useTripPreview({ agencyId: "a1", tripId: "t1", enabled: true }));
    await waitFor(() => expect(result.current.data).toBeTruthy());
    act(() => result.current.update((prev) => ({ ...prev, share: { expiresAt: "b" } })));
    expect(result.current.data.share.expiresAt).toBe("b");
  });

  it("still settles with data when StrictMode runs the effect twice", async () => {
    mocks.fetchApi.mockResolvedValue({ trip: { id: "t1", title: "Kyoto" }, share: null, comments: [] });
    const { result } = renderHook(() => useTripPreview({ agencyId: "a1", tripId: "t1", enabled: true }), {
      wrapper: StrictMode,
    });
    await waitFor(() => expect(result.current.data?.trip.title).toBe("Kyoto"));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
