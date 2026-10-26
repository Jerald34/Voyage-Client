import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AgentPausedModal from "../app/components/trip-dashboard/command-center/AgentPausedModal.jsx";

describe("AgentPausedModal", () => {
  it("says the agent is paused, until when, why, and what still works", () => {
    const onClose = vi.fn();
    render(<AgentPausedModal open pause={{ pausedAt: "p", until: null, reason: "Unusually high usage" }} onClose={onClose} />);

    expect(screen.getByRole("dialog", { name: "The agent is paused for your account" })).toBeInTheDocument();
    expect(screen.getByText(/until an administrator lifts it/)).toBeInTheDocument();
    expect(screen.getByText("Unusually high usage")).toBeInTheDocument();
    expect(screen.getByText(/still view and edit itineraries and trips by hand/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("gives the end time for a timed pause", () => {
    const until = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    render(<AgentPausedModal open pause={{ pausedAt: "p", until, reason: "Cooling off" }} onClose={vi.fn()} />);

    expect(screen.getByText(/paused your access to the agent until .+ \(in 3 hours\)/)).toBeInTheDocument();
  });

  it("leaves out the reason block when the admin gave none", () => {
    render(<AgentPausedModal open pause={{ pausedAt: "p", until: null, reason: "" }} onClose={vi.fn()} />);

    expect(screen.queryByText("Reason")).not.toBeInTheDocument();
  });

  it("renders nothing without a pause", () => {
    const { container } = render(<AgentPausedModal open pause={null} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing while closed", () => {
    render(<AgentPausedModal open={false} pause={{ pausedAt: "p", until: null, reason: "x" }} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
