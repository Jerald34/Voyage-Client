import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchApi: vi.fn() }));
vi.mock("../app/lib/api/client.js", () => ({ API_URL: "/api", fetchApi: (...args) => mocks.fetchApi(...args) }));

import SharedLinkSection from "../app/agency/[agencyId]/components/dashboard/tripPanel/SharedLinkSection.jsx";

const NOW = Date.parse("2026-10-20T12:00:00.000Z");
const share = {
  id: "share-1",
  viewCount: 4,
  lastViewedAt: "2026-10-20T10:00:00.000Z",
  expiresAt: "2026-10-21T08:00:00.000Z",
  revokedAt: null,
  proposalRating: 4,
};

// Braces matter: a hook that returns the mock makes vitest call it as cleanup, and a rejecting mock then
// fails the test with an unhandled rejection.
beforeEach(() => {
  mocks.fetchApi.mockReset();
});

describe("SharedLinkSection", () => {
  it("shows views, rating and expiry with both Extend choices", () => {
    render(<SharedLinkSection agencyId="a1" share={share} now={NOW} />);
    expect(screen.getByRole("region", { name: "Shared link" })).toBeInTheDocument();
    expect(screen.getByText("Viewed 4 times · last viewed 2h ago")).toBeInTheDocument();
    expect(screen.getByText("Rated 4 out of 5")).toBeInTheDocument();
    expect(screen.getByText("Expires in 20h")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Extend 7 days" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Extend 30 days" })).toBeInTheDocument();
  });

  it("extends the link and hands back the saved link", async () => {
    mocks.fetchApi.mockResolvedValue({ share: { ...share, expiresAt: "2026-10-28T08:00:00.000Z" } });
    const onExtended = vi.fn();
    render(<SharedLinkSection agencyId="a1" share={share} now={NOW} onExtended={onExtended} />);
    fireEvent.click(screen.getByRole("button", { name: "Extend 7 days" }));
    await waitFor(() => expect(onExtended).toHaveBeenCalledWith(expect.objectContaining({ expiresAt: "2026-10-28T08:00:00.000Z" })));
    expect(mocks.fetchApi).toHaveBeenCalledWith("/agencies/a1/shares/share-1/expiry", { method: "PATCH", body: JSON.stringify({ extendDays: 7 }) });
  });

  it("says so when extending fails", async () => {
    mocks.fetchApi.mockRejectedValue(new Error("nope"));
    render(<SharedLinkSection agencyId="a1" share={share} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: "Extend 30 days" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't extend the link. Try again.");
  });

  it("offers no Extend for a turned-off link or one that never expires", () => {
    const { rerender } = render(<SharedLinkSection agencyId="a1" share={{ ...share, revokedAt: "2026-10-19T00:00:00.000Z" }} now={NOW} />);
    expect(screen.getByText("Link turned off")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Extend/ })).not.toBeInTheDocument();
    rerender(<SharedLinkSection agencyId="a1" share={{ ...share, expiresAt: null }} now={NOW} />);
    expect(screen.getByText("Never expires")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Extend/ })).not.toBeInTheDocument();
  });

  it("says when the trip was never shared", () => {
    render(<SharedLinkSection agencyId="a1" share={null} now={NOW} />);
    expect(screen.getByText(/Not shared with the client yet/)).toBeInTheDocument();
  });

  // Polish beyond the plan's five tests.

  it("announces a successful extend in a polite live region", async () => {
    mocks.fetchApi.mockResolvedValue({ share: { ...share, expiresAt: "2026-10-28T08:00:00.000Z" } });
    render(<SharedLinkSection agencyId="a1" share={share} now={NOW} />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    fireEvent.click(screen.getByRole("button", { name: "Extend 7 days" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Link extended by 7 days."));
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the buttons focusable while saving and ignores a second click", async () => {
    let resolve;
    mocks.fetchApi.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<SharedLinkSection agencyId="a1" share={share} now={NOW} />);
    const sevenDays = screen.getByRole("button", { name: "Extend 7 days" });
    sevenDays.focus();
    fireEvent.click(sevenDays);
    const busy = await screen.findByRole("button", { name: "Extending…" });
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(busy).toHaveAttribute("aria-disabled", "true");
    expect(busy).not.toBeDisabled();
    expect(busy).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Extend 30 days" }));
    expect(mocks.fetchApi).toHaveBeenCalledTimes(1);
    resolve({ share });
    await waitFor(() => expect(screen.getByRole("button", { name: "Extend 7 days" })).not.toHaveAttribute("aria-busy"));
  });

  it("ties a failed extend to the buttons through aria-describedby", async () => {
    mocks.fetchApi.mockRejectedValue(new Error("nope"));
    render(<SharedLinkSection agencyId="a1" share={share} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: "Extend 7 days" }));
    const alert = await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Extend 7 days" })).toHaveAttribute("aria-describedby", alert.id);
    expect(screen.getByRole("button", { name: "Extend 30 days" })).toHaveAttribute("aria-describedby", alert.id);
  });

  it("explains a link that was turned off elsewhere and stops offering Extend", async () => {
    mocks.fetchApi.mockRejectedValue(Object.assign(new Error("x"), { status: 409, code: "SHARE_REVOKED" }));
    render(<SharedLinkSection agencyId="a1" share={share} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: "Extend 7 days" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This link was turned off. Share the itinerary again instead.");
    expect(screen.getByText("Link turned off")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Extend/ })).not.toBeInTheDocument();
  });

  it("explains a link that never expires and stops offering Extend", async () => {
    mocks.fetchApi.mockRejectedValue(Object.assign(new Error("x"), { status: 409, code: "SHARE_NEVER_EXPIRES" }));
    render(<SharedLinkSection agencyId="a1" share={share} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: "Extend 30 days" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This link never expires.");
    expect(screen.getByText("Never expires")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Extend/ })).not.toBeInTheDocument();
  });

  it("clears the old message when the next extend starts", async () => {
    mocks.fetchApi.mockRejectedValueOnce(new Error("nope")).mockResolvedValueOnce({ share });
    render(<SharedLinkSection agencyId="a1" share={share} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: "Extend 7 days" }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Extend 7 days" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Link extended by 7 days."));
  });
});
