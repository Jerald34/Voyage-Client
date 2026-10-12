import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FlashNotice from "../app/components/trip-dashboard/layout/FlashNotice.jsx";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("FlashNotice", () => {
  it("announces the message and clears it after six seconds", () => {
    const onDone = vi.fn();
    render(<FlashNotice message="New option created." onDone={onDone} />);

    expect(screen.getByRole("status")).toHaveTextContent("New option created.");
    act(() => vi.advanceTimersByTime(5999));
    expect(onDone).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("keeps an empty live region mounted when there is nothing to say", () => {
    render(<FlashNotice message="" onDone={vi.fn()} />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
