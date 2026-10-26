import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAgentPause } from "../app/hooks/useAgentPause.js";
import { SERVER_PAUSE_HOLD_MS } from "../app/lib/agentPause.js";

const pause = { pausedAt: "2026-10-25T07:00:00.000Z", until: null, reason: "Abuse" };

afterEach(() => vi.useRealTimers());

describe("useAgentPause", () => {
  it("opens the popup once when the chat is showing and the user is paused", () => {
    const { result, rerender } = renderHook(({ active }) => useAgentPause(pause, { surfaceActive: active }), { initialProps: { active: false } });
    expect(result.current.modalOpen).toBe(false);
    rerender({ active: true });
    expect(result.current.modalOpen).toBe(true);
    act(() => result.current.closeModal());
    rerender({ active: false });
    rerender({ active: true });
    expect(result.current.modalOpen).toBe(false);
  });

  it("lets the user reopen the popup on purpose", () => {
    const { result } = renderHook(() => useAgentPause(pause, { surfaceActive: true }));
    act(() => result.current.closeModal());
    expect(result.current.modalOpen).toBe(false);
    act(() => result.current.openModal());
    expect(result.current.modalOpen).toBe(true);
  });

  it("never opens for a user who is not paused", () => {
    const { result } = renderHook(() => useAgentPause(null, { surfaceActive: true }));
    expect(result.current.pause).toBeNull();
    expect(result.current.modalOpen).toBe(false);
  });

  it("opens on an AGENT_PAUSED error even if the user object didn't know", () => {
    const { result } = renderHook(() => useAgentPause(null, { surfaceActive: true }));
    let handled;
    act(() => {
      handled = result.current.reportError(Object.assign(new Error("m"), { code: "AGENT_PAUSED", details: pause }));
    });
    expect(handled).toBe(true);
    expect(result.current.pause).toEqual(pause);
    expect(result.current.modalOpen).toBe(true);
    expect(result.current.reportError(new Error("other"))).toBe(false);
  });

  it("unlocks when the pause ends while the page is open", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-25T08:00:00.000Z"));
    const ending = { ...pause, until: "2026-10-25T08:00:05.000Z" };
    const { result } = renderHook(() => useAgentPause(ending, { surfaceActive: false }));
    expect(result.current.pause).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(result.current.pause).toBeNull();
  });

  it("closes the popup when the pause ends under it", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-25T08:00:00.000Z"));
    const ending = { ...pause, until: "2026-10-25T08:00:05.000Z" };
    const { result } = renderHook(() => useAgentPause(ending, { surfaceActive: true }));
    expect(result.current.modalOpen).toBe(true);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(result.current.modalOpen).toBe(false);
  });
});

describe("useAgentPause when this device's clock disagrees with the server", () => {
  const agentPausedError = (details) => Object.assign(new Error("m"), { code: "AGENT_PAUSED", details });
  const skewed = { pausedAt: "2026-10-25T07:00:00.000Z", until: "2026-10-25T08:50:00.000Z", reason: "Abuse" };

  function renderAt9am(userPause, options = { surfaceActive: true }) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-25T09:00:00.000Z"));
    return renderHook(() => useAgentPause(userPause, options));
  }

  it("still shows the popup and locks when the server says paused but the local clock says it ended", () => {
    const { result } = renderAt9am(null);
    act(() => {
      result.current.reportError(agentPausedError(skewed));
    });
    expect(result.current.pause).toEqual(skewed);
    expect(result.current.modalOpen).toBe(true);
  });

  it("keeps that lock for a short hold, then lets the user try again", () => {
    const { result } = renderAt9am(null);
    act(() => {
      result.current.reportError(agentPausedError(skewed));
    });
    act(() => {
      vi.advanceTimersByTime(SERVER_PAUSE_HOLD_MS - 1000);
    });
    expect(result.current.pause).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.pause).toBeNull();
    expect(result.current.modalOpen).toBe(false);
  });

  it("starts the hold again when the server refuses another send", () => {
    const { result } = renderAt9am(null);
    act(() => {
      result.current.reportError(agentPausedError(skewed));
    });
    act(() => {
      vi.advanceTimersByTime(SERVER_PAUSE_HOLD_MS + 1000);
    });
    expect(result.current.pause).toBeNull();
    act(() => {
      result.current.reportError(agentPausedError(skewed));
    });
    expect(result.current.pause).toEqual(skewed);
    expect(result.current.modalOpen).toBe(true);
  });

  it("does not stretch a pause that really ends soon", () => {
    const soon = { pausedAt: "2026-10-25T07:00:00.000Z", until: "2026-10-25T09:00:05.000Z", reason: "" };
    const { result } = renderAt9am(null);
    act(() => {
      result.current.reportError(agentPausedError(soon));
    });
    expect(result.current.pause).toEqual(soon);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(result.current.pause).toBeNull();
  });

  it("falls back to the user's own pause when the held one ends", () => {
    const own = { pausedAt: "2026-10-25T08:00:00.000Z", until: null, reason: "Later pause" };
    const { result } = renderAt9am(own, { surfaceActive: false });
    act(() => {
      result.current.reportError(agentPausedError(skewed));
    });
    expect(result.current.pause).toEqual(skewed);
    act(() => {
      vi.advanceTimersByTime(SERVER_PAUSE_HOLD_MS + 1000);
    });
    expect(result.current.pause).toEqual(own);
  });
});

