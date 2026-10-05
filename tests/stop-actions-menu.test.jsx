import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// components/icons/index.js contains JSX in a .js file, which vitest cannot parse.
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

import StopActionsMenu from "../app/components/trip-dashboard/itinerary-edit/StopActionsMenu.jsx";

function renderMenu(props = {}) {
  const handlers = { onEdit: vi.fn(), onMoveUp: vi.fn(), onMoveDown: vi.fn(), onMoveToDay: vi.fn(), onDelete: vi.fn() };
  render(<StopActionsMenu stopTitle="Museum" canMoveUp canMoveDown canMoveToDay {...handlers} {...props} />);
  return { handlers, trigger: screen.getByRole("button", { name: "Actions for Museum" }) };
}

describe("StopActionsMenu", () => {
  it("names its button after the stop and starts closed", () => {
    const { trigger } = renderMenu();
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("lists only the moves that make sense", () => {
    const { trigger } = renderMenu({ canMoveUp: false, canMoveToDay: false });
    fireEvent.click(trigger);
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "Edit details",
      "Move down",
      "Delete stop",
    ]);
  });

  it("focuses the first item and moves with the arrow keys, wrapping at the ends", () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    const menu = screen.getByRole("menu");
    const items = screen.getAllByRole("menuitem");

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(items[1]).toHaveFocus();
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(items.at(-1)).toHaveFocus();
  });

  it("closes on Escape and gives focus back to its button", () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("runs the chosen action, closes, and gives focus back to its button", () => {
    const { trigger, handlers } = renderMenu();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete stop" }));
    expect(handlers.onDelete).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("closes when the user clicks elsewhere", () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
