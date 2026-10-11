import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AgentCommandCenter from "../app/components/trip-dashboard/command-center/AgentCommandCenter.jsx";
import ChatMessage from "../app/components/trip-dashboard/command-center/ChatMessage.jsx";

const questions = [
  { id: "q1", header: "Transport", question: "How will the travelers get around?", multiSelect: false, options: [{ label: "Private car" }, { label: "Public transit" }] },
  { id: "q2", header: "Trip length", question: "How many days should I plan?", multiSelect: false, options: [{ label: "2 days" }, { label: "3 days" }] },
];
const asking = { id: "m-2", role: "assistant", content: "A couple of details first.", metadata: { askUser: { questions } } };
const answer = {
  id: "u-3",
  role: "user",
  content: "Transport: Public transit\nTrip length: 4 days",
  metadata: {
    answers: {
      messageId: "m-2",
      items: [
        { questionId: "q1", header: "Transport", question: questions[0].question, selected: ["Public transit"] },
        { questionId: "q2", header: "Trip length", question: questions[1].question, selected: [], other: "4 days" },
      ],
    },
  },
};

function renderCenter(messages) {
  return render(
    <AgentCommandCenter
      messages={messages}
      isStreaming={false}
      assistantMessage=""
      toolCalls={[]}
      thoughtEntries={[]}
      dispatchAgentMessage={vi.fn()}
      dispatchAgentAnswer={vi.fn()}
      composerInput=""
      setComposerInput={vi.fn()}
      isSending={false}
      agentError=""
      user={{ displayName: "Jerald" }}
    />,
  );
}

describe("ask_user in the chat history", () => {
  it("shows each answer next to its question's header", () => {
    render(<ChatMessage message={answer} isUser userName="Jerald" userInitials="JD" />);

    expect(screen.getByText("Transport")).toBeInTheDocument();
    expect(screen.getByText("Public transit")).toBeInTheDocument();
    expect(screen.getByText("4 days")).toBeInTheDocument();
    expect(screen.queryByText(/Transport: Public transit/)).not.toBeInTheDocument();
  });

  it("lists the questions a skipped reply asked", () => {
    render(<ChatMessage message={asking} isUser={false} userName="Jerald" userInitials="JD" askUserStatus="skipped" />);

    expect(screen.getByText("Not answered: Transport, Trip length")).toBeInTheDocument();
  });

  it("shows the question panel in place of the composer while a question is open", () => {
    renderCenter([{ id: "u-1", role: "user", content: "Plan Kyoto" }, asking]);

    expect(screen.getByRole("group", { name: "How will the travelers get around?" })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Ask the agent to adjust the draft...")).not.toBeInTheDocument();
  });

  it("offers no edit button on an answer", () => {
    renderCenter([asking, answer]);

    expect(screen.queryByRole("button", { name: "Edit this message" })).not.toBeInTheDocument();
  });
});
