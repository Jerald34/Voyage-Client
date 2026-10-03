import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
