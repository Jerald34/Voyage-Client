import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AgentPausedStrip from "../app/components/trip-dashboard/command-center/AgentPausedStrip.jsx";

describe("AgentPausedStrip", () => {
  it("says the agent is paused and lets the user ask why", () => {
    const onWhy = vi.fn();
    render(<AgentPausedStrip pause={{ pausedAt: "p", until: null, reason: "x" }} onWhy={onWhy} />);

    expect(screen.getByRole("status")).toHaveTextContent("Agent paused");
    fireEvent.click(screen.getByRole("button", { name: "Why?" }));
    expect(onWhy).toHaveBeenCalledTimes(1);
  });

  it("makes Why? a full-size touch target that animates only what it changes, and tints on hover only for a mouse", () => {
    render(<AgentPausedStrip pause={{ pausedAt: "p", until: null, reason: "x" }} onWhy={vi.fn()} />);

    const why = screen.getByRole("button", { name: "Why?" });
    expect(why).toHaveClass("min-h-11");
    expect(why).toHaveClass("transition-[color,background-color,transform]", "duration-150", "ease-out");
    expect(why).not.toHaveClass("transition-colors");
    expect(why.className).toContain("[@media(hover:hover)_and_(pointer:fine)]:hover:bg-border/10");
    expect(why.className).not.toMatch(/(^|\s)hover:/);
  });
});
