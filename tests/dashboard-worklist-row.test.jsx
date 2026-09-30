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

  it("includes a screen-reader status label paired with the tone color (not color-only)", () => {
    const { container } = renderRow({ tone: "warning" });
    const srLabel = container.querySelector(".sr-only");
    expect(srLabel).toBeTruthy();
    expect(srLabel.textContent.toLowerCase()).toContain("warning");
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
});
