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
