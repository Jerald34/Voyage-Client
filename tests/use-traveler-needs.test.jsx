import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { useTravelerNeeds } from "../app/hooks/useTravelerNeeds.js";

const WHEELCHAIR = { needs: ["WHEELCHAIR"], notes: null };
const SENIOR = { needs: ["SENIOR"], notes: "Slow pace" };
const EMPTY = { needs: [], notes: null };

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

const sentOk = (contextId = null) => vi.fn(async () => ({ sent: true, contextId }));

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

  it("sends nothing with the next new plan's first message after another plan had needs", async () => {
    const hook = setup({ context: { type: "draft", id: "pending-A" } });
    act(() => hook.result.current.saveTravelerNeeds(WHEELCHAIR));
    hook.rerender({ context: { type: "draft", id: "pending-B" } });

    const dispatch = sentOk("thread-b");
    await act(async () => {
      await hook.result.current.sendWithNeeds(dispatch);
    });

    expect(dispatch).toHaveBeenCalledWith(null);
  });

  it("clears explicitly when asked, even if the context id did not change", () => {
    const hook = setup({ context: { type: "draft", id: "pending-A" } });
    act(() => hook.result.current.saveTravelerNeeds(WHEELCHAIR));
    act(() => hook.result.current.clearPendingNeeds());
    expect(hook.result.current.activeTravelerNeeds).toBeNull();
  });

  it("sends pending needs with the first message and does not re-send them once the thread exists", async () => {
    const hook = setup({ context: { type: "draft", id: "pending-A" } });
    act(() => hook.result.current.saveTravelerNeeds(WHEELCHAIR));

    const dispatch = sentOk("thread-1");
    await act(async () => {
      await hook.result.current.sendWithNeeds(dispatch);
    });
    expect(dispatch).toHaveBeenCalledWith(WHEELCHAIR);

    // The first send created the thread and moved the context onto it.
    hook.rerender({ context: { type: "draft", id: "thread-1" } });
    const next = sentOk();
    await act(async () => {
      await hook.result.current.sendWithNeeds(next);
    });
    expect(next).toHaveBeenCalledWith(null);
  });

  it("queues needs for the new thread when the first send failed after the thread was created", async () => {
    const hook = setup({
      context: { type: "draft", id: "pending-A" },
      drafts: { "thread-1": { travelerNeeds: WHEELCHAIR } },
    });
    act(() => hook.result.current.saveTravelerNeeds(WHEELCHAIR));

    await act(async () => {
      await hook.result.current.sendWithNeeds(vi.fn(async () => ({ sent: false, contextId: "thread-1" })));
    });
    hook.rerender({ context: { type: "draft", id: "thread-1" } });
    expect(hook.result.current.activeTravelerNeeds).toEqual(WHEELCHAIR);

    const retry = sentOk();
    await act(async () => {
      await hook.result.current.sendWithNeeds(retry);
    });
    expect(retry).toHaveBeenCalledWith(WHEELCHAIR);
  });
});

describe("traveler needs are sent only when changed in this tab", () => {
  const stored = { trips: { "trip-1": { travelerNeeds: SENIOR } }, context: { type: "trip", id: "trip-1" } };

  it("omits the key when the stored needs were not edited here", async () => {
    const hook = setup(stored);
    const dispatch = sentOk();
    await act(async () => {
      await hook.result.current.sendWithNeeds(dispatch);
    });
    expect(dispatch).toHaveBeenCalledWith(null);
  });

  it("sends the edited needs once, then omits them after a successful send", async () => {
    const hook = setup(stored);
    act(() => hook.result.current.saveTravelerNeeds(WHEELCHAIR));
    expect(hook.result.current.tripStates["trip-1"].travelerNeeds).toEqual(WHEELCHAIR);

    const first = sentOk();
    await act(async () => {
      await hook.result.current.sendWithNeeds(first);
    });
    expect(first).toHaveBeenCalledWith(WHEELCHAIR);

    const second = sentOk();
    await act(async () => {
      await hook.result.current.sendWithNeeds(second);
    });
    expect(second).toHaveBeenCalledWith(null);
  });

  it("keeps the edit queued when the send fails", async () => {
    const hook = setup(stored);
    act(() => hook.result.current.saveTravelerNeeds(WHEELCHAIR));

    await act(async () => {
      await hook.result.current.sendWithNeeds(vi.fn(async () => ({ sent: false, contextId: "trip-1" })));
    });
    const retry = sentOk();
    await act(async () => {
      await hook.result.current.sendWithNeeds(retry);
    });
    expect(retry).toHaveBeenCalledWith(WHEELCHAIR);
  });

  it("sends a clear as an empty selection, never null", async () => {
    const hook = setup(stored);
    act(() => hook.result.current.saveTravelerNeeds(null));

    const dispatch = sentOk();
    await act(async () => {
      await hook.result.current.sendWithNeeds(dispatch);
    });
    expect(dispatch).toHaveBeenCalledWith(EMPTY);
  });

  it("does not drop an edit made while a send was in flight", async () => {
    const hook = setup(stored);
    act(() => hook.result.current.saveTravelerNeeds(WHEELCHAIR));

    let release;
    const slow = vi.fn(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ sent: true, contextId: "trip-1" });
        }),
    );
    let pending;
    act(() => {
      pending = hook.result.current.sendWithNeeds(slow);
    });
    act(() => hook.result.current.saveTravelerNeeds(SENIOR)); // edited again mid-send
    await act(async () => {
      release();
      await pending;
    });

    const next = sentOk();
    await act(async () => {
      await hook.result.current.sendWithNeeds(next);
    });
    expect(next).toHaveBeenCalledWith(SENIOR);
  });

  it("tracks edits per context", async () => {
    const hook = setup({
      trips: { "trip-1": { travelerNeeds: SENIOR }, "trip-2": { travelerNeeds: SENIOR } },
      context: { type: "trip", id: "trip-1" },
    });
    act(() => hook.result.current.saveTravelerNeeds(WHEELCHAIR));
    hook.rerender({ context: { type: "trip", id: "trip-2" } });

    const dispatch = sentOk();
    await act(async () => {
      await hook.result.current.sendWithNeeds(dispatch);
    });
    expect(dispatch).toHaveBeenCalledWith(null);
  });
});
