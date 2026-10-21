import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import MyWorkColumn from "../app/agency/[agencyId]/components/dashboard/widgets/MyWorkColumn.jsx";

const row = (tripId, tripTitle) => ({ tripId, tripTitle, clientName: "Ana", status: "DRAFT" });
const pipeline = { drafts: 2, inReview: 0, approvedThisMonth: 0, activeNow: 0 };
const pipelineTrips = { drafts: [row("d1", "Batanes"), row("d2", "Siargao")], inReview: [], approvedThisMonth: [], activeNow: [] };

describe("staff counters", () => {
  it("list the trips behind a counter, and open the one clicked in the trip panel", () => {
    const onOpenViewedTrip = vi.fn();
    render(
      <MyWorkColumn hero={null} pipeline={pipeline} pipelineTrips={pipelineTrips} agencyId="a1" onOpenTrip={vi.fn()} onOpenViewedTrip={onOpenViewedTrip} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Drafts/ }));
    const dialog = screen.getByRole("dialog", { name: "Your drafts" });
    fireEvent.click(within(dialog).getByRole("button", { name: /^Siargao/ }));
    expect(onOpenViewedTrip).toHaveBeenCalledWith("d2", "Siargao", "Ana");
  });

  it("are plain numbers for a server that doesn't send the lists", () => {
    render(<MyWorkColumn hero={null} pipeline={pipeline} agencyId="a1" onOpenTrip={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Drafts/ })).not.toBeInTheDocument();
    expect(screen.getByText("Drafts")).toBeInTheDocument();
  });

  it("are buttons whose name carries the count and that announce they open a dialog", () => {
    render(<MyWorkColumn hero={null} pipeline={pipeline} pipelineTrips={pipelineTrips} onOpenTrip={vi.fn()} />);
    const drafts = screen.getByRole("button", { name: /Drafts/ });
    expect(drafts).toHaveAccessibleName(/2/);
    expect(drafts).toHaveAttribute("aria-haspopup", "dialog");
    expect(drafts).toHaveClass("pointer-coarse:min-h-11");
  });

  it("close the list and hand focus back to the counter, even where a click doesn't focus a button", () => {
    render(<MyWorkColumn hero={null} pipeline={pipeline} pipelineTrips={pipelineTrips} onOpenTrip={vi.fn()} onOpenViewedTrip={vi.fn()} />);
    const drafts = screen.getByRole("button", { name: /Drafts/ });
    // fireEvent.click does not focus the button, the way a click in Safari doesn't.
    fireEvent.click(drafts);
    fireEvent.click(within(screen.getByRole("dialog", { name: "Your drafts" })).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(drafts).toHaveFocus();
  });

  it("close the list when a trip is opened from it", () => {
    render(<MyWorkColumn hero={null} pipeline={pipeline} pipelineTrips={pipelineTrips} onOpenTrip={vi.fn()} onOpenViewedTrip={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Drafts/ }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^Batanes/ }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("say when the list is cut short of the counter's number", () => {
    render(<MyWorkColumn hero={null} pipeline={{ ...pipeline, drafts: 60 }} pipelineTrips={pipelineTrips} onOpenTrip={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Drafts/ }));
    expect(within(screen.getByRole("dialog")).getByText("Showing the latest 2 of 60.")).toBeInTheDocument();
  });
});
