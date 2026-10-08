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

const answers = {
  request: { messageId: "m-2", items: [{ questionId: "q1", selected: ["Train"] }] },
  display: { messageId: "m-2", items: [{ questionId: "q1", header: "Transport", question: "Car or train?", selected: ["Train"] }] },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sending answers", () => {
  it("sends the answers and shows them on the optimistic message", async () => {
    api.createAgentThread.mockResolvedValue({ thread: { id: "thread-1", title: "", events: [] } });
    const { result } = renderHook(() => useTripPlanning("agency-1"));

    await act(async () => {
      await result.current.dispatchMessage("Transport: Train", vi.fn(), [], null, { answers });
    });

    expect(api.sendMessage).toHaveBeenCalledWith("agency-1", "thread-1", "Transport: Train", [], null, answers.request);
    expect(result.current.draftThreadStates["thread-1"].messages.at(-1)).toMatchObject({
      role: "user",
      content: "Transport: Train",
      metadata: { answers: answers.display },
    });
  });

  it("reloads the thread when the question was already answered elsewhere", async () => {
    api.createAgentThread.mockResolvedValue({ thread: { id: "thread-2", title: "", events: [] } });
    api.sendMessage.mockRejectedValueOnce(
      Object.assign(new Error("This question was already answered."), { code: "QUESTION_NOT_PENDING" }),
    );
    // Newest first, as the server returns them.
    api.fetchThreadMessages.mockResolvedValueOnce({
      messages: [
        { id: "u-3", role: "USER", content: "Transport: Car", metadata: { answers: { messageId: "m-2", items: [] } } },
        { id: "m-2", role: "ASSISTANT", content: "One question first." },
      ],
    });
    const { result } = renderHook(() => useTripPlanning("agency-1"));

    await act(async () => {
      await result.current.dispatchMessage("Transport: Train", vi.fn(), [], null, { answers });
    });

    expect(api.fetchThreadMessages).toHaveBeenCalledWith("agency-1", "thread-2", { limit: 50 });
    expect(result.current.draftThreadStates["thread-2"].messages.map((message) => message.id)).toEqual(["m-2", "u-3"]);
    expect(result.current.agentError).toBe("This question was already answered.");
  });
});
