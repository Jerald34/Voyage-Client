import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import ChatComposer from "../app/components/trip-dashboard/command-center/ChatComposer.jsx";

const questions = [
  { id: "q1", header: "Transport", question: "Car or train?", multiSelect: false, options: [{ label: "Car" }, { label: "Train" }] },
];
const asking = { id: "m-2", role: "assistant", content: "One question first.", metadata: { askUser: { questions } } };

function composerProps(overrides = {}) {
  return {
    messages: [asking],
    onAnswer: vi.fn(),
    textareaRef: createRef(),
    composerInput: "",
    setComposerInput: vi.fn(),
    handleKeyDown: vi.fn(),
    submitComposer: vi.fn(),
    isSending: false,
    agentError: "",
    ...overrides,
  };
}

describe("ChatComposer", () => {
  it("shows the question panel while the newest reply is asking", () => {
    render(<ChatComposer {...composerProps()} />);

    expect(screen.getByRole("group", { name: "Car or train?" })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Ask the agent to adjust the draft...")).not.toBeInTheDocument();
  });

  it("shows the normal composer when nothing is asked", () => {
    render(<ChatComposer {...composerProps({ messages: [{ id: "m-1", role: "assistant", content: "Done." }] })} />);

    expect(screen.getByPlaceholderText("Ask the agent to adjust the draft...")).toBeInTheDocument();
  });

  it("keeps the normal composer while a message is sending", () => {
    render(<ChatComposer {...composerProps({ isSending: true })} />);

    expect(screen.queryByRole("group", { name: "Car or train?" })).not.toBeInTheDocument();
  });

  it("sends the answer text and payload", () => {
    const props = composerProps();
    render(<ChatComposer {...props} />);

    fireEvent.click(screen.getByRole("radio", { name: "Train" }));
    fireEvent.click(screen.getByRole("button", { name: "Send answers" }));

    expect(props.onAnswer).toHaveBeenCalledWith(
      "Transport: Train",
      expect.objectContaining({ request: { messageId: "m-2", items: [{ questionId: "q1", selected: ["Train"] }] } }),
    );
  });

  it("returns to the text box when dismissed, and asks again for a newer question", () => {
    const props = composerProps();
    const { rerender } = render(<ChatComposer {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Type a normal reply instead" }));
    expect(screen.getByPlaceholderText("Ask the agent to adjust the draft...")).toBeInTheDocument();

    rerender(
      <ChatComposer {...props} messages={[asking, { id: "u-3", role: "user", content: "Hm" }, { ...asking, id: "m-4" }]} />,
    );
    expect(screen.getByRole("group", { name: "Car or train?" })).toBeInTheDocument();
  });

  it("brings the question back with the picks and the error after a failed send", () => {
    const props = composerProps();
    const { rerender } = render(<ChatComposer {...props} />);

    fireEvent.click(screen.getByRole("radio", { name: "Train" }));
    fireEvent.click(screen.getByRole("button", { name: "Send answers" }));
    rerender(<ChatComposer {...props} isSending />);
    expect(screen.queryByRole("group", { name: "Car or train?" })).not.toBeInTheDocument();
    rerender(<ChatComposer {...props} isSending={false} agentError="Could not send. Try again." />);

    expect(screen.getByRole("radio", { name: "Train" })).toBeChecked();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not send. Try again.");
  });

  it("moves focus to the text box when dismissed", () => {
    render(<ChatComposer {...composerProps()} />);

    fireEvent.click(screen.getByRole("button", { name: "Type a normal reply instead" }));

    expect(screen.getByPlaceholderText("Ask the agent to adjust the draft...")).toHaveFocus();
  });
});
