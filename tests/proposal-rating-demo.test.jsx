import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ProposalRating from "../app/itinerary/view/[token]/components/ProposalRating.jsx";

afterEach(() => vi.restoreAllMocks());

describe("ProposalRating demo mode", () => {
  it("saves the rating locally and never calls the API", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<ProposalRating token="sample" demo />);

    fireEvent.click(screen.getByRole("button", { name: "4 stars" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit rating" }));

    expect(await screen.findByLabelText("4 out of 5 stars")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
