import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ProposalRating from "../app/itinerary/view/[token]/components/ProposalRating.jsx";

afterEach(() => vi.restoreAllMocks());

describe("ProposalRating demo mode", () => {
  it("saves the rating locally and never calls the API", async () => {
    // Rejecting keeps the spy hermetic: a regression would fail here, not reach a real network.
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    render(<ProposalRating token="sample" demo />);

    fireEvent.click(screen.getByRole("button", { name: "4 stars" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit rating" }));

    expect(await screen.findByLabelText("4 out of 5 stars")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("ProposalRating on the share page (not demo)", () => {
  it("posts the rating and comment to the share's rate endpoint, then shows the stars", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ rating: 4, comment: "Lovely", ratedAt: "2026-10-10T00:00:00.000Z" }),
    });
    render(<ProposalRating token="sample" />);

    fireEvent.click(screen.getByRole("button", { name: "4 stars" }));
    fireEvent.change(screen.getByLabelText("Optional comment"), { target: { value: "Lovely" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit rating" }));

    expect(await screen.findByLabelText("4 out of 5 stars")).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url.endsWith("/shared/sample/rate")).toBe(true);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ rating: 4, comment: "Lovely" });
  });

  it("tells the client the rating period is closed when the server says so (409)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: { code: "RATING_PERIOD_CLOSED", message: "closed" } }),
    });
    render(<ProposalRating token="sample" />);

    fireEvent.click(screen.getByRole("button", { name: "5 stars" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit rating" }));

    // The same text is also announced in the sr-only live region, so target the visible paragraph.
    expect(await screen.findByText("Rating period closed — thanks anyway!", { selector: "p" })).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Submit rating" })).not.toBeInTheDocument();
  });
});
