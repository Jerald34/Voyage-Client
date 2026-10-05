import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app/components/icons/index.js", () => {
  const Icon = () => null;
  const isIcon = (name) => typeof name === "string" && name !== "then";
  return new Proxy(
    { __esModule: true },
    {
      get: (target, name) => (name in target ? target[name] : isIcon(name) ? Icon : undefined),
      has: (target, name) => name in target || isIcon(name),
    },
  );
});

import ConfirmActionDialog from "../app/components/trip-dashboard/itinerary-edit/ConfirmActionDialog.jsx";
import MoveStopDialog from "../app/components/trip-dashboard/itinerary-edit/MoveStopDialog.jsx";
import RenameDayDialog from "../app/components/trip-dashboard/itinerary-edit/RenameDayDialog.jsx";
import DayEditActions from "../app/components/trip-dashboard/itinerary-edit/DayEditActions.jsx";
import ItineraryEditDialogs from "../app/components/trip-dashboard/itinerary-edit/ItineraryEditDialogs.jsx";

const lunch = { id: "s2", title: "Lunch" };
const days = [
  { id: "day-1", dayNumber: 1, title: "Arrival", items: [lunch] },
  { id: "day-2", dayNumber: 2, title: "Old town", items: [] },
  { id: "day-3", dayNumber: 3, title: "", items: [] },
];

describe("ConfirmActionDialog", () => {
  it("shows the busy label, then the error, and stays open when the action fails", async () => {
    let finish;
    const onConfirm = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
    render(
      <ConfirmActionDialog open title="Delete this stop?" body="Gone for good." confirmLabel="Delete stop" busyLabel="Deleting…" tone="danger" onConfirm={onConfirm} onClose={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete stop" }));
    expect(await screen.findByRole("button", { name: "Deleting…" })).toBeDisabled();

    finish({ ok: false, message: "Couldn't save your change. Try again." });
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save your change. Try again.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("MoveStopDialog", () => {
  it("starts on the first other day and sends the one the user picks", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true });
    render(
      <MoveStopDialog open stopTitle="Lunch" days={[{ id: "day-2", label: "Day 2: Old town" }, { id: "day-3", label: "Day 3" }]} onSubmit={onSubmit} onClose={vi.fn()} />,
    );

    expect(screen.getByRole("radio", { name: "Day 2: Old town" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "Day 3" }));
    fireEvent.click(screen.getByRole("button", { name: "Move stop" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("day-3"));
  });
});

describe("RenameDayDialog", () => {
  it("opens with the current title and refuses a blank one", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true });
    render(<RenameDayDialog open day={days[0]} onSubmit={onSubmit} onClose={vi.fn()} />);

    const input = screen.getByLabelText("Day title");
    expect(screen.getByRole("heading", { name: "Rename day 1" })).toBeInTheDocument();
    expect(input).toHaveValue("Arrival");
    // The dialog opens on the field, not on its close button.
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: "  " } });
    const save = screen.getByRole("button", { name: "Save" });
    save.focus();
    fireEvent.click(save);
    expect(await screen.findByText("Add a title.")).toBeInTheDocument();
    expect(input).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "Old town walk" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("Old town walk"));
  });
});

describe("DayEditActions", () => {
  it("adds a stop, and offers Rename day only when given a handler", () => {
    const onAddStop = vi.fn();
    const onRenameDay = vi.fn();
    const { rerender } = render(<DayEditActions dayNumber={2} onAddStop={onAddStop} />);
    expect(screen.queryByRole("button", { name: "Rename day 2" })).toBeNull();

    rerender(<DayEditActions dayNumber={2} onAddStop={onAddStop} onRenameDay={onRenameDay} />);
    fireEvent.click(screen.getByRole("button", { name: "Add stop" }));
    fireEvent.click(screen.getByRole("button", { name: "Rename day 2" }));
    expect(onAddStop).toHaveBeenCalledOnce();
    expect(onRenameDay).toHaveBeenCalledOnce();
  });

  it("marks Add stop with its day, so focus can land there when the day empties", () => {
    render(<DayEditActions dayNumber={2} dayId="day-2" onAddStop={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Add stop" })).toHaveAttribute("data-add-stop", "day-2");
  });
});

describe("ItineraryEditDialogs", () => {
  const editorWith = (overrides) => ({
    dialog: null,
    notice: "",
    dismissNotice: vi.fn(),
    closeDialog: vi.fn(),
    submitStop: vi.fn(),
    submitMove: vi.fn(),
    confirmDelete: vi.fn(),
    submitRenameDay: vi.fn(),
    ...overrides,
  });

  it("asks before deleting, naming the stop and its day", () => {
    render(<ItineraryEditDialogs editor={editorWith({ dialog: { kind: "deleteStop", day: days[0], item: lunch } })} days={days} />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/"Lunch" will be removed from Day 1: Arrival/)).toBeInTheDocument();
  });

  it("offers every other day as a move target", () => {
    render(<ItineraryEditDialogs editor={editorWith({ dialog: { kind: "moveStop", day: days[0], item: lunch } })} days={days} />);
    expect(screen.getAllByRole("radio").map((radio) => radio.closest("label").textContent)).toEqual(["Day 2: Old town", "Day 3"]);
  });

  it("shows the notice with a way to dismiss it", () => {
    const editor = editorWith({ notice: "This trip is approved, so it can't be changed. Reopen it to make changes." });
    render(<ItineraryEditDialogs editor={editor} days={days} />);
    expect(screen.getByRole("alert")).toHaveTextContent("This trip is approved");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(editor.dismissNotice).toHaveBeenCalledOnce();
  });
});
