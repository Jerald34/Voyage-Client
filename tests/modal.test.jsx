import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Modal from "../app/components/ui/Modal.jsx";

function Harness({ open = true, onClose = () => {}, initialFocusRef }) {
  return (
    <>
      <button type="button">opener</button>
      <Modal open={open} onClose={onClose} title="A dialog" initialFocusRef={initialFocusRef}>
        <input aria-label="first" />
        <input aria-label="second" />
      </Modal>
    </>
  );
}

afterEach(() => {
  document.body.style.overflow = "";
});

describe("Modal", () => {
  describe("focus", () => {
    it("moves focus to the first control when it opens, and back to the opener when it closes", () => {
      const { rerender } = render(<Harness open={false} />);
      screen.getByRole("button", { name: "opener" }).focus();

      rerender(<Harness open />);
      // The header's Close button comes before the body in the DOM.
      expect(screen.getByRole("dialog")).toContainElement(document.activeElement);
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));

      rerender(<Harness open={false} />);
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "opener" }));
    });

    it("starts on initialFocusRef when the form names a field", () => {
      const ref = { current: null };
      function WithRef() {
        return (
          <Modal open onClose={() => {}} title="A dialog" initialFocusRef={ref}>
            <input aria-label="first" />
            <input aria-label="second" ref={ref} />
          </Modal>
        );
      }
      render(<WithRef />);
      expect(document.activeElement).toBe(screen.getByLabelText("second"));
    });

    it("leaves focus where it is when the parent passes a new onClose", () => {
      const { rerender } = render(<Harness onClose={() => {}} />);
      screen.getByLabelText("second").focus();

      // A parent that builds onClose inline (or a guard that depends on state) hands over a new function every render.
      rerender(<Harness onClose={() => {}} />);
      rerender(<Harness onClose={() => {}} />);

      expect(document.activeElement).toBe(screen.getByLabelText("second"));
    });

    it("keeps Tab inside the dialog", () => {
      render(<Harness />);
      const close = screen.getByRole("button", { name: "Close" });
      const second = screen.getByLabelText("second");

      second.focus();
      fireEvent.keyDown(second, { key: "Tab" });
      expect(document.activeElement).toBe(close);

      fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
      expect(document.activeElement).toBe(second);
    });
  });

  it("brings focus back into the dialog on Tab when it fell to the page", () => {
    render(<Harness />);
    document.activeElement.blur();
    expect(document.activeElement).toBe(document.body);

    fireEvent.keyDown(document.body, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));

    document.activeElement.blur();
    fireEvent.keyDown(document.body, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(screen.getByLabelText("second"));
  });

  describe("Escape", () => {
    it("closes through the latest onClose", () => {
      const first = vi.fn();
      const second = vi.fn();
      const { rerender } = render(<Harness onClose={first} />);
      rerender(<Harness onClose={second} />);

      fireEvent.keyDown(document.activeElement, { key: "Escape" });

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });

    it("is handled here and never reaches the page behind the dialog", () => {
      const behind = vi.fn();
      window.addEventListener("keydown", behind);
      render(<Harness onClose={vi.fn()} />);

      const notCancelled = fireEvent.keyDown(document.activeElement, { key: "Escape" });

      window.removeEventListener("keydown", behind);
      expect(behind).not.toHaveBeenCalled();
      expect(notCancelled).toBe(false); // preventDefault was called
    });

    it("is swallowed even when onClose decides to do nothing", () => {
      const behind = vi.fn();
      window.addEventListener("keydown", behind);
      render(<Harness onClose={() => {}} />);

      fireEvent.keyDown(document.activeElement, { key: "Escape" });

      window.removeEventListener("keydown", behind);
      expect(behind).not.toHaveBeenCalled();
    });

    it("lets other keys through", () => {
      const behind = vi.fn();
      window.addEventListener("keydown", behind);
      render(<Harness onClose={vi.fn()} />);

      fireEvent.keyDown(document.activeElement, { key: "a" });

      window.removeEventListener("keydown", behind);
      expect(behind).toHaveBeenCalledTimes(1);
    });
  });
});
