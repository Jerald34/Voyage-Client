import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchApi: vi.fn() }));

vi.mock("../app/components/icons/index.js", () => ({
  ChatIcon: () => null,
  CloseIcon: () => null,
  ReplyIcon: () => null,
}));

vi.mock("../app/lib/api/client.js", () => ({
  API_URL: "/api",
  fetchApi: (...args) => mocks.fetchApi(...args),
}));

import TripSlideOver from "../app/agency/[agencyId]/components/dashboard/TripSlideOver.jsx";

const comment = (shareId) => ({
  id: `c-${shareId}`,
  content: `Comment on ${shareId}`,
  status: "PENDING",
  authorName: "Ana",
  createdAt: "2026-10-02T02:00:00.000Z",
});

/** Two shares. `failing` lists share ids whose comment request rejects; `sharesFail` rejects the share list. */
function serve({ failing = [], sharesFail = false } = {}) {
  mocks.fetchApi.mockImplementation((path) => {
    const match = /\/shares\/([^/]+)\/comments$/.exec(String(path));
    if (match) {
      if (failing.includes(match[1])) return Promise.reject(new Error("Request validation failed."));
      return Promise.resolve({ comments: [comment(match[1])] });
    }
    if (sharesFail) return Promise.reject(new Error("Request validation failed."));
    return Promise.resolve({ shares: [{ id: "s-1" }, { id: "s-2" }] });
  });
}

function renderPanel() {
  return render(<TripSlideOver isOpen onClose={() => {}} agencyId="agency-1" tripId="t-1" tripTitle="Kyoto" />);
}

/** A promise the test settles by hand. */
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Lets every pending request and state update land. */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

/** Each trip's share-list request is the promise the test hands in; share comments answer at once. */
function serveByTrip(sharesByTrip) {
  mocks.fetchApi.mockImplementation((path) => {
    const comments = /\/shares\/([^/?]+)\/comments$/.exec(String(path));
    if (comments) return Promise.resolve({ comments: [comment(comments[1])] });
    const trip = /\/shares\?tripId=([^&]+)/.exec(String(path));
    return sharesByTrip[decodeURIComponent(trip[1])].promise;
  });
}

function Panel(props) {
  return <TripSlideOver isOpen onClose={() => {}} agencyId="agency-1" tripId="t-1" tripTitle="Kyoto" {...props} />;
}

beforeEach(() => {
  mocks.fetchApi.mockReset();
});

