import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchApi: vi.fn() }));
vi.mock("../app/components/icons/index.js", () => ({ ReplyIcon: () => null, ChatIcon: () => null, CloseIcon: () => null }));
vi.mock("../app/lib/api/client.js", () => ({ API_URL: "/api", fetchApi: (...args) => mocks.fetchApi(...args) }));

import CommentsSection from "../app/agency/[agencyId]/components/dashboard/tripPanel/CommentsSection.jsx";

const waiting = {
  id: "c-wait",
  authorName: "Maria Santos",
  content: "Is the ryokan wheelchair accessible?",
  status: "PENDING",
  dayNumber: 1,
  itemId: "i1",
  itemTitle: "Ryokan check-in",
  agencyReply: null,
  agencyRepliedAt: null,
  createdAt: "2026-10-20T08:00:00.000Z",
};
const answered = {
  ...waiting,
  id: "c-done",
  content: "Can we move dinner to 7pm?",
  dayNumber: 2,
  itemTitle: "Kaiseki dinner",
  status: "ADDRESSED",
  agencyReply: "Done, moved to 7pm.",
  agencyRepliedAt: "2026-10-20T09:00:00.000Z",
};

beforeEach(() => mocks.fetchApi.mockReset());

describe("CommentsSection", () => {
  it("lists waiting comments before answered ones, each with where it points", () => {
    render(<CommentsSection agencyId="a1" comments={[answered, waiting]} />);
    const section = screen.getByRole("region", { name: "Comments" });
    const cards = within(section).getAllByRole("article");
    expect(within(cards[0]).getByText("Is the ryokan wheelchair accessible?")).toBeInTheDocument();
    expect(within(cards[0]).getByText("Day 1 · Ryokan check-in")).toBeInTheDocument();
    expect(within(cards[1]).getByText("Done, moved to 7pm.")).toBeInTheDocument();
    expect(within(section).getByText("1 waiting")).toBeInTheDocument();
  });

  it("opens the reply box of the comment the panel was opened for", () => {
    render(<CommentsSection agencyId="a1" comments={[waiting]} focusCommentId="c-wait" />);
    expect(screen.getByPlaceholderText("Write a reply…")).toHaveFocus();
  });

  it("sends a reply and reports it", async () => {
    mocks.fetchApi.mockResolvedValue({ comment: { ...waiting, agencyReply: "Yes" } });
    const onReplySent = vi.fn();
    render(<CommentsSection agencyId="a1" comments={[waiting]} onReplySent={onReplySent} />);
    fireEvent.click(screen.getByRole("button", { name: "Reply" }));
    fireEvent.change(screen.getByPlaceholderText("Write a reply…"), { target: { value: "Yes, it is." } });
    fireEvent.click(screen.getByRole("button", { name: "Send Reply" }));
    await waitFor(() => expect(onReplySent).toHaveBeenCalledWith("c-wait", "Yes, it is."));
    expect(mocks.fetchApi).toHaveBeenCalledWith("/agencies/a1/shares/comments/c-wait/reply", expect.objectContaining({ method: "POST" }));
  });

  it("invites comments when there are none", () => {
    render(<CommentsSection agencyId="a1" comments={[]} />);
    expect(screen.getByText(/No comments yet/)).toBeInTheDocument();
  });

  // Keyboard flow: closing the reply box must not strand focus on <body>.
  it("returns focus to the Reply button when the box is cancelled or dismissed with Escape", () => {
    render(<CommentsSection agencyId="a1" comments={[waiting]} />);

    fireEvent.click(screen.getByRole("button", { name: "Reply" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Reply" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Reply" }));
    fireEvent.keyDown(screen.getByPlaceholderText("Write a reply…"), { key: "Escape" });
    expect(screen.getByRole("button", { name: "Reply" })).toHaveFocus();
  });
});
