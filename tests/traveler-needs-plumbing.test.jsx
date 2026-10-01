import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  bootstrapAgentWorkspace: vi.fn(),
  createAgentThread: vi.fn(),
  fetchItineraryDraft: vi.fn(),
  fetchThreadMessages: vi.fn(async () => ({ messages: [] })),
  sendMessage: vi.fn(async () => ({ runId: "run-1" })),
  uploadChatImages: vi.fn(),
  updateAgentThreadTitle: vi.fn(),
}));

vi.mock("../app/lib/api/index.js", () => api);

import { useTripPlanning } from "../app/hooks/useTripPlanning.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("traveler needs plumbing", () => {
  it("sends needs with the first message of a new plan and keeps them on the new draft", async () => {
    api.createAgentThread.mockResolvedValue({ thread: { id: "thread-1", title: "", events: [] } });
    const { result } = renderHook(() => useTripPlanning("agency-1"));
    const needs = { needs: ["WHEELCHAIR"], notes: null };

    await act(async () => {
      await result.current.dispatchMessage("Plan 2 days in Baguio", vi.fn(), [], needs);
    });

    expect(api.sendMessage).toHaveBeenCalledWith("agency-1", "thread-1", "Plan 2 days in Baguio", [], needs);
    expect(result.current.draftThreadStates["thread-1"].travelerNeeds).toEqual(needs);
  });

  it("does not send a needs field when none were ever set", async () => {
    api.createAgentThread.mockResolvedValue({ thread: { id: "thread-2", title: "", events: [] } });
    const { result } = renderHook(() => useTripPlanning("agency-1"));

    await act(async () => {
      await result.current.dispatchMessage("Plan Cebu", vi.fn());
    });

    expect(api.sendMessage).toHaveBeenCalledWith("agency-1", "thread-2", "Plan Cebu", [], null);
  });

  it("keeps the needs on the thread when the first send fails at the image upload", async () => {
    api.createAgentThread.mockResolvedValue({ thread: { id: "thread-4", title: "", events: [] } });
    api.uploadChatImages.mockRejectedValue(new Error("upload down"));
    const { result } = renderHook(() => useTripPlanning("agency-1"));
    const needs = { needs: ["WHEELCHAIR"], notes: null };
    const image = new File(["x"], "photo.png", { type: "image/png" });

    await act(async () => {
      await result.current.dispatchMessage("Plan Baguio", vi.fn(), [image], needs);
    });

    expect(api.sendMessage).not.toHaveBeenCalled();
    expect(result.current.draftThreadStates["thread-4"].travelerNeeds).toEqual(needs);
  });

  it("reports whether the send went through and which thread it used", async () => {
    api.createAgentThread.mockResolvedValue({ thread: { id: "thread-6", title: "", events: [] } });
    const { result } = renderHook(() => useTripPlanning("agency-1"));

    let outcome;
    await act(async () => {
      outcome = await result.current.dispatchMessage("Plan Bohol", vi.fn());
    });
    expect(outcome).toEqual({ sent: true, contextId: "thread-6", threadId: "thread-6" });

    api.createAgentThread.mockResolvedValue({ thread: { id: "thread-7", title: "", events: [] } });
    api.uploadChatImages.mockRejectedValue(new Error("upload down"));
    const image = new File(["x"], "photo.png", { type: "image/png" });
    const failing = renderHook(() => useTripPlanning("agency-1"));
    await act(async () => {
      outcome = await failing.result.current.dispatchMessage("Plan Bohol", vi.fn(), [image]);
    });
    expect(outcome).toEqual({ sent: false, contextId: "thread-7", threadId: "thread-7" });
  });

  it("restores needs from the workspace bootstrap", async () => {
    api.bootstrapAgentWorkspace.mockResolvedValue({
      trips: [],
      threads: [
        {
          id: "thread-3",
          title: "Draft",
          tripId: null,
          createdAt: "2026-10-01T00:00:00.000Z",
          travelerNeeds: { needs: ["SENIOR", "WHEELCHAIR"], notes: "Uses a cane" },
        },
      ],
      itinerarySummaries: {},
    });
    const { result } = renderHook(() => useTripPlanning("agency-1"));

    await act(async () => {
      await result.current.loadInitialThreads();
    });

    expect(result.current.draftThreadStates["thread-3"].travelerNeeds).toEqual({
      needs: ["WHEELCHAIR", "SENIOR"],
      notes: "Uses a cane",
    });
  });
});

