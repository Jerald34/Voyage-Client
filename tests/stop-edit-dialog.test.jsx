import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Modal from "../app/components/ui/Modal.jsx";
import StopEditDialog from "../app/components/trip-dashboard/itinerary-edit/StopEditDialog.jsx";

const lunch = { id: "s1", type: "MEAL", title: "Lunch", startTime: "12:00 PM", endTime: null, description: "Noodles", clientNotes: null, staffNotes: "Call ahead" };

describe("side Modal", () => {
  it("is a bottom sheet on phones and a right-hand panel from sm up", () => {
    render(<Modal open variant="side" title="Edit stop" onClose={() => {}}>Body</Modal>);
    const panel = screen.getByRole("dialog");
    expect(panel.className).toContain("bottom-0");
    expect(panel.className).toContain("rounded-t-[20px]");
    expect(panel.className).toContain("sm:right-0");
    expect(panel.className).toContain("sm:w-[480px]");
  });
});

describe("StopEditDialog", () => {
  it("opens filled with the stop's details", () => {
    render(<StopEditDialog open mode="edit" item={lunch} dayLabel="Day 1: Arrival" onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Edit stop" })).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Lunch");
    expect(screen.getByLabelText("Type")).toHaveValue("MEAL");
    expect(screen.getByLabelText("Start time")).toHaveValue("12:00 PM");
    expect(screen.getByLabelText("Staff notes")).toHaveValue("Call ahead");
  });

  it("opens with focus on the title, not the close button", () => {
    render(<StopEditDialog open mode="edit" item={lunch} dayLabel="Day 1: Arrival" onSubmit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByLabelText("Title")).toHaveFocus();
  });

  it("won't add a stop without a title, and takes focus to the title", async () => {
    const onSubmit = vi.fn();
    render(<StopEditDialog open mode="add" dayLabel="Day 1: Arrival" onSubmit={onSubmit} onClose={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Add a stop to Day 1: Arrival" })).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "Add stop" });
    submit.focus();
    fireEvent.click(submit);

    expect(await screen.findByText("Add a title.")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Title")).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("takes focus to the first field with a problem", async () => {
    const onSubmit = vi.fn();
    render(<StopEditDialog open mode="edit" item={lunch} dayLabel="Day 1: Arrival" onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("End time"), { target: { value: "x".repeat(21) } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "x".repeat(2001) } });
    const save = screen.getByRole("button", { name: "Save" });
    save.focus();
    fireEvent.click(save);

    await waitFor(() => expect(screen.getByLabelText("End time")).toHaveFocus());
    expect(screen.getByLabelText("Description")).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("sends the form and shows the message when saving fails", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: false, message: "Couldn't save your change. Try again." });
    render(<StopEditDialog open mode="edit" item={lunch} dayLabel="Day 1: Arrival" onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "1:00 PM" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: "Lunch", startTime: "1:00 PM" })));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save your change. Try again.");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });
});
