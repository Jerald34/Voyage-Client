import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import MemberRow from "../app/components/team/MemberRow.jsx";

const staff = {
  id: "m-2",
  role: "STAFF",
  createdAt: "2026-05-25T00:00:00.000Z",
  user: { displayName: "Bea Staff", email: "bea@example.com" },
};

function renderRow(props = {}) {
  const onChangeRole = vi.fn();
  const onRemove = vi.fn();
  render(
    <div>
      <button type="button">Outside</button>
      <MemberRow member={staff} viewerRole="OWNER" onChangeRole={onChangeRole} onRemove={onRemove} {...props} />
    </div>,
  );
  return { onChangeRole, onRemove };
}

describe("MemberRow actions menu", () => {
  it("opens a menu and focuses its first item", () => {
    renderRow();
    const trigger = screen.getByRole("button", { name: "Member actions" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Change role" })).toHaveFocus();
  });

  it("closes when you press outside it", () => {
    renderRow();
    fireEvent.click(screen.getByRole("button", { name: "Member actions" }));

    fireEvent.mouseDown(screen.getByRole("button", { name: "Outside" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes on Escape and gives focus back to the trigger", () => {
    renderRow();
    const trigger = screen.getByRole("button", { name: "Member actions" });
    fireEvent.click(trigger);

    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("moves between items with the arrow keys", () => {
    renderRow();
    fireEvent.click(screen.getByRole("button", { name: "Member actions" }));
    const menu = screen.getByRole("menu");

    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(screen.getByRole("menuitem", { name: "Remove" })).toHaveFocus();
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(screen.getByRole("menuitem", { name: "Change role" })).toHaveFocus();
  });

  it("runs the picked action and closes", () => {
    const { onRemove } = renderRow();
    fireEvent.click(screen.getByRole("button", { name: "Member actions" }));

    fireEvent.click(screen.getByRole("menuitem", { name: "Remove" }));

    expect(onRemove).toHaveBeenCalledWith(staff);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("has no actions for the owner's own row", () => {
    renderRow({ member: { ...staff, role: "OWNER" } });
    expect(screen.queryByRole("button", { name: "Member actions" })).not.toBeInTheDocument();
  });
});
