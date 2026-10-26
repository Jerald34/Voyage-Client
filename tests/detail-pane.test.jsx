import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

  it("ignores an Escape that something else already handled", () => {
    const onClose = vi.fn();
    render(<DetailPane open title="Acme" onClose={onClose}>x</DetailPane>);
    const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    event.preventDefault();
    window.dispatchEvent(event);
    expect(onClose).not.toHaveBeenCalled();
  });

  describe("close button", () => {
    it("is not hidden at the desktop breakpoint, where the pane is a column that Escape alone could close", () => {
      render(<DetailPane open title="Acme" onClose={() => {}}>x</DetailPane>);
      expect(screen.getByRole("button", { name: /close details/i }).className).not.toMatch(/(^|\s)(lg|md|xl|sm):hidden/);
    });

    it("is only there while the pane is open (an empty-state column has nothing to close)", () => {
      render(<DetailPane open={false} title="Acme" onClose={() => {}}>x</DetailPane>);
      expect(screen.queryByRole("button", { name: /close details/i })).not.toBeInTheDocument();
    });
  });

  describe("modal semantics", () => {
    const realMatchMedia = window.matchMedia;
    afterEach(() => {
      window.matchMedia = realMatchMedia;
    });
    const viewport = (desktop) => {
      window.matchMedia = (query) => ({
        matches: desktop && query === "(min-width: 1024px)",
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      });
    };

    it("is a modal dialog while it is the slide-in drawer (below lg)", () => {
      viewport(false);
      render(<DetailPane open title="Acme" onClose={() => {}}>x</DetailPane>);
      expect(screen.getByRole("dialog", { name: "Acme" })).toHaveAttribute("aria-modal", "true");
    });

    it("does not claim to be modal when it is the static column at lg and up", () => {
      viewport(true);
      render(<DetailPane open title="Acme" onClose={() => {}}>x</DetailPane>);
      expect(screen.getByRole("dialog", { name: "Acme" })).not.toHaveAttribute("aria-modal");
    });

    it("does not claim to be modal while it is closed", () => {
      viewport(false);
      render(<DetailPane open={false} title="Acme" onClose={() => {}}>x</DetailPane>);
      expect(screen.getByRole("dialog", { name: "Acme" })).not.toHaveAttribute("aria-modal");
    });
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<DetailPane open title="Acme" onClose={onClose}>x</DetailPane>);
    fireEvent.click(screen.getByRole("button", { name: /close details/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