describe("useAgentPause when the server's picture of the user changes", () => {
  const agentPausedError = (details) => Object.assign(new Error("m"), { code: "AGENT_PAUSED", details });
  const learnedFromRefusal = { pausedAt: "2026-10-25T07:00:00.000Z", until: null, reason: "Abuse" };

  it("drops a pause learned from a refusal once a newer snapshot of the user arrives", () => {
    const { result, rerender } = renderHook(({ snapshot }) => useAgentPause(snapshot, { surfaceActive: true }), { initialProps: { snapshot: null } });
    act(() => {
      result.current.reportError(agentPausedError(learnedFromRefusal));
    });
    expect(result.current.pause).toEqual(learnedFromRefusal);

    // The admin resumed them; the refreshed user carries no pause.
    rerender({ snapshot: undefined });
    expect(result.current.pause).toBeNull();
    expect(result.current.modalOpen).toBe(false);
  });

  it("lets the newer snapshot's own pause take over from the one it replaces", () => {
    const newer = { pausedAt: "2026-10-26T01:00:00.000Z", until: null, reason: "Second pause" };
    const { result, rerender } = renderHook(({ snapshot }) => useAgentPause(snapshot, { surfaceActive: false }), { initialProps: { snapshot: null } });
    act(() => {
      result.current.reportError(agentPausedError(learnedFromRefusal));
    });
    rerender({ snapshot: newer });
    expect(result.current.pause).toEqual(newer);
  });

  it("keeps a pause learned from a refusal while the snapshot is the one it was rendered with", () => {
    const { result, rerender } = renderHook(({ snapshot }) => useAgentPause(snapshot, { surfaceActive: true }), { initialProps: { snapshot: null } });
    act(() => {
      result.current.reportError(agentPausedError(learnedFromRefusal));
    });
    rerender({ snapshot: null });
    rerender({ snapshot: null });
    expect(result.current.pause).toEqual(learnedFromRefusal);
  });

  it("forgets that the popup was open when the pause ends, so a later pause cannot open it off the agent", () => {
    const { result, rerender } = renderHook(({ snapshot, active }) => useAgentPause(snapshot, { surfaceActive: active }), {
      initialProps: { snapshot: pause, active: true },
    });
    expect(result.current.modalOpen).toBe(true);

    rerender({ snapshot: null, active: true });
    expect(result.current.pause).toBeNull();
    rerender({ snapshot: null, active: false });

    // Paused again while the user is somewhere else (not the agent surface).
    rerender({ snapshot: { ...pause, pausedAt: "2026-10-26T02:00:00.000Z" }, active: false });
    expect(result.current.pause).not.toBeNull();
    expect(result.current.modalOpen).toBe(false);
  });
});

