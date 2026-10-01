import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { useTravelerNeeds } from "../app/hooks/useTravelerNeeds.js";

const WHEELCHAIR = { needs: ["WHEELCHAIR"], notes: null };

/** Mirrors HomePage wiring: context + thread-state maps are owned by the caller. */
function setup(initial = {}) {
  return renderHook(
    (props) => {
      const [draftThreadStates, setDraftThreadStates] = useState(initial.drafts ?? {});
      const [tripStates, setTripStates] = useState(initial.trips ?? {});
      const activeContext = props.context;
      const activeTripState =
        activeContext?.type === "draft"
          ? draftThreadStates[activeContext.id]
          : activeContext?.type === "trip"
            ? tripStates[activeContext.id]
            : null;
      const api = useTravelerNeeds({ activeContext, activeTripState, setDraftThreadStates, setTripStates });
      return { ...api, draftThreadStates, tripStates };
    },
    { initialProps: { context: initial.context ?? null } },
  );
}

describe("pending traveler needs never carry into a different new plan", () => {
  it("drops pending needs when moving from one pending plan to another", () => {
    const hook = setup({ context: { type: "draft", id: "pending-A" } });
    act(() => hook.result.current.saveTravelerNeeds(WHEELCHAIR));
    expect(hook.result.current.activeTravelerNeeds).toEqual(WHEELCHAIR);

    hook.rerender({ context: { type: "draft", id: "pending-B" } });

    // The very first render for plan B must already be clean (this value feeds the dialog initialNeeds).
    expect(hook.result.current.activeTravelerNeeds).toBeNull();
  });

  it("drops pending needs when moving from no context to a pending plan", () => {
    const hook = setup({ context: null });
    act(() => hook.result.current.saveTravelerNeeds(WHEELCHAIR));
    hook.rerender({ context: { type: "draft", id: "pending-B" } });
    expect(hook.result.current.activeTravelerNeeds).toBeNull();
  });

  it("does not bring plan A needs back when returning to a later plan with the same shape", () => {
    const hook = setup({ context: { type: "draft", id: "pending-A" } });
    act(() => hook.result.current.saveTravelerNeeds(WHEELCHAIR));
    hook.rerender({ context: { type: "draft", id: "pending-B" } });
    hook.rerender({ context: { type: "draft", id: "pending-A" } });
    expect(hook.result.current.activeTravelerNeeds).toBeNull();
  });

  it("clears explicitly when asked, even if the context id did not change", () => {
    const hook = setup({ context: { type: "draft", id: "pending-A" } });
    act(() => hook.result.current.saveTravelerNeeds(WHEELCHAIR));
    act(() => hook.result.current.clearPendingNeeds());
    expect(hook.result.current.activeTravelerNeeds).toBeNull();
  });

  it("hands pending needs over to the real thread state once the thread exists", () => {
    const hook = setup({ context: { type: "draft", id: "pending-A" }, drafts: { "thread-1": { travelerNeeds: WHEELCHAIR } } });
    act(() => hook.result.current.saveTravelerNeeds(WHEELCHAIR));
    hook.rerender({ context: { type: "draft", id: "thread-1" } });
    expect(hook.result.current.activeTravelerNeeds).toEqual(WHEELCHAIR);
  });

  it("saves edits on a real thread into that thread's state", () => {
    const hook = setup({ context: { type: "trip", id: "trip-1" }, trips: { "trip-1": { travelerNeeds: null } } });
    act(() => hook.result.current.saveTravelerNeeds(WHEELCHAIR));
    expect(hook.result.current.tripStates["trip-1"].travelerNeeds).toEqual(WHEELCHAIR);
  });
});
