import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app/lib/api/index.js", () => ({ fetchItineraryDraft: vi.fn(async () => null) }));

import { useAgentStreamOrchestration } from "../app/hooks/useAgentStreamOrchestration.js";

const askUser = {
  questions: [{ id: "q1", header: "Transport", question: "Car or train?", multiSelect: false, options: [{ label: "Car" }, { label: "Train" }] }],
};

function renderCommit({ initialMessages = [{ id: "user-1", role: "user", content: "Plan Kyoto" }], ...overrides } = {}) {
  let state = { "draft-1": { messages: initialMessages, loaded: true } };
  const setDraftThreadStates = vi.fn((update) => {
    state = typeof update === "function" ? update(state) : update;
  });
  renderHook(() =>
    useAgentStreamOrchestration({
      agencyId: "agency-1",
      runStatus: "completed",
      completedMessageContent: "A couple of details first.",
      completedMessageProcess: null,
      completedMessageId: "message-9",
      completedMessageAskUser: askUser,
      assistantMessage: "A couple of details first.",
      lastItineraryUpdate: null,
      streamingItinerary: null,
      runTargetRef: { current: "draft:draft-1" },
      setTripStates: vi.fn(),
      setDraftThreadStates,
      ...overrides,
    }),
  );
  return () => state["draft-1"].messages;
}

describe("committing the finished reply", () => {
  it("uses the server id and keeps the questions on the message", () => {
    const messages = renderCommit();

    expect(messages().at(-1)).toMatchObject({
      id: "message-9",
      role: "assistant",
      content: "A couple of details first.",
      metadata: { askUser },
    });
  });

  it("still commits when an earlier reply had the same words", () => {
    const messages = renderCommit({
      initialMessages: [
        { id: "message-3", role: "assistant", content: "A couple of details first." },
        { id: "user-4", role: "user", content: "Something else" },
      ],
    });

    expect(messages().map((message) => message.id)).toEqual(["message-3", "user-4", "message-9"]);
  });
});
