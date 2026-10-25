import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchApi: vi.fn() }));

vi.mock("../app/components/icons/index.js", () => ({ ChatIcon: () => null, CloseIcon: () => null, ReplyIcon: () => null }));
vi.mock("../app/lib/api/client.js", () => ({ API_URL: "/api", fetchApi: (...args) => mocks.fetchApi(...args) }));

import TripSlideOver from "../app/agency/[agencyId]/components/dashboard/TripSlideOver.jsx";

const comment = (id, fields = {}) => ({
  id,
  shareId: "s-1",
  authorName: "Ana",
  content: `Comment ${id}`,
  status: "PENDING",
  dayNumber: 1,
  itemId: null,
  itemTitle: null,
  agencyReply: null,
  agencyRepliedAt: null,
  createdAt: "2026-10-02T02:00:00.000Z",
  ...fields,
});

const preview = (fields = {}) => ({
  trip: {
    id: "t-1",
    title: "Kyoto Autumn Escape",
    status: "IN_REVIEW",
    clientName: "Maria Santos",
    startDate: null,
    endDate: null,
    travelerCount: 4,
    destinationSummary: "Kyoto",
  },
  share: { id: "s-1", clientName: null, viewCount: 4, lastViewedAt: null, expiresAt: null, revokedAt: null, proposalRating: null, createdAt: "2026-10-01T00:00:00.000Z" },
  comments: [comment("c-1")],
  ...fields,
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

function Panel(props) {
  return <TripSlideOver isOpen onClose={() => {}} agencyId="agency-1" tripId="t-1" tripTitle="Kyoto" {...props} />;
}

// Braces: a returned mock would be called as a cleanup.
beforeEach(() => {
  mocks.fetchApi.mockReset();
});

describe("TripSlideOver trip panel", () => {
  it("shows the trip, its link and its comments from one request", async () => {
    mocks.fetchApi.mockResolvedValue(preview());
    render(<Panel />);
    const panel = screen.getByRole("dialog", { name: /^Trip:/ });
    expect(await within(panel).findByText("Comment c-1")).toBeInTheDocument();
    expect(within(panel).getByRole("heading", { name: "Kyoto Autumn Escape" })).toBeInTheDocument();
    expect(within(panel).getByText("Maria Santos · 4 travelers")).toBeInTheDocument();
    expect(within(panel).getByText("In review")).toBeInTheDocument();
    expect(within(panel).getByRole("region", { name: "Shared link" })).toBeInTheDocument();
    expect(mocks.fetchApi).toHaveBeenCalledTimes(1);
    expect(mocks.fetchApi).toHaveBeenCalledWith("/agencies/agency-1/dashboard/trips/t-1");
  });

  it("reports a failure with Retry, and loads again", async () => {
    mocks.fetchApi.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce(preview());
    render(<Panel />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load this trip.");
    fireEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Comment c-1")).toBeInTheDocument();
  });

  it("keeps the open trip when an earlier trip's answer lands late", async () => {
    const first = deferred();
    const second = deferred();
    mocks.fetchApi.mockImplementation((path) => (String(path).endsWith("/t-1") ? first.promise : second.promise));
    const { rerender } = render(<Panel tripId="t-1" />);
    rerender(<Panel tripId="t-2" />);
    await act(async () => second.resolve(preview({ comments: [comment("c-2")] })));
    await act(async () => first.resolve(preview({ comments: [comment("c-1")] })));
    expect(screen.getByText("Comment c-2")).toBeInTheDocument();
    expect(screen.queryByText("Comment c-1")).not.toBeInTheDocument();
  });

  it("opens at the comment it was opened for, with its reply box ready", async () => {
    mocks.fetchApi.mockResolvedValue(preview({ comments: [comment("c-1"), comment("c-2")] }));
    render(<Panel focus={{ type: "comment", id: "c-2" }} />);
    const box = await screen.findByPlaceholderText("Write a reply…");
    expect(box).toHaveFocus();
    expect(box.closest("[data-comment-id]")).toHaveAttribute("data-comment-id", "c-2");
  });

  it("opens the reply box again when reopened for the same trip's comment", async () => {
    mocks.fetchApi.mockResolvedValue(preview({ comments: [comment("c-1"), comment("c-2")] }));
    const { rerender } = render(<Panel isOpen={false} />);
    rerender(<Panel />);
    await screen.findByText("Comment c-2");
    rerender(<Panel isOpen={false} />);
    // The trip is still loaded from the last visit, so its comments are already on the page.
    rerender(<Panel focus={{ type: "comment", id: "c-2" }} />);
    const box = screen.getByPlaceholderText("Write a reply…");
    expect(box.closest("[data-comment-id]")).toHaveAttribute("data-comment-id", "c-2");
    expect(box).toHaveFocus();
    await settle();
  });
});

describe("TripSlideOver changes", () => {
  it("tells the dashboard once a reply is saved", async () => {
    mocks.fetchApi.mockImplementation((path) =>
      String(path).endsWith("/reply") ? Promise.resolve({ comment: {} }) : Promise.resolve(preview()),
    );
    const onChanged = vi.fn();
    render(<Panel onChanged={onChanged} />);
    fireEvent.click(await screen.findByRole("button", { name: "Reply" }));
    fireEvent.change(screen.getByPlaceholderText("Write a reply…"), { target: { value: "Yes" } });
    fireEvent.click(screen.getByRole("button", { name: "Send Reply" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Yes")).toBeInTheDocument();
  });

  it("announces a sent reply and keeps focus inside the panel", async () => {
    mocks.fetchApi.mockImplementation((path) =>
      String(path).endsWith("/reply") ? Promise.resolve({ comment: {} }) : Promise.resolve(preview()),
    );
    render(<Panel />);
    fireEvent.click(await screen.findByRole("button", { name: "Reply" }));
    fireEvent.change(screen.getByPlaceholderText("Write a reply…"), { target: { value: "Yes" } });
    const send = screen.getByRole("button", { name: "Send Reply" });
    send.focus();
    fireEvent.click(send);
    // Wait for the notice first: until the box closes, its own text also reads "Yes".
    const notice = await screen.findByText("Reply sent to Ana.");
    expect(screen.getByText("Yes", { selector: "p" })).toBeInTheDocument();
    expect(notice).toHaveAttribute("role", "status");
    expect(notice).toHaveAttribute("aria-live", "polite");
    const card = screen.getByText("Comment c-1").closest("[data-comment-id]");
    expect(card).toHaveFocus();
    expect(screen.getByRole("dialog")).toContainElement(document.activeElement);
  });

  it("says nothing when the reply fails", async () => {
    mocks.fetchApi.mockImplementation((path) =>
      String(path).endsWith("/reply") ? Promise.reject(new Error("no")) : Promise.resolve(preview()),
    );
    const onChanged = vi.fn();
    render(<Panel onChanged={onChanged} />);
    fireEvent.click(await screen.findByRole("button", { name: "Reply" }));
    fireEvent.change(screen.getByPlaceholderText("Write a reply…"), { target: { value: "Yes" } });
    fireEvent.click(screen.getByRole("button", { name: "Send Reply" }));
    expect(await screen.findByText("Failed to send reply. Please try again.")).toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("does not call a saved reply failed when the dashboard's handler throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.fetchApi.mockImplementation((path) =>
      String(path).endsWith("/reply") ? Promise.resolve({ comment: {} }) : Promise.resolve(preview()),
    );
    render(<Panel onChanged={() => { throw new Error("boom"); }} />);
    fireEvent.click(await screen.findByRole("button", { name: "Reply" }));
    fireEvent.change(screen.getByPlaceholderText("Write a reply…"), { target: { value: "Yes" } });
    fireEvent.click(screen.getByRole("button", { name: "Send Reply" }));
    await settle();
    expect(screen.queryByText("Failed to send reply. Please try again.")).not.toBeInTheDocument();
  });

  it("updates the expiry and tells the dashboard after Extend", async () => {
    const live = { ...preview().share, expiresAt: "2026-10-03T00:00:00.000Z" };
    mocks.fetchApi.mockImplementation((path) =>
      String(path).endsWith("/expiry")
        ? Promise.resolve({ share: { ...live, expiresAt: "2099-01-01T12:00:00.000Z" } })
        : Promise.resolve(preview({ share: live })),
    );
    const onChanged = vi.fn();
    render(<Panel onChanged={onChanged} />);
    fireEvent.click(await screen.findByRole("button", { name: "Extend 30 days" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Expires Jan 1, 2099")).toBeInTheDocument();
  });
});
