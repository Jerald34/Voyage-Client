import { fireEvent, render, screen } from "@testing-library/react";
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
vi.mock("next/dynamic", () => ({ default: () => function DynamicStub() { return null; } }));
vi.mock("../app/components/trip-dashboard/pages/CommentsPanel.jsx", () => ({ default: () => null }));

import ItineraryDayView from "../app/components/trip-dashboard/pages/ItineraryDayView.jsx";
import CompactPlaceCard from "../app/components/trip-dashboard/mobile/CompactPlaceCard.jsx";

const days = [
  { id: "day-1", dayNumber: 1, title: "Arrival", items: [{ id: "s1", title: "Museum", type: "ACTIVITY" }, { id: "s2", title: "Lunch", type: "MEAL" }] },
  { id: "day-2", dayNumber: 2, title: "Old town", items: [] },
];

const editorStub = (overrides = {}) => ({
  canEdit: true,
  openEditStop: vi.fn(),
  openAddStop: vi.fn(),
  openMoveStop: vi.fn(),
  openDeleteStop: vi.fn(),
  openRenameDay: vi.fn(),
  moveStopBy: vi.fn(),
  ...overrides,
});

function renderDayView(editor) {
  return render(
    <ItineraryDayView
      agencyId="ag-1"
      selectedTripId="t1"
      selectedItineraryId="itin-1"
      fullItinerary={{ id: "itin-1", days }}
      safeDays={days}
      selectedDay={days[0]}
      selectedDayIndex={0}
      selectedDayMapItems={[]}
      activeStopIndex={-1}
      setActiveStopIndex={vi.fn()}
      tripStart={null}
      isLoadingItinerary={false}
      itineraryError={null}
      showCommentsPanel={false}
      setShowCommentsPanel={vi.fn()}
      theme="light"
      editor={editor}
    />,
  );
}

describe("ItineraryDayView edit controls", () => {
  it("shows none without an editor, or when editing is off", () => {
    const { rerender } = renderDayView(undefined);
    expect(screen.queryByRole("button", { name: "Actions for Museum" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add stop" })).toBeNull();

    rerender(
      <ItineraryDayView
        agencyId="ag-1" selectedTripId="t1" selectedItineraryId="itin-1" fullItinerary={{ id: "itin-1", days }}
        safeDays={days} selectedDay={days[0]} selectedDayIndex={0} selectedDayMapItems={[]} activeStopIndex={-1}
        setActiveStopIndex={vi.fn()} tripStart={null} isLoadingItinerary={false} itineraryError={null}
        showCommentsPanel={false} setShowCommentsPanel={vi.fn()} theme="light" editor={editorStub({ canEdit: false })}
      />,
    );
    expect(screen.queryByRole("button", { name: "Rename day 1" })).toBeNull();
  });

  it("gives each stop a menu wired to that stop", () => {
    const editor = editorStub();
    renderDayView(editor);

    fireEvent.click(screen.getByRole("button", { name: "Actions for Lunch" }));
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "Edit details",
      "Move up",
      "Move to another day",
      "Delete stop",
    ]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Move up" }));
    expect(editor.moveStopBy).toHaveBeenCalledWith(days[0], 1, -1);
  });

  it("marks each menu with its stop and Add stop with its day, for the editor's focus handling", () => {
    renderDayView(editorStub());
    expect(screen.getByRole("button", { name: "Actions for Museum" })).toHaveAttribute("data-stop-menu", "s1");
    expect(screen.getByRole("button", { name: "Actions for Lunch" })).toHaveAttribute("data-stop-menu", "s2");
    expect(screen.getByRole("button", { name: "Add stop" })).toHaveAttribute("data-add-stop", "day-1");
  });

  it("adds a stop and renames the day", () => {
    const editor = editorStub();
    renderDayView(editor);

    fireEvent.click(screen.getByRole("button", { name: "Add stop" }));
    fireEvent.click(screen.getByRole("button", { name: "Rename day 1" }));
    expect(editor.openAddStop).toHaveBeenCalledWith(days[0]);
    expect(editor.openRenameDay).toHaveBeenCalledWith(days[0]);
  });
});

describe("CompactPlaceCard actions", () => {
  it("puts the menu beside the card's button, not inside it", () => {
    render(<CompactPlaceCard item={days[0].items[0]} onSelect={vi.fn()} actions={<button type="button">Actions</button>} />);
    const card = screen.getByRole("button", { name: /Museum/ });
    expect(card).not.toContainElement(screen.getByRole("button", { name: "Actions" }));
  });

  it("shows the stop's own title over its place's name, like the desktop card", () => {
    const item = { id: "i-9", title: "Lunch by the beach", placeSnapshot: { id: "s-9", name: "Great Northwest Travel Stop" } };
    render(<CompactPlaceCard item={item} onSelect={vi.fn()} />);
    expect(screen.getByText("Lunch by the beach")).toBeInTheDocument();
    expect(screen.queryByText("Great Northwest Travel Stop")).toBeNull();
  });
});