describe("TripSlideOver comment loading", () => {
  it("shows every share's comments when all requests succeed", async () => {
    serve();
    renderPanel();
    expect(await screen.findByText("Comment on s-1")).toBeInTheDocument();
    expect(screen.getByText("Comment on s-2")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("reports an error with Retry, not an empty inbox, when every comment request fails", async () => {
    serve({ failing: ["s-1", "s-2"] });
    renderPanel();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load comments.");
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByText("No comments yet")).not.toBeInTheDocument();
  });

  it("keeps what loaded and says some comments are missing when only some requests fail", async () => {
    serve({ failing: ["s-2"] });
    renderPanel();
    expect(await screen.findByText("Comment on s-1")).toBeInTheDocument();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Some comments couldn't load.");
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByText("No comments yet")).not.toBeInTheDocument();
  });

  it("reports an error when the share list itself fails", async () => {
    serve({ sharesFail: true });
    renderPanel();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load comments.");
  });

  it("loads again when Retry is pressed", async () => {
    serve({ failing: ["s-1", "s-2"] });
    renderPanel();
    const alert = await screen.findByRole("alert");

    serve();
    fireEvent.click(within(alert).getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Comment on s-1")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});

describe("TripSlideOver out-of-date responses", () => {
  it("keeps the open trip's comments when an earlier trip's response arrives late", async () => {
    const a = deferred();
    const b = deferred();
    serveByTrip({ "t-A": a, "t-B": b });
    const { rerender } = render(<Panel tripId="t-A" tripTitle="Trip A" />);

    rerender(<Panel tripId="t-B" tripTitle="Trip B" />);
    await act(async () => b.resolve({ shares: [{ id: "s-B" }] }));
    expect(await screen.findByText("Comment on s-B")).toBeInTheDocument();

    await act(async () => a.resolve({ shares: [{ id: "s-A" }] }));
    await settle();

    expect(screen.getByText("Comment on s-B")).toBeInTheDocument();
    expect(screen.queryByText("Comment on s-A")).not.toBeInTheDocument();
    expect(screen.queryByText("Loading comments…")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the spinner up for the open trip when an earlier trip's response lands first", async () => {
    const a = deferred();
    const b = deferred();
    serveByTrip({ "t-A": a, "t-B": b });
    const { rerender } = render(<Panel tripId="t-A" tripTitle="Trip A" />);

    rerender(<Panel tripId="t-B" tripTitle="Trip B" />);
    await act(async () => a.resolve({ shares: [{ id: "s-A" }] }));
    await settle();

    // Trip B is still loading: A's answer must neither show nor end the wait.
    expect(screen.getByText("Loading comments…")).toBeInTheDocument();
    expect(screen.queryByText("Comment on s-A")).not.toBeInTheDocument();

    await act(async () => b.resolve({ shares: [{ id: "s-B" }] }));
    expect(await screen.findByText("Comment on s-B")).toBeInTheDocument();
    expect(screen.queryByText("Loading comments…")).not.toBeInTheDocument();
  });

  it("does not report an earlier trip's late failure against the open trip", async () => {
    const a = deferred();
    const b = deferred();
    serveByTrip({ "t-A": a, "t-B": b });
    const { rerender } = render(<Panel tripId="t-A" tripTitle="Trip A" />);

    rerender(<Panel tripId="t-B" tripTitle="Trip B" />);
    await act(async () => b.resolve({ shares: [{ id: "s-B" }] }));
    expect(await screen.findByText("Comment on s-B")).toBeInTheDocument();

    await act(async () => a.reject(new Error("Request validation failed.")));
    await settle();

    expect(screen.getByText("Comment on s-B")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("drops a response that arrives after the panel closed, and loads cleanly on reopening", async () => {
    const a = deferred();
    serveByTrip({ "t-A": a });
    const { rerender } = render(<Panel tripId="t-A" />);

    rerender(<Panel tripId="t-A" isOpen={false} />);
    await act(async () => a.resolve({ shares: [{ id: "s-A" }] }));
    await settle();
    expect(screen.queryByText("Comment on s-A")).not.toBeInTheDocument();

    rerender(<Panel tripId="t-A" />);
    expect(await screen.findByText("Comment on s-A")).toBeInTheDocument();
    expect(screen.queryByText("Loading comments…")).not.toBeInTheDocument();
  });
});

describe("TripSlideOver focus when Retry is pressed", () => {
  it.each([
    ["every request fails", { failing: ["s-1", "s-2"] }, "Couldn't load comments."],
    ["only some requests fail", { failing: ["s-2"] }, "Some comments couldn't load."],
  ])("keeps focus inside the dialog when %s", async (_, options, message) => {
    serve(options);
    renderPanel();
    const alert = await screen.findByRole("alert");
    const retry = within(alert).getByRole("button", { name: "Retry" });
    retry.focus();
    expect(retry).toHaveFocus();

    fireEvent.click(retry);

    // Retry and its alert are gone while the request runs; focus must not have gone with them.
    expect(retry).not.toBeInTheDocument();
    expect(document.activeElement).not.toBe(document.body);
    expect(screen.getByRole("dialog")).toContainElement(document.activeElement);

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(document.activeElement).not.toBe(document.body);
    expect(screen.getByRole("dialog")).toContainElement(document.activeElement);
  });

  it("leaves Tab to the browser from wherever Retry sent focus", async () => {
    serve({ failing: ["s-1", "s-2"] });
    renderPanel();
    const retry = within(await screen.findByRole("alert")).getByRole("button", { name: "Retry" });
    retry.focus();
    fireEvent.click(retry);
    await screen.findByRole("alert");

    const home = document.activeElement;
    expect(screen.getByRole("dialog")).toContainElement(home);

    // Close and Retry/footer sit either side of it, so neither direction needs the wrap-around.
    expect(fireEvent.keyDown(home, { key: "Tab" })).toBe(true);
    expect(fireEvent.keyDown(home, { key: "Tab", shiftKey: true })).toBe(true);
    expect(home).toHaveFocus();
  });
});

describe("TripSlideOver replies", () => {
  async function sendReply(card, text) {
    fireEvent.click(within(card).getByRole("button", { name: "Reply" }));
    fireEvent.change(within(card).getByPlaceholderText("Write a reply…"), { target: { value: text } });
    fireEvent.click(within(card).getByRole("button", { name: "Send Reply" }));
  }

  it("tells the dashboard once a reply is saved, so it can refresh", async () => {
    serve();
    const onReplied = vi.fn();
    render(<Panel onReplied={onReplied} />);

    const card = (await screen.findByText("Comment on s-1")).closest(".dashboard-card");
    await sendReply(card, "Yes, we can swap it.");

    await waitFor(() => expect(onReplied).toHaveBeenCalledWith("c-s-1"));
    expect(mocks.fetchApi).toHaveBeenCalledWith(
      "/agencies/agency-1/shares/comments/c-s-1/reply",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("says nothing when the reply fails", async () => {
    serve();
    const serveRest = mocks.fetchApi.getMockImplementation();
    mocks.fetchApi.mockImplementation((path, options) =>
      String(path).endsWith("/reply") ? Promise.reject(new Error("offline")) : serveRest(path, options),
    );
    const onReplied = vi.fn();
    render(<Panel onReplied={onReplied} />);

    const card = (await screen.findByText("Comment on s-1")).closest(".dashboard-card");
    await sendReply(card, "Yes");

    expect(await within(card).findByText("Failed to send reply. Please try again.")).toBeInTheDocument();
    expect(onReplied).not.toHaveBeenCalled();
  });

  it("does not call a saved reply failed when the dashboard's handler throws", async () => {
    serve();
    const broken = new Error("dashboard handler broke");
    const onReplied = vi.fn(() => {
      throw broken;
    });
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Panel onReplied={onReplied} />);

    const card = (await screen.findByText("Comment on s-1")).closest(".dashboard-card");
    await sendReply(card, "Yes, we can swap it.");

    await waitFor(() => expect(onReplied).toHaveBeenCalledWith("c-s-1"));
    // The reply is saved and shown as saved.
    expect(await screen.findByText("Your reply")).toBeInTheDocument();
    expect(screen.getByText("Yes, we can swap it.")).toBeInTheDocument();
    expect(screen.queryByText("Failed to send reply. Please try again.")).not.toBeInTheDocument();
    // The handler's bug is reported, not swallowed as if the send had failed.
    expect(logged).toHaveBeenCalledWith(expect.any(String), broken);
    logged.mockRestore();
  });
});
