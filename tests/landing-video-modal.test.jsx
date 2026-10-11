import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import VideoModal from "../app/components/landing/VideoModal.jsx";

function Harness() {
  const [open, setOpen] = useState(false);
  const [renders, setRenders] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Watch the demo</button>
      <button type="button" onClick={() => setRenders((n) => n + 1)}>Re-render {renders}</button>
      <VideoModal isOpen={open} onClose={() => setOpen(false)} videoUrl="https://video.test/demo.mp4" />
    </>
  );
}

describe("VideoModal", () => {
  const originalPause = window.HTMLMediaElement.prototype.pause;
  let pause;

  beforeEach(() => {
    pause = vi.fn();
    window.HTMLMediaElement.prototype.pause = pause;
  });

  afterEach(() => {
    // Unmount while the stub is still in place so the closing effect never hits jsdom's unimplemented pause().
    cleanup();
    window.HTMLMediaElement.prototype.pause = originalPause;
    document.body.style.overflow = "";
  });

  it("is a labelled modal dialog that takes focus and gives it back", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Watch the demo" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Voyage demo video" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "Close video" })).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("keeps Tab inside the dialog", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Watch the demo" }));

    const close = screen.getByRole("button", { name: "Close video" });
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.querySelector("video")).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(close).toHaveFocus();
  });

  it("does not reset the video or move focus when the parent re-renders", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Watch the demo" });
    trigger.focus();
    fireEvent.click(trigger);

    // Park focus on the video, then re-render the parent (fresh onClose arrow each time).
    document.querySelector("video").focus();
    fireEvent.click(screen.getByRole("button", { name: /Re-render/ }));
    fireEvent.click(screen.getByRole("button", { name: /Re-render/ }));

    expect(document.querySelector("video")).toHaveFocus();
    expect(pause).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("pauses and resets the video, locks body scroll while open, then restores it", () => {
    document.body.style.overflow = "scroll";
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Watch the demo" }));
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.click(screen.getByRole("button", { name: "Close video" }));
    expect(pause).toHaveBeenCalledTimes(1);
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("closes when the backdrop is clicked but not when the video is clicked", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Watch the demo" }));

    fireEvent.click(document.querySelector("video"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("dialog").parentElement);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
