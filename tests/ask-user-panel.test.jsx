import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AskUserPanel from "../app/components/trip-dashboard/command-center/AskUserPanel.jsx";

const questions = [
  {
    id: "q1",
    header: "Transport",
    question: "How will the travelers get around?",
    multiSelect: false,
    options: [{ label: "Private car", description: "Most stops per day" }, { label: "Public transit" }],
  },
  {
    id: "q2",
    header: "Interests",
    question: "What should the days focus on?",
    multiSelect: true,
    options: [{ label: "Food" }, { label: "Museums" }, { label: "Nature" }],
  },
];

function renderPanel(props = {}) {
  const onSubmit = vi.fn();
  const onDismiss = vi.fn();
  render(<AskUserPanel questions={questions} onSubmit={onSubmit} onDismiss={onDismiss} {...props} />);
  return { onSubmit, onDismiss };
}

describe("AskUserPanel", () => {
  it("shows the first question as a radio group and focuses its first option", () => {
    renderPanel();

    expect(screen.getByRole("group", { name: "How will the travelers get around?" })).toBeInTheDocument();
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Private car/ })).toHaveFocus();
    expect(screen.getByText("Most stops per day")).toBeInTheDocument();
  });

  it("asks for an answer before moving on", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("Pick an option or type your own answer.")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "How will the travelers get around?" })).toBeInTheDocument();
  });

  it("steps through the questions and sends every answer", () => {
    const { onSubmit } = renderPanel();

    fireEvent.click(screen.getByRole("radio", { name: /Public transit/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Food" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Museums" }));
    fireEvent.click(screen.getByRole("button", { name: "Send answers" }));

    expect(onSubmit).toHaveBeenCalledWith({
      q1: { selected: ["Public transit"], other: "" },
      q2: { selected: ["Food", "Museums"], other: "" },
    });
  });

  it("keeps an earlier answer when going back", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("radio", { name: /Public transit/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByRole("radio", { name: /Public transit/ })).toBeChecked();
  });

  it("replaces a single choice with typed text", () => {
    const { onSubmit } = renderPanel({ questions: [questions[0]] });

    fireEvent.click(screen.getByRole("radio", { name: /Private car/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Something else" }), { target: { value: "Hired driver" } });

    expect(screen.getByRole("radio", { name: /Private car/ })).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Send answers" }));
    expect(onSubmit).toHaveBeenCalledWith({ q1: { selected: [], other: "Hired driver" } });
  });

  it("hands back to the normal composer", () => {
    const { onDismiss } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Type a normal reply instead" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("moves on with Enter on an option", () => {
    renderPanel();
    const transit = screen.getByRole("radio", { name: /Public transit/ });

    fireEvent.click(transit);
    fireEvent.keyDown(transit, { key: "Enter" });

    expect(screen.getByRole("group", { name: "What should the days focus on?" })).toBeInTheDocument();
  });

  it("announces the missing answer and puts focus back on the options", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Pick an option or type your own answer.");
    expect(screen.getByRole("radio", { name: /Private car/ })).toHaveFocus();
  });

  it("returns focus to the chosen option when going back", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("radio", { name: /Public transit/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByRole("radio", { name: /Public transit/ })).toHaveFocus();
  });

  it("shows a send error from the server", () => {
    renderPanel({ error: "Could not send. Try again." });

    expect(screen.getByRole("alert")).toHaveTextContent("Could not send. Try again.");
  });
});
