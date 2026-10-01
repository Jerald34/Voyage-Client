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