describe("traveler needs on trip threads", () => {
  it("keeps bootstrapped needs when the trip thread is lazily hydrated", async () => {
    api.bootstrapAgentWorkspace.mockResolvedValue({
      trips: [],
      threads: [
        {
          id: "thread-5",
          title: "Trip thread",
          tripId: "trip-1",
          createdAt: "2026-10-01T00:00:00.000Z",
          travelerNeeds: { needs: ["WHEELCHAIR"], notes: null },
        },
      ],
      itinerarySummaries: {},
    });
    const { result } = renderHook(() => useTripPlanning("agency-1"));

    await act(async () => {
      await result.current.loadInitialThreads();
    });
    expect(result.current.tripStates["trip-1"].travelerNeeds).toEqual({ needs: ["WHEELCHAIR"], notes: null });

    await act(async () => {
      await result.current.ensureTripThreadState("trip-1");
    });

    expect(result.current.tripStates["trip-1"].loaded).toBe(true);
    expect(result.current.tripStates["trip-1"].travelerNeeds).toEqual({ needs: ["WHEELCHAIR"], notes: null });
  });
});

describe("traveler needs edits survive thread hydration", () => {
  const BOOTSTRAPPED = { needs: ["SENIOR"], notes: null };
  const EDITED = { needs: ["WHEELCHAIR"], notes: "Foldable chair" };

  function deferMessages() {
    let release;
    api.fetchThreadMessages.mockImplementationOnce(
      () => new Promise((resolve) => { release = () => resolve({ messages: [] }); }),
    );
    return () => release();
  }

  it("keeps a needs edit made while a trip thread was hydrating", async () => {
    api.bootstrapAgentWorkspace.mockResolvedValue({
      trips: [],
      threads: [{ id: "thread-5", title: "Trip", tripId: "trip-1", createdAt: "2026-10-01T00:00:00.000Z", travelerNeeds: BOOTSTRAPPED }],
      itinerarySummaries: {},
    });
    const { result } = renderHook(() => useTripPlanning("agency-1"));
    await act(async () => { await result.current.loadInitialThreads(); });

    const release = deferMessages();
    let hydrating;
    await act(async () => { hydrating = result.current.ensureTripThreadState("trip-1"); });
    act(() => {
      result.current.setTripStates((prev) => ({ ...prev, "trip-1": { ...prev["trip-1"], travelerNeeds: EDITED } }));
    });
    await act(async () => { release(); await hydrating; });

    expect(result.current.tripStates["trip-1"].loaded).toBe(true);
    expect(result.current.tripStates["trip-1"].travelerNeeds).toEqual(EDITED);
  });

  it("keeps a needs edit made while a draft thread was hydrating", async () => {
    api.bootstrapAgentWorkspace.mockResolvedValue({
      trips: [],
      threads: [{ id: "thread-8", title: "Draft", tripId: null, createdAt: "2026-10-01T00:00:00.000Z", travelerNeeds: BOOTSTRAPPED }],
      itinerarySummaries: {},
    });
    const { result } = renderHook(() => useTripPlanning("agency-1"));
    await act(async () => { await result.current.loadInitialThreads(); });

    const release = deferMessages();
    let hydrating;
    await act(async () => { hydrating = result.current.ensureDraftThreadState("thread-8"); });
    act(() => {
      result.current.setDraftThreadStates((prev) => ({ ...prev, "thread-8": { ...prev["thread-8"], travelerNeeds: EDITED } }));
    });
    await act(async () => { release(); await hydrating; });

    expect(result.current.draftThreadStates["thread-8"].loaded).toBe(true);
    expect(result.current.draftThreadStates["thread-8"].travelerNeeds).toEqual(EDITED);
  });
});

describe("a failed thread creation keeps the pending context", () => {
  it("does not replace the pending context when no thread could be created", async () => {
    api.createAgentThread.mockResolvedValue({ thread: null });
    const { result } = renderHook(() => useTripPlanning("agency-1"));
    const pending = { type: "draft", id: "pending-123" };
    act(() => result.current.setActiveContext(pending));

    await act(async () => {
      await result.current.dispatchMessage("Plan Baguio", vi.fn(), [], { needs: ["WHEELCHAIR"], notes: null });
    });

    expect(api.sendMessage).not.toHaveBeenCalled();
    expect(result.current.activeContext).toEqual(pending);
  });
});
