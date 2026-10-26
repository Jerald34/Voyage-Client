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

const paused = () =>
  Object.assign(new Error("The agent is paused for your account."), {
    code: "AGENT_PAUSED",
    status: 403,
    details: { pausedAt: "2026-10-25T07:00:00.000Z", until: null, reason: "Abuse" },
  });

// Same contract as useAgentPause().reportError: true when the error is the pause and a popup explains it.
const reportPause = () => vi.fn((error) => error?.code === "AGENT_PAUSED");

beforeEach(() => {
  vi.clearAllMocks();
  api.createAgentThread.mockResolvedValue({ thread: { id: "thread-1", title: "", events: [] } });
});

describe("a send the server refuses because the agent is paused", () => {
  it("hands the error to onSendError, shows no error banner, and takes the unsent message back out of the chat", async () => {
    api.sendMessage.mockRejectedValueOnce(paused());
    const onSendError = reportPause();
    const { result } = renderHook(() => useTripPlanning("agency-1", { onSendError }));

    let outcome;
    await act(async () => {
      outcome = await result.current.dispatchMessage("Plan 3 days in Cebu", vi.fn());
    });

    expect(onSendError).toHaveBeenCalledTimes(1);
    expect(onSendError.mock.calls[0][0].code).toBe("AGENT_PAUSED");
    expect(result.current.agentError).toBe("");
    expect(result.current.draftThreadStates["thread-1"].messages).toEqual([]);
    expect(outcome).toMatchObject({ sent: false, handled: true, threadId: "thread-1" });
    expect(result.current.isSending).toBe(false);
  });

  it("also takes an unsent answer to an ask_user question back, so the question can return", async () => {
    api.sendMessage.mockRejectedValueOnce(paused());
    const answers = {
      request: { messageId: "m-2", items: [{ questionId: "q1", selected: ["Train"] }] },
      display: { messageId: "m-2", items: [{ questionId: "q1", header: "Transport", question: "Car or train?", selected: ["Train"] }] },
    };
    const { result } = renderHook(() => useTripPlanning("agency-1", { onSendError: reportPause() }));

    await act(async () => {
      await result.current.dispatchMessage("Transport: Train", vi.fn(), [], null, { answers });
    });

    expect(result.current.draftThreadStates["thread-1"].messages.some((message) => message.metadata?.answers)).toBe(false);
    expect(result.current.agentError).toBe("");
  });

  it("still shows other send errors, and keeps that message in the chat as before", async () => {
    api.sendMessage.mockRejectedValueOnce(new Error("Network down."));
    const onSendError = reportPause();
    const { result } = renderHook(() => useTripPlanning("agency-1", { onSendError }));

    let outcome;
    await act(async () => {
      outcome = await result.current.dispatchMessage("Plan a trip", vi.fn());
    });

    expect(onSendError).toHaveBeenCalledTimes(1);
    expect(result.current.agentError).toBe("Network down.");
    expect(result.current.draftThreadStates["thread-1"].messages.at(-1)).toMatchObject({ role: "user", content: "Plan a trip" });
    expect(outcome.handled).toBeFalsy();
  });

  it("works without an onSendError handler", async () => {
    api.sendMessage.mockRejectedValueOnce(paused());
    const { result } = renderHook(() => useTripPlanning("agency-1"));

    await act(async () => {
      await result.current.dispatchMessage("Plan a trip", vi.fn());
    });

    expect(result.current.agentError).toBe("The agent is paused for your account.");
  });

  it("calls the latest onSendError, not the one from the first render", async () => {
    api.sendMessage.mockRejectedValueOnce(paused());
    const first = vi.fn(() => false);
    const second = reportPause();
    const { result, rerender } = renderHook(({ handler }) => useTripPlanning("agency-1", { onSendError: handler }), {
      initialProps: { handler: first },
    });
    rerender({ handler: second });

    await act(async () => {
      await result.current.dispatchMessage("Plan a trip", vi.fn());
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(result.current.agentError).toBe("");
  });
});

describe("an image upload the server refuses because the agent is paused", () => {
  const image = () => new File(["x"], "pic.png", { type: "image/png" });

  it("hands the error to onSendError and shows no upload-failed banner", async () => {
    api.uploadChatImages.mockRejectedValueOnce(paused());
    const onSendError = reportPause();
    const { result } = renderHook(() => useTripPlanning("agency-1", { onSendError }));

    let outcome;
    await act(async () => {
      outcome = await result.current.dispatchMessage("Look at this", vi.fn(), [image()]);
    });

    expect(onSendError).toHaveBeenCalledTimes(1);
    expect(api.sendMessage).not.toHaveBeenCalled();
    expect(result.current.agentError).toBe("");
    expect(outcome).toMatchObject({ sent: false, handled: true });
    expect(result.current.isSending).toBe(false);
  });

  it("still says so when an upload fails for any other reason", async () => {
    api.uploadChatImages.mockRejectedValueOnce(new Error("Too big."));
    const { result } = renderHook(() => useTripPlanning("agency-1", { onSendError: reportPause() }));

    let outcome;
    await act(async () => {
      outcome = await result.current.dispatchMessage("Look at this", vi.fn(), [image()]);
    });

    expect(result.current.agentError).toBe("Failed to upload images. Please try again.");
    expect(outcome.handled).toBeFalsy();
  });
});
