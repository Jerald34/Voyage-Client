import { fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ClientCommentsCard from "../app/agency/[agencyId]/components/dashboard/widgets/ClientCommentsCard.jsx";

const NOW = Date.parse("2026-10-20T12:00:00.000Z");
const row = (id, fields = {}) => ({
  id,
  shareId: "s1",
  tripId: "t1",
  tripTitle: "Kyoto Autumn Escape",
  clientName: "Santos Family",
  authorName: "Maria Santos",
  excerpt: "Is the ryokan wheelchair accessible?",
  dayNumber: 1,
  itemTitle: "Ryokan check-in",
  createdAt: "2026-10-20T06:00:00.000Z",
  agencyReply: null,
  agencyRepliedAt: null,
  ...fields,
});
const comments = {
  waiting: [row("w1"), row("w2", { authorName: "Leo Cruz", tripTitle: "Boracay", dayNumber: 2, itemTitle: null })],
  answered: [row("a1", { agencyReply: "Yes, it is.", agencyRepliedAt: "2026-10-18T12:00:00.000Z" })],
};

describe("ClientCommentsCard", () => {
  it("lists waiting comments by default, with who, where and how long", () => {
    render(<ClientCommentsCard comments={comments} onOpenComment={vi.fn()} now={NOW} />);
    const card = screen.getByRole("region", { name: "Client comments" });
    expect(within(card).getByRole("button", { name: "Waiting (2)" })).toHaveAttribute("aria-pressed", "true");
    const first = within(card).getAllByRole("button", { name: /^Maria Santos/ })[0];
    expect(within(first).getByText("Kyoto Autumn Escape · Day 1 · Ryokan check-in")).toBeInTheDocument();
    expect(within(first).getByText("“Is the ryokan wheelchair accessible?”")).toBeInTheDocument();
    expect(within(first).getByText("Waiting 6h")).toBeInTheDocument();
  });

  it("switches to answered comments and shows the reply", () => {
    render(<ClientCommentsCard comments={comments} onOpenComment={vi.fn()} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: "Answered (1)" }));
    expect(screen.getByText("You: Yes, it is.")).toBeInTheDocument();
    expect(screen.getByText("Replied 2d ago")).toBeInTheDocument();
  });

  it("opens the comment that was clicked", () => {
    const onOpenComment = vi.fn();
    render(<ClientCommentsCard comments={comments} onOpenComment={onOpenComment} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: /^Leo Cruz/ }));
    expect(onOpenComment).toHaveBeenCalledWith(comments.waiting[1]);
  });

  it("says when nothing is waiting", () => {
    render(<ClientCommentsCard comments={{ waiting: [], answered: [] }} onOpenComment={vi.fn()} now={NOW} />);
    expect(screen.getByText("No comments are waiting for a reply.")).toBeInTheDocument();
  });

  it("shows five rows, then the rest on request", () => {
    const many = { waiting: Array.from({ length: 7 }, (_, i) => row(`w${i}`, { authorName: `Client ${i}` })), answered: [] };
    render(<ClientCommentsCard comments={many} onOpenComment={vi.fn()} now={NOW} />);
    expect(screen.getAllByRole("button", { name: /^Client \d/ })).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "Show all (7)" }));
    expect(screen.getAllByRole("button", { name: /^Client \d/ })).toHaveLength(7);
  });

  it("says when nothing was answered recently, and flips which filter is pressed", () => {
    render(<ClientCommentsCard comments={{ waiting: [row("w1")], answered: [] }} onOpenComment={vi.fn()} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: "Answered (0)" }));
    expect(screen.getByRole("button", { name: "Answered (0)" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Waiting (1)" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("No replies in the last 30 days.")).toBeInTheDocument();
  });

  it("collapses back to five rows when the filter changes", () => {
    const many = {
      waiting: Array.from({ length: 7 }, (_, i) => row(`w${i}`, { authorName: `Client ${i}` })),
      answered: Array.from({ length: 6 }, (_, i) => row(`a${i}`, { authorName: `Replied ${i}`, agencyReply: "Done.", agencyRepliedAt: "2026-10-19T12:00:00.000Z" })),
    };
    render(<ClientCommentsCard comments={many} onOpenComment={vi.fn()} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: "Show all (7)" }));
    fireEvent.click(screen.getByRole("button", { name: "Answered (6)" }));
    expect(screen.getAllByRole("button", { name: /^Replied \d/ })).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Show all (6)" })).toHaveAttribute("aria-expanded", "false");
  });

  it("leaves the elapsed time out of the server render, which has no browser clock", () => {
    const html = renderToString(<ClientCommentsCard comments={comments} onOpenComment={vi.fn()} />);
    expect(html).toContain("Maria Santos");
    expect(html).not.toContain("Waiting 6h");
    expect(html).not.toMatch(/Waiting \d/);
  });
});
