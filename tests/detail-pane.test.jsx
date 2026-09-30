import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app/components/icons/index.js", () => ({
  CloseIcon: (p) => <svg data-testid="close-icon" {...p} />,
}));

import DetailPane from "../app/components/admin/DetailPane.jsx";

describe("DetailPane", () => {
  it("renders the title and children", () => {
    render(<DetailPane open title="Acme" onClose={() => {}}>body here</DetailPane>);
    expect(screen.getByRole("dialog", { name: "Acme" })).toBeInTheDocument();
    expect(screen.getByText("body here")).toBeInTheDocument();
  });

  it("calls onClose on Escape when open", () => {
    const onClose = vi.fn();
    render(<DetailPane open title="Acme" onClose={onClose}>x</DetailPane>);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<DetailPane open title="Acme" onClose={onClose}>x</DetailPane>);
    fireEvent.click(screen.getByRole("button", { name: /close details/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
