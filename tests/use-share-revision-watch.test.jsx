import { StrictMode } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ fetchPublicShareRevision: vi.fn() }));
vi.mock("../app/lib/api/index.js", () => api);

import { useShareRevisionWatch } from "../app/hooks/useShareRevisionWatch.js";

const POLL_MS = 30_000;

let visibility = "visible";

function setVisibility(next) {
  visibility = next;
  document.dispatchEvent(new Event("visibilitychange"));
}

/** Runs the timers for `ms` and lets the promises they started settle. */
async function tick(ms) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function watch(props, options) {
  return renderHook((hookProps) => useShareRevisionWatch(hookProps), {
    initialProps: { token: "tok-1", revision: "rev-1", ...props },
    ...options,
  });
}

beforeEach(() => {
  api.fetchPublicShareRevision.mockReset();
  api.fetchPublicShareRevision.mockResolvedValue({ revision: "rev-1" });
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  delete document.visibilityState;
});

describe("useShareRevisionWatch", () => {
  it("never polls when the page has no revision (an older server)", async () => {
    const { result } = watch({ revision: undefined });

    await tick(10 * POLL_MS);

    expect(api.fetchPublicShareRevision).not.toHaveBeenCalled();
    expect(result.current.updateAvailable).toBe(false);
  });

  it("never polls without a share token", async () => {
    watch({ token: null });

    await tick(3 * POLL_MS);

    expect(api.fetchPublicShareRevision).not.toHaveBeenCalled();
  });

  it("checks the share's revision every 30 seconds while the tab is visible", async () => {
    watch();

    await tick(POLL_MS - 1);
    expect(api.fetchPublicShareRevision).not.toHaveBeenCalled();

    await tick(1);
    expect(api.fetchPublicShareRevision).toHaveBeenCalledTimes(1);
    expect(api.fetchPublicShareRevision).toHaveBeenCalledWith("tok-1");

    await tick(POLL_MS);
    expect(api.fetchPublicShareRevision).toHaveBeenCalledTimes(2);
  });

  it("stays quiet while the revision is unchanged", async () => {
    const { result } = watch();

    await tick(3 * POLL_MS);

    expect(result.current.updateAvailable).toBe(false);
  });

  it("ignores a response that carries no revision", async () => {
    api.fetchPublicShareRevision.mockResolvedValue({});
    const { result } = watch();

    await tick(POLL_MS);

    expect(result.current.updateAvailable).toBe(false);
  });

  it("reports an update when the revision differs, then stops polling", async () => {
    api.fetchPublicShareRevision.mockResolvedValue({ revision: "rev-2" });
    const { result } = watch();

    await tick(POLL_MS);
    expect(result.current.updateAvailable).toBe(true);

    await tick(5 * POLL_MS);
    expect(api.fetchPublicShareRevision).toHaveBeenCalledTimes(1);
  });

  it("pauses while the tab is hidden and checks at once when it is visible again", async () => {
    watch();

    act(() => setVisibility("hidden"));
    await tick(5 * POLL_MS);
    expect(api.fetchPublicShareRevision).not.toHaveBeenCalled();

    await act(async () => {
      setVisibility("visible");
    });
    expect(api.fetchPublicShareRevision).toHaveBeenCalledTimes(1);

    // The interval restarts from the check, not from the last tick before hiding.
    await tick(POLL_MS - 1);
    expect(api.fetchPublicShareRevision).toHaveBeenCalledTimes(1);
    await tick(1);
    expect(api.fetchPublicShareRevision).toHaveBeenCalledTimes(2);
  });

  it("reports the update found by the check on return", async () => {
    const { result } = watch();
    act(() => setVisibility("hidden"));
    api.fetchPublicShareRevision.mockResolvedValue({ revision: "rev-2" });

    await act(async () => {
      setVisibility("visible");
    });

    expect(result.current.updateAvailable).toBe(true);
  });

  it("keeps polling after a network error", async () => {
    api.fetchPublicShareRevision.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { result } = watch();

    await tick(POLL_MS);
    expect(result.current.updateAvailable).toBe(false);

    api.fetchPublicShareRevision.mockResolvedValue({ revision: "rev-2" });
    await tick(POLL_MS);
    expect(api.fetchPublicShareRevision).toHaveBeenCalledTimes(2);
    expect(result.current.updateAvailable).toBe(true);
  });

  it.each([404, 410])("stops silently when the check answers %i", async (status) => {
    api.fetchPublicShareRevision.mockRejectedValue(Object.assign(new Error("gone"), { status }));
    const { result } = watch();

    await tick(POLL_MS);
    await tick(5 * POLL_MS);

    expect(api.fetchPublicShareRevision).toHaveBeenCalledTimes(1);
    expect(result.current.updateAvailable).toBe(false);

    // Coming back to the tab does not wake it either.
    act(() => setVisibility("hidden"));
    await act(async () => {
      setVisibility("visible");
    });
    expect(api.fetchPublicShareRevision).toHaveBeenCalledTimes(1);
  });

  it("does not start a second check while one is still in flight", async () => {
    api.fetchPublicShareRevision.mockReturnValue(new Promise(() => {}));
    watch();

    await tick(4 * POLL_MS);

    expect(api.fetchPublicShareRevision).toHaveBeenCalledTimes(1);
  });

  it("clears its timer and listener on unmount", async () => {
    const remove = vi.spyOn(document, "removeEventListener");
    const { unmount } = watch();

    unmount();
    await tick(5 * POLL_MS);

    expect(api.fetchPublicShareRevision).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    remove.mockRestore();
  });

  it("ignores a slow response that lands after unmount", async () => {
    let resolveCheck;
    api.fetchPublicShareRevision.mockReturnValue(new Promise((resolve) => (resolveCheck = resolve)));
    const { result, unmount } = watch();
    await tick(POLL_MS);

    unmount();
    await act(async () => {
      resolveCheck({ revision: "rev-2" });
    });

    expect(result.current.updateAvailable).toBe(false);
  });

  it("ignores a slow response for a baseline that has since moved on", async () => {
    let resolveCheck;
    api.fetchPublicShareRevision.mockReturnValueOnce(new Promise((resolve) => (resolveCheck = resolve)));
    const { result, rerender } = watch();
    await tick(POLL_MS);

    // The reader pulled in rev-2 while the old check was still out.
    rerender({ token: "tok-1", revision: "rev-2" });
    await act(async () => {
      resolveCheck({ revision: "rev-2" });
    });

    expect(result.current.updateAvailable).toBe(false);
  });

  it("clears the update and watches the new baseline when the revision changes", async () => {
    api.fetchPublicShareRevision.mockResolvedValue({ revision: "rev-2" });
    const { result, rerender } = watch();
    await tick(POLL_MS);
    expect(result.current.updateAvailable).toBe(true);

    rerender({ token: "tok-1", revision: "rev-2" });
    expect(result.current.updateAvailable).toBe(false);

    await tick(POLL_MS);
    expect(api.fetchPublicShareRevision).toHaveBeenCalledTimes(2);
    expect(result.current.updateAvailable).toBe(false);

    api.fetchPublicShareRevision.mockResolvedValue({ revision: "rev-3" });
    await tick(POLL_MS);
    expect(result.current.updateAvailable).toBe(true);
  });

  it("acknowledge() hides the update and resumes polling even if the revision did not move", async () => {
    api.fetchPublicShareRevision.mockResolvedValue({ revision: "rev-2" });
    const { result } = watch();
    await tick(POLL_MS);
    expect(result.current.updateAvailable).toBe(true);

    api.fetchPublicShareRevision.mockResolvedValue({ revision: "rev-1" });
    act(() => result.current.acknowledge());
    expect(result.current.updateAvailable).toBe(false);

    await tick(POLL_MS);
    expect(api.fetchPublicShareRevision).toHaveBeenCalledTimes(2);
    expect(result.current.updateAvailable).toBe(false);
  });

  it("runs one timer, not two, under StrictMode's double effect", async () => {
    watch({}, { wrapper: StrictMode });

    await tick(POLL_MS);

    expect(api.fetchPublicShareRevision).toHaveBeenCalledTimes(1);
  });
});
