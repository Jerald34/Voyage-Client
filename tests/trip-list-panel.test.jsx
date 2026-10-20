import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FunnelChart from "../app/agency/[agencyId]/components/dashboard/widgets/FunnelChart.jsx";
import TripListPanel from "../app/agency/[agencyId]/components/dashboard/widgets/TripListPanel.jsx";

const trips = [
  { tripId: "t1", tripTitle: "Kyoto Autumn Escape", clientName: "Maria Santos", status: "IN_REVIEW" },
  { tripId: "t2", tripTitle: "Baguio Weekend", clientName: null, status: "APPROVED_INTERNAL" },
];

describe("TripListPanel", () => {
  it("lists the trips and opens the one clicked", () => {
    const onOpenTrip = vi.fn();
    const onClose = vi.fn();
    render(<TripListPanel isOpen title="Shared with client" summary="2 trips" trips={trips} onOpenTrip={onOpenTrip} onClose={onClose} />);
    const dialog = screen.getByRole("dialog", { name: "Shared with client" });
    expect(within(dialog).getByText("2 trips")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /^Kyoto Autumn Escape/ }));
    expect(onOpenTrip).toHaveBeenCalledWith("t1", "Kyoto Autumn Escape", "Maria Santos");
    expect(onClose).toHaveBeenCalled();
  });

  it("says when a list is empty, and notes a cut-off list", () => {
    const { rerender } = render(<TripListPanel isOpen title="Drafts" trips={[]} onOpenTrip={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("No trips here right now.")).toBeInTheDocument();
    rerender(<TripListPanel isOpen title="Drafts" trips={trips} total={60} onOpenTrip={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Showing the latest 2 of 60.")).toBeInTheDocument();
  });

  it("closes on Escape and renders nothing while closed", () => {
    const onClose = vi.fn();
    const { rerender } = render(<TripListPanel isOpen title="Drafts" trips={trips} onOpenTrip={vi.fn()} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    rerender(<TripListPanel isOpen={false} title="Drafts" trips={trips} onOpenTrip={vi.fn()} onClose={onClose} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("FunnelChart stage lists", () => {
  it("opens a stage's trips, and each opens the trip panel", () => {
    const onOpenTrip = vi.fn();
    const stages = [
      { key: "created", count: 2, dropOffPct: null, trips },
      { key: "sent", count: 1, dropOffPct: 50, trips: [trips[0]] },
    ];
    render(<FunnelChart stages={stages} agencyId="a1" onOpenTrip={onOpenTrip} />);
    fireEvent.click(screen.getByRole("button", { name: "Shared with client: 1. Open trip list." }));
    const dialog = screen.getByRole("dialog", { name: "Shared with client" });
    fireEvent.click(within(dialog).getByRole("button", { name: /^Kyoto Autumn Escape/ }));
    expect(onOpenTrip).toHaveBeenCalledWith("t1", "Kyoto Autumn Escape", "Maria Santos");
  });
});

describe("TripListPanel dialog behaviour", () => {
  it("focuses Close on open and puts focus back on the opener when it closes", () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open list
          </button>
          <TripListPanel isOpen={open} title="Drafts" trips={trips} onOpenTrip={vi.fn()} onClose={() => setOpen(false)} />
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open list" });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("keeps Tab inside the panel, and pulls stray focus back in", () => {
    render(<TripListPanel isOpen title="Drafts" trips={trips} onOpenTrip={vi.fn()} onClose={vi.fn()} />);
    const close = screen.getByRole("button", { name: "Close" });
    const rows = screen.getAllByRole("button", { name: /Kyoto|Baguio/ });
    const lastRow = rows[rows.length - 1];

    lastRow.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(close).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(lastRow).toHaveFocus();

    document.body.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(close).toHaveFocus();
  });

  it("does not pull focus back to Close when the parent re-renders", () => {
    const { rerender } = render(<TripListPanel isOpen title="Drafts" trips={trips} onOpenTrip={vi.fn()} onClose={() => {}} />);
    const row = screen.getByRole("button", { name: /^Baguio Weekend/ });
    row.focus();
    rerender(<TripListPanel isOpen title="Drafts" trips={trips} onOpenTrip={vi.fn()} onClose={() => {}} />);
    expect(row).toHaveFocus();
  });

  it("closes when the scrim is clicked", () => {
    const onClose = vi.fn();
    render(<TripListPanel isOpen title="Drafts" trips={trips} onOpenTrip={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByRole("dialog").previousElementSibling);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("leaves out the cut-off note when no trips came with the count", () => {
    render(<TripListPanel isOpen title="Drafts" trips={[]} total={5} onOpenTrip={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("No trips here right now.")).toBeInTheDocument();
    expect(screen.queryByText(/Showing the latest/)).not.toBeInTheDocument();
  });

  it("names a trip with no client", () => {
    render(<TripListPanel isOpen title="Drafts" trips={trips} onOpenTrip={vi.fn()} onClose={vi.fn()} />);
    expect(within(screen.getByRole("button", { name: /^Baguio Weekend/ })).getByText("No client name")).toBeInTheDocument();
  });
});
