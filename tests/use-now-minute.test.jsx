import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNowMinute } from "../app/hooks/useLocalClock.js";

function Clock() {
  const now = useNowMinute();
  return <p>{now === null ? "no clock" : new Date(now).toISOString()}</p>;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-04T12:00:30.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useNowMinute", () => {
  it("renders nothing time-based on the server", () => {
    expect(renderToString(<Clock />)).toContain("no clock");
  });

  it("gives the browser's time, floored to the minute", () => {
    render(<Clock />);
    expect(screen.getByText("2026-10-04T12:00:00.000Z")).toBeInTheDocument();
  });

  it("moves on when the minute turns", () => {
    render(<Clock />);
    act(() => {
      vi.advanceTimersByTime(30_100);
    });
    expect(screen.getByText("2026-10-04T12:01:00.000Z")).toBeInTheDocument();
  });
});