describe("useAgentPause re-checking the server while paused", () => {
  const agentPausedError = (details) => Object.assign(new Error("m"), { code: "AGENT_PAUSED", details });
  const learnedFromRefusal = { pausedAt: "2026-10-25T07:00:00.000Z", until: null, reason: "Abuse" };
  const setVisibility = (state) => Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });

  afterEach(() => setVisibility("visible"));

  const mount = (snapshot, refreshUser) =>
    renderHook(({ snap }) => useAgentPause(snap, { surfaceActive: false, refreshUser }), { initialProps: { snap: snapshot } });

  it("refreshes the user when the window gains focus while paused", async () => {
    const refreshUser = vi.fn().mockResolvedValue(undefined);
    mount(pause, refreshUser);
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(refreshUser).toHaveBeenCalledTimes(1);
  });

  it("refreshes when the tab becomes visible again, but not when it goes hidden", async () => {
    const refreshUser = vi.fn().mockResolvedValue(undefined);
    mount(pause, refreshUser);
    setVisibility("hidden");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(refreshUser).not.toHaveBeenCalled();
    setVisibility("visible");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(refreshUser).toHaveBeenCalledTimes(1);
  });

  it("costs nothing for a user who is not paused", async () => {
    const refreshUser = vi.fn().mockResolvedValue(undefined);
    mount(null, refreshUser);
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(refreshUser).not.toHaveBeenCalled();
  });

  it("checks at most once every 30 seconds", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-26T08:00:00.000Z"));
    const refreshUser = vi.fn().mockResolvedValue(undefined);
    mount(pause, refreshUser);
    const focus = async () => {
      await act(async () => {
        window.dispatchEvent(new Event("focus"));
        document.dispatchEvent(new Event("visibilitychange"));
      });
    };
    await focus();
    await focus();
    expect(refreshUser).toHaveBeenCalledTimes(1);
    await act(async () => {
      vi.advanceTimersByTime(29_000);
    });
    await focus();
    expect(refreshUser).toHaveBeenCalledTimes(1);
    await act(async () => {
      vi.advanceTimersByTime(2_000);
    });
    await focus();
    expect(refreshUser).toHaveBeenCalledTimes(2);
  });

  it("stops listening once the pause is over", async () => {
    const refreshUser = vi.fn().mockResolvedValue(undefined);
    const { rerender } = mount(pause, refreshUser);
    rerender({ snap: null });
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(refreshUser).not.toHaveBeenCalled();
  });

  it("unlocks a learned pause when a check that started after it finds the user is no longer paused", async () => {
    const refreshUser = vi.fn().mockResolvedValue(undefined);
    // The user object never carried a pause, and the refreshed one does not either (null stays null).
    const { result } = mount(null, refreshUser);
    act(() => {
      result.current.reportError(agentPausedError(learnedFromRefusal));
    });
    expect(result.current.pause).toEqual(learnedFromRefusal);

    let ok;
    await act(async () => {
      ok = await result.current.recheck();
    });
    expect(ok).toBe(true);
    expect(refreshUser).toHaveBeenCalledTimes(1);
    expect(result.current.pause).toBeNull();
    expect(result.current.modalOpen).toBe(false);
  });

  it("keeps a learned pause when the check was already running before the refusal", async () => {
    let finish;
    const refreshUser = vi.fn(() => new Promise((resolve) => (finish = resolve)));
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-26T08:00:00.000Z"));
    const { result } = mount(null, refreshUser);
    let pending;
    act(() => {
      pending = result.current.recheck();
    });
    vi.setSystemTime(new Date("2026-10-26T08:00:05.000Z"));
    act(() => {
      result.current.reportError(agentPausedError(learnedFromRefusal));
    });
    await act(async () => {
      finish();
      await pending;
    });
    // That answer may predate the pause the server just enforced, so it cannot lift it.
    expect(result.current.pause).toEqual(learnedFromRefusal);
  });

  it("reports a failed check without touching the pause", async () => {
    const refreshUser = vi.fn().mockRejectedValue(new Error("offline"));
    const { result } = mount(pause, refreshUser);
    let ok;
    await act(async () => {
      ok = await result.current.recheck();
    });
    expect(ok).toBe(false);
    expect(result.current.pause).toEqual(pause);
  });

  it("has nothing to check without a refresh function", async () => {
    const { result } = renderHook(() => useAgentPause(pause));
    let ok;
    await act(async () => {
      ok = await result.current.recheck();
    });
    expect(ok).toBe(false);
  });

  it("asks only once while a check is still running", async () => {
    let finish;
    const refreshUser = vi.fn(() => new Promise((resolve) => (finish = resolve)));
    const { result } = mount(pause, refreshUser);
    let first;
    let second;
    act(() => {
      first = result.current.recheck();
      second = result.current.recheck();
    });
    expect(refreshUser).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish();
      await Promise.all([first, second]);
    });
  });
});
