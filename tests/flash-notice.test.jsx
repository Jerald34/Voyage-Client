import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FlashNotice from "../app/components/trip-dashboard/layout/FlashNotice.jsx";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("FlashNotice", () => {
  it("announces the message and clears it after six seconds", () => {
    const onDone = vi.fn();
    render(<FlashNotice notice={{ text: "New option created.", id: 1 }} onDone={onDone} />);

    expect(screen.getByRole("status")).toHaveTextContent("New option created.");
    act(() => vi.advanceTimersByTime(5999));
    expect(onDone).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("keeps an empty live region mounted when there is nothing to say", () => {
    render(<FlashNotice notice={null} onDone={vi.fn()} />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("announces the same text again, and restarts the timer, when it comes back with a new id", () => {
    const onDone = vi.fn();
    const { rerender } = render(<FlashNotice notice={{ text: "Couldn't copy this trip. Try again.", id: 1 }} onDone={onDone} />);
    const first = screen.getByText("Couldn't copy this trip. Try again.");

    act(() => vi.advanceTimersByTime(4000));
    rerender(<FlashNotice notice={{ text: "Couldn't copy this trip. Try again.", id: 2 }} onDone={onDone} />);

    // A new element in the live region is what gets read out again.
    expect(screen.getByText("Couldn't copy this trip. Try again.")).not.toBe(first);
    act(() => vi.advanceTimersByTime(4000));
    expect(onDone).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(2000));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("sits under the header, not over it, and shows against a dark page", () => {
    render(<FlashNotice notice={{ text: "Hello", id: 1 }} onDone={vi.fn()} />);

    expect(screen.getByRole("status").className).toContain("top-[108px]");
    expect(screen.getByRole("status").className).toContain("max-[900px]:top-[56px]");
    expect(screen.getByText("Hello").className).toContain("border-white/10");
  });
});
