import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EmptyState from "../app/agency/[agencyId]/components/dashboard/widgets/EmptyState.jsx";

describe("EmptyState", () => {
  it("renders worklist variant copy", () => {
    render(<EmptyState variant="worklist" />);
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });

  it("renders kpi variant copy", () => {
    render(<EmptyState variant="kpi" />);
    expect(screen.getByText(/no closed trips/i)).toBeInTheDocument();
  });

  it("renders funnel variant copy", () => {
    render(<EmptyState variant="funnel" />);
    expect(screen.getByText(/funnel/i)).toBeInTheDocument();
  });

  it("renders ratings variant copy", () => {
    render(<EmptyState variant="ratings" />);
    expect(screen.getByText(/reviews appear after trips complete/i)).toBeInTheDocument();
  });

  it("renders staff-hero variant copy", () => {
    render(<EmptyState variant="staff-hero" />);
    expect(screen.getByText(/ready when you are/i)).toBeInTheDocument();
  });

  it("renders activity variant copy", () => {
    render(<EmptyState variant="activity" />);
    expect(screen.getByText(/activity/i)).toBeInTheDocument();
  });

  it("renders the CTA on funnel variant when onAction is provided", () => {
    const onAction = vi.fn();
    render(<EmptyState variant="funnel" onAction={onAction} />);
    const cta = screen.getByRole("button", { name: /new trip/i });
    fireEvent.click(cta);
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("does NOT render a CTA when onAction is not provided", () => {
    render(<EmptyState variant="funnel" />);
    // No button at all
    expect(screen.queryByRole("button")).toBeNull();
  });
});
