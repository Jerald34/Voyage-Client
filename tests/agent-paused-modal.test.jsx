import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AgentPausedModal from "../app/components/trip-dashboard/command-center/AgentPausedModal.jsx";

describe("AgentPausedModal", () => {
  it("says the agent is paused, until when, why, and what still works", () => {
    const onClose = vi.fn();
    render(<AgentPausedModal open pause={{ pausedAt: "p", until: null, reason: "Unusually high usage" }} onClose={onClose} />);

    expect(screen.getByRole("dialog", { name: "The agent is paused for your account" })).toBeInTheDocument();
    expect(screen.getByText("An administrator has paused your access to the agent. It stays paused until they lift it.")).toBeInTheDocument();
    expect(screen.getByText("Unusually high usage")).toBeInTheDocument();
    expect(screen.getByText(/still view and edit itineraries and trips by hand/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("gives the end time for a timed pause", () => {
    const until = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    render(<AgentPausedModal open pause={{ pausedAt: "p", until, reason: "Cooling off" }} onClose={vi.fn()} />);

    expect(screen.getByText(/paused your access to the agent until .+ \(in 3 hours\)\./)).toBeInTheDocument();
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

  describe("Check again", () => {
    const pause = { pausedAt: "p", until: null, reason: "x" };

    it("is offered only when the page can ask the server", () => {
      const { rerender } = render(<AgentPausedModal open pause={pause} onClose={vi.fn()} />);
      expect(screen.queryByRole("button", { name: "Check again" })).not.toBeInTheDocument();
      rerender(<AgentPausedModal open pause={pause} onClose={vi.fn()} onRecheck={vi.fn()} />);
      expect(screen.getByRole("button", { name: "Check again" })).toBeInTheDocument();
    });

    it("asks the server, says so while it waits, then says the pause is still on", async () => {
      let answer;
      const onRecheck = vi.fn(() => new Promise((resolve) => (answer = resolve)));
      render(<AgentPausedModal open pause={pause} onClose={vi.fn()} onRecheck={onRecheck} />);

      fireEvent.click(screen.getByRole("button", { name: "Check again" }));
      expect(onRecheck).toHaveBeenCalledTimes(1);
      const busy = screen.getByRole("button", { name: "Checking…" });
      expect(busy).toHaveAttribute("aria-disabled", "true");
      // A second click while it waits asks nothing more, and the button keeps focus.
      fireEvent.click(busy);
      expect(onRecheck).toHaveBeenCalledTimes(1);

      answer(true);
      expect(await screen.findByText("Still paused. Checked just now.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Check again" })).not.toHaveAttribute("aria-disabled", "true");
    });

    it("says so when the server could not be asked", async () => {
      render(<AgentPausedModal open pause={pause} onClose={vi.fn()} onRecheck={vi.fn().mockResolvedValue(false)} />);
      fireEvent.click(screen.getByRole("button", { name: "Check again" }));
      expect(await screen.findByText("Couldn't check right now. Try again in a moment.")).toBeInTheDocument();
    });

    it("starts without a note the next time it opens", async () => {
      const { rerender } = render(<AgentPausedModal open pause={pause} onClose={vi.fn()} onRecheck={vi.fn().mockResolvedValue(true)} />);
      fireEvent.click(screen.getByRole("button", { name: "Check again" }));
      await screen.findByText("Still paused. Checked just now.");
      rerender(<AgentPausedModal open={false} pause={pause} onClose={vi.fn()} onRecheck={vi.fn().mockResolvedValue(true)} />);
      rerender(<AgentPausedModal open pause={pause} onClose={vi.fn()} onRecheck={vi.fn().mockResolvedValue(true)} />);
      await waitFor(() => expect(screen.queryByText("Still paused. Checked just now.")).not.toBeInTheDocument());
    });
  });
});
