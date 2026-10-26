import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAgentPause } from "../app/hooks/useAgentPause.js";

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
