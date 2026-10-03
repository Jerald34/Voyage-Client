import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WorklistRow from "../app/agency/[agencyId]/components/dashboard/widgets/WorklistRow.jsx";

function renderRow(props = {}) {
  return render(
    <WorklistRow
      tone="info"
      title="Reply to Jane Doe"
      subtitle="Quick question about the day 3 transfer"
      actionLabel="Reply"
      onAction={() => {}}
      {...props}
    />
  );
}

describe("WorklistRow", () => {
  it("renders title, subtitle, and action label", () => {
    renderRow();
    expect(screen.getByText("Reply to Jane Doe")).toBeInTheDocument();
    expect(screen.getByText(/Quick question/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reply" })).toBeInTheDocument();
  });

  it.each([
    ["warning", "Needs attention"],
    ["danger", "Urgent"],
    ["success", "Coming up"],
  ])('names the %s tone for screen readers in words ("%s"), not the raw key', (tone, label) => {
    const { container } = renderRow({ tone });
    expect(container.querySelector(".sr-only").textContent).toBe(label);
  });

  it("adds no tone label to plain info rows", () => {
    const { container } = renderRow({ tone: "info" });
    expect(container.querySelector(".sr-only")).toBeNull();
  });

  it("fires onAction when the action button is clicked", () => {
    const onAction = vi.fn();
    renderRow({ onAction });
    fireEvent.click(screen.getByRole("button", { name: "Reply" }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("fires onRowClick when the row body is clicked (but not the action)", () => {
    const onAction = vi.fn();
    const onRowClick = vi.fn();
    renderRow({ onAction, onRowClick });

    const buttons = screen.getAllByRole("button");
    // The first button is the row body, the second is the action.
    const rowBody = buttons[0];
    const actionBtn = buttons[buttons.length - 1];

    fireEvent.click(rowBody);
    expect(onRowClick).toHaveBeenCalledOnce();
    expect(onAction).not.toHaveBeenCalled();

    fireEvent.click(actionBtn);
    expect(onAction).toHaveBeenCalledOnce();
    // onRowClick must not double-fire from the action click (event isolation)
    expect(onRowClick).toHaveBeenCalledOnce();
  });

  it("disables the action button when actionDisabled is true", () => {
    const onAction = vi.fn();
    renderRow({ onAction, actionDisabled: true });
    const btn = screen.getByRole("button", { name: "Reply" });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onAction).not.toHaveBeenCalled();
  });

  it("shows the row's kind as an icon, keeping the tone label for screen readers", () => {
    const { container } = renderRow({ kind: "unreadComments", tone: "warning" });
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector(".sr-only").textContent).toBe("Needs attention");
  });

  it("enters after the delay it is given", () => {
    renderRow({ enterDelay: 80 });
    expect(screen.getByRole("listitem")).toHaveStyle({ transitionDelay: "80ms" });
  });

  it("shows a dot, not an icon, when the row has no kind", () => {
    const { container } = renderRow();
    expect(container.querySelector("svg")).not.toBeInTheDocument();
    expect(container.querySelector(".h-2.w-2.rounded-full")).toBeInTheDocument();
  });

  it("falls back to a dot when the kind has no icon", () => {
    const { container } = renderRow({ kind: "somethingTheServerAddedLater" });
    expect(container.querySelector("svg")).not.toBeInTheDocument();
    expect(container.querySelector(".h-2.w-2.rounded-full")).toBeInTheDocument();
  });

  it("shows no dot next to a kind that has an icon", () => {
    const { container } = renderRow({ kind: "unreadComments" });
    expect(container.querySelector(".h-2.w-2.rounded-full")).not.toBeInTheDocument();
  });
});
