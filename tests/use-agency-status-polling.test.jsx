import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ fetchApi: vi.fn() }));
vi.mock("../app/lib/api/index.js", () => api);

import useAgencyStatusPolling, { AGENCY_STATUS_POLL_MS } from "../app/hooks/useAgencyStatusPolling.js";

beforeEach(() => {
  vi.useFakeTimers();
  api.fetchApi.mockReset();
  api.fetchApi.mockResolvedValue({ user: { id: "user-1" } });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useAgencyStatusPolling", () => {
  it("re-reads the user every 30 seconds while enabled", async () => {
    const onUser = vi.fn();
    renderHook(() => useAgencyStatusPolling({ enabled: true, onUser }));
    expect(api.fetchApi).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AGENCY_STATUS_POLL_MS);
    });

    expect(api.fetchApi).toHaveBeenCalledWith("/auth/me");
    expect(onUser).toHaveBeenCalledWith({ id: "user-1" });
  });

  it("checks right away when the window regains focus", async () => {
    const onUser = vi.fn();
    renderHook(() => useAgencyStatusPolling({ enabled: true, onUser }));

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(api.fetchApi).toHaveBeenCalledTimes(1);
    expect(onUser).toHaveBeenCalledWith({ id: "user-1" });
  });

  it("checks right away when the tab becomes visible again", async () => {
    const onUser = vi.fn();
    renderHook(() => useAgencyStatusPolling({ enabled: true, onUser }));

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(api.fetchApi).toHaveBeenCalledTimes(1);
    expect(onUser).toHaveBeenCalledWith({ id: "user-1" });
  });

  it("skips checks while the tab is hidden", async () => {
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    try {
      renderHook(() => useAgencyStatusPolling({ enabled: true, onUser: vi.fn() }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(AGENCY_STATUS_POLL_MS * 2);
        window.dispatchEvent(new Event("focus"));
        document.dispatchEvent(new Event("visibilitychange"));
      });

      expect(api.fetchApi).not.toHaveBeenCalled();
    } finally {
      visibility.mockRestore();
    }
  });

  it("does not start a second request while one is in flight", async () => {
    let resolveRead;
    api.fetchApi.mockImplementation(
      () => new Promise((resolve) => {
        resolveRead = resolve;
      }),
    );
    const onUser = vi.fn();
    renderHook(() => useAgencyStatusPolling({ enabled: true, onUser }));

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(new Event("focus"));
      await vi.advanceTimersByTimeAsync(AGENCY_STATUS_POLL_MS);
    });
    expect(api.fetchApi).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRead({ user: { id: "user-1" } });
    });
    expect(onUser).toHaveBeenCalledTimes(1);

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(api.fetchApi).toHaveBeenCalledTimes(2);
  });

  it("does nothing while disabled", async () => {
    renderHook(() => useAgencyStatusPolling({ enabled: false, onUser: vi.fn() }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AGENCY_STATUS_POLL_MS * 3);
      window.dispatchEvent(new Event("focus"));
    });

    expect(api.fetchApi).not.toHaveBeenCalled();
  });

  it("stops when it is disabled after being enabled", async () => {
    const onUser = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) => useAgencyStatusPolling({ enabled, onUser }),
      { initialProps: { enabled: true } },
    );
    rerender({ enabled: false });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AGENCY_STATUS_POLL_MS * 2);
      window.dispatchEvent(new Event("focus"));
    });

    expect(api.fetchApi).not.toHaveBeenCalled();
  });

  it("keeps polling after a failed read", async () => {
    api.fetchApi.mockRejectedValueOnce(new Error("offline"));
    const onUser = vi.fn();
    renderHook(() => useAgencyStatusPolling({ enabled: true, onUser }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AGENCY_STATUS_POLL_MS);
    });
    expect(onUser).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AGENCY_STATUS_POLL_MS);
    });
    expect(onUser).toHaveBeenCalledTimes(1);
  });

  it("uses the latest onUser without restarting the interval", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ onUser }) => useAgencyStatusPolling({ enabled: true, onUser }),
      { initialProps: { onUser: first } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AGENCY_STATUS_POLL_MS - 1000);
    });
    rerender({ onUser: second });

    // The interval was not restarted: the tick still lands 1s after the rerender.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(api.fetchApi).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith({ id: "user-1" });
  });

  it("does not call onUser when the read finishes after unmount", async () => {
    let resolveRead;
    api.fetchApi.mockImplementation(
      () => new Promise((resolve) => {
        resolveRead = resolve;
      }),
    );
    const onUser = vi.fn();
    const { unmount } = renderHook(() => useAgencyStatusPolling({ enabled: true, onUser }));

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(api.fetchApi).toHaveBeenCalledTimes(1);

    unmount();
    await act(async () => {
      resolveRead({ user: { id: "user-1" } });
    });

    expect(onUser).not.toHaveBeenCalled();
  });

  it("ignores a read that carries no user", async () => {
    api.fetchApi.mockResolvedValue({});
    const onUser = vi.fn();
    renderHook(() => useAgencyStatusPolling({ enabled: true, onUser }));

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(api.fetchApi).toHaveBeenCalledTimes(1);
    expect(onUser).not.toHaveBeenCalled();
  });

  it("reads once when focus and visibilitychange arrive together", async () => {
    const onUser = vi.fn();
    renderHook(() => useAgencyStatusPolling({ enabled: true, onUser }));

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(api.fetchApi).toHaveBeenCalledTimes(1);
    expect(onUser).toHaveBeenCalledTimes(1);
  });

  it("stops when unmounted", async () => {
    const { unmount } = renderHook(() => useAgencyStatusPolling({ enabled: true, onUser: vi.fn() }));
    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AGENCY_STATUS_POLL_MS * 2);
      window.dispatchEvent(new Event("focus"));
    });

    expect(api.fetchApi).not.toHaveBeenCalled();
  });
});

describe("useAgencyStatusPolling session end", () => {
  it("calls onUnauthorized once on a 401 and stops polling", async () => {
    const authError = Object.assign(new Error("Sign in is required."), { status: 401 });
    api.fetchApi.mockRejectedValue(authError);
    const onUser = vi.fn();
    const onUnauthorized = vi.fn();
    renderHook(() => useAgencyStatusPolling({ enabled: true, onUser, onUnauthorized }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AGENCY_STATUS_POLL_MS);
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AGENCY_STATUS_POLL_MS * 3);
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(api.fetchApi).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(onUser).not.toHaveBeenCalled();
  });

  it("ignores a 500 and keeps polling", async () => {
    const serverError = Object.assign(new Error("Server error"), { status: 500 });
    api.fetchApi.mockRejectedValueOnce(serverError);
    const onUser = vi.fn();
    const onUnauthorized = vi.fn();
    renderHook(() => useAgencyStatusPolling({ enabled: true, onUser, onUnauthorized }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AGENCY_STATUS_POLL_MS);
    });
    expect(onUnauthorized).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AGENCY_STATUS_POLL_MS);
    });
    expect(onUser).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("does not throw on a 401 when no onUnauthorized is given", async () => {
    api.fetchApi.mockRejectedValue(Object.assign(new Error("Sign in is required."), { status: 401 }));
    renderHook(() => useAgencyStatusPolling({ enabled: true, onUser: vi.fn() }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AGENCY_STATUS_POLL_MS);
    });
    expect(api.fetchApi).toHaveBeenCalledTimes(1);
  });
});
