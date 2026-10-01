import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TravelerNeedsDialog from "../app/components/accessibility/TravelerNeedsDialog.jsx";
import TravelerNeedsChips from "../app/components/accessibility/TravelerNeedsChips.jsx";
import ChatInput from "../app/components/trip-dashboard/command-center/ChatInput.jsx";

describe("TravelerNeedsDialog", () => {
  it("preselects saved needs and saves the normalized choice", () => {
    const onSave = vi.fn();
    render(<TravelerNeedsDialog open initialNeeds={{ needs: ["SENIOR"], notes: null }} onCancel={vi.fn()} onSave={onSave} />);

    expect(screen.getByRole("dialog", { name: "Traveler needs" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Senior travelers/ })).toBeChecked();

    fireEvent.click(screen.getByRole("checkbox", { name: /Wheelchair user/ }));
    fireEvent.change(screen.getByRole("textbox", { name: /Notes for the agent/ }), { target: { value: "  Uses a cane  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save needs" }));

    expect(onSave).toHaveBeenCalledWith({ needs: ["WHEELCHAIR", "SENIOR"], notes: "Uses a cane" });
  });

  it("focuses the first option when it opens", () => {
    render(<TravelerNeedsDialog open initialNeeds={null} onCancel={vi.fn()} onSave={vi.fn()} />);

    expect(document.activeElement).toBe(screen.getByRole("checkbox", { name: /Wheelchair user/ }));
  });

  it("cancels on Escape and on Cancel, and renders nothing when closed", () => {
    const onCancel = vi.fn();
    const { rerender } = render(<TravelerNeedsDialog open onCancel={onCancel} onSave={vi.fn()} />);

    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(2);

    rerender(<TravelerNeedsDialog open={false} onCancel={onCancel} onSave={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("TravelerNeedsDialog focus management", () => {
  it("keeps Tab inside the dialog and returns focus to the opener on close", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const { rerender } = render(<TravelerNeedsDialog open onCancel={vi.fn()} onSave={vi.fn()} />);

    const first = screen.getByRole("checkbox", { name: /Wheelchair user/ });
    const last = screen.getByRole("button", { name: "Save needs" });

    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);

    rerender(<TravelerNeedsDialog open={false} onCancel={vi.fn()} onSave={vi.fn()} />);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

describe("TravelerNeedsChips", () => {
  it("lists selected needs and offers an edit button", () => {
    const onEdit = vi.fn();
    render(<TravelerNeedsChips travelerNeeds={{ needs: ["WHEELCHAIR"], notes: "Uses a cane" }} onEdit={onEdit} />);

    const group = screen.getByRole("group", { name: "Traveler needs" });
    expect(group).toHaveTextContent("Wheelchair user");
    expect(group).toHaveTextContent("Notes added");
    fireEvent.click(screen.getByRole("button", { name: "Edit traveler needs" }));
    expect(onEdit).toHaveBeenCalled();
  });

  it("renders nothing without needs", () => {
    const { container } = render(<TravelerNeedsChips travelerNeeds={{ needs: [], notes: null }} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("ChatInput traveler needs", () => {
  const baseProps = {
    textareaRef: { current: null },
    composerInput: "",
    setComposerInput: vi.fn(),
    handleKeyDown: vi.fn(),
    submitComposer: vi.fn(),
    isSending: false,
  };

  it("shows a needs button only when the page supports it, labelled with the current needs", () => {
    const onEdit = vi.fn();
    const { rerender } = render(<ChatInput {...baseProps} />);
    expect(screen.queryByRole("button", { name: /traveler needs/i })).toBeNull();

    rerender(<ChatInput {...baseProps} onEditTravelerNeeds={onEdit} />);
    fireEvent.click(screen.getByRole("button", { name: "Add traveler needs" }));
    expect(onEdit).toHaveBeenCalledTimes(1);

    rerender(<ChatInput {...baseProps} onEditTravelerNeeds={onEdit} travelerNeeds={{ needs: ["WHEELCHAIR"], notes: null }} />);
    expect(screen.getByRole("button", { name: "Traveler needs: Wheelchair user" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Traveler needs" })).toHaveTextContent("Wheelchair user");
  });
});
