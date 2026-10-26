import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// The dialogs have their own tests; here they are stubs that expose the props the button wires up.
vi.mock("../app/components/admin/PauseAgentDialog.jsx", () => ({
  default: ({ open, account, onClose, onDone, onStale }) =>
    open ? (
      <div role="dialog" aria-label="pause">
        <span>{`pause ${account.id} as ${account.displayName}`}</span>
        <button type="button" onClick={onClose}>
          stub close
        </button>
        <button type="button" onClick={onStale}>
          stub stale
        </button>
        <button
          type="button"
          onClick={() => onDone({ id: account.id, agentPause: { pausedAt: "2026-10-26T00:00:00.000Z", until: null, reason: "Just now" } })}
        >
          stub finish pause
        </button>
        <button type="button" onClick={() => onDone(null)}>
          stub finish pause without account
        </button>
      </div>
    ) : null,
}));
vi.mock("../app/components/admin/AccountActionDialog.jsx", () => ({
  default: ({ open, action, account, onDone }) =>
    open ? (
      <div role="dialog" aria-label={`action ${action}`}>
        <span>{`${action} ${account.id}`}</span>
        <button type="button" onClick={() => onDone({ id: account.id, agentPause: null })}>
          stub finish action
        </button>
      </div>
    ) : null,
}));

import UsagePauseButton from "../app/components/admin/UsagePauseButton.jsx";

const row = (over = {}) => ({ id: "u2", label: "Ana Reyes", drillable: true, roleTag: "STAFF", agentPause: null, ...over });
const PAUSE = { pausedAt: "2026-10-25T01:00:00.000Z", until: null, reason: "Abuse" };

describe("UsagePauseButton", () => {
  it("offers Pause agent, which opens the pause dialog for the row's person", () => {
    render(<UsagePauseButton row={row()} onChanged={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pause agent" }));
    expect(screen.getByRole("dialog", { name: "pause" })).toBeInTheDocument();
    expect(screen.getByText("pause u2 as Ana Reyes")).toBeInTheDocument();
  });

  it("offers Resume agent for a paused person, with the pause noted above it", () => {
    render(<UsagePauseButton row={row({ agentPause: PAUSE })} onChanged={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Pause agent" })).not.toBeInTheDocument();
    expect(screen.getByText("Agent paused")).toBeInTheDocument();
    expect(screen.getByText("Abuse")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resume agent" }));
    expect(screen.getByRole("dialog", { name: "action resume-agent" })).toBeInTheDocument();
    expect(screen.getByText("resume-agent u2")).toBeInTheDocument();
  });

  it("treats a pause that has already ended as no pause", () => {
    const over = { pausedAt: "2026-01-01T00:00:00.000Z", until: "2026-01-02T00:00:00.000Z", reason: "Old" };
    render(<UsagePauseButton row={row({ agentPause: over })} onChanged={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Pause agent" })).toBeInTheDocument();
    expect(screen.queryByText("Old")).not.toBeInTheDocument();
  });

  it("closes the dialog and reloads the usage after a pause, and flips to Resume at once", () => {
    const onChanged = vi.fn();
    render(<UsagePauseButton row={row()} onChanged={onChanged} />);
    fireEvent.click(screen.getByRole("button", { name: "Pause agent" }));
    fireEvent.click(screen.getByRole("button", { name: "stub finish pause" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledTimes(1);
    // The reload is still in flight, but the button already reflects the answer.
    expect(screen.getByRole("button", { name: "Resume agent" })).toBeInTheDocument();
    expect(screen.getByText("Just now")).toBeInTheDocument();
  });

  it("flips back to Pause agent at once after a resume", () => {
    const onChanged = vi.fn();
    render(<UsagePauseButton row={row({ agentPause: PAUSE })} onChanged={onChanged} />);
    fireEvent.click(screen.getByRole("button", { name: "Resume agent" }));
    fireEvent.click(screen.getByRole("button", { name: "stub finish action" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Pause agent" })).toBeInTheDocument();
  });

  it("goes by the reloaded row once it arrives, after a pause", () => {
    const { rerender } = render(<UsagePauseButton row={row()} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Pause agent" }));
    fireEvent.click(screen.getByRole("button", { name: "stub finish pause" }));
    expect(screen.getByText("Just now")).toBeInTheDocument();

    rerender(<UsagePauseButton row={row({ agentPause: { ...PAUSE, reason: "Server copy" } })} onChanged={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Resume agent" })).toBeInTheDocument();
    expect(screen.getByText("Server copy")).toBeInTheDocument();
    expect(screen.queryByText("Just now")).not.toBeInTheDocument();
  });

  it("goes by the reloaded row once it arrives, after a resume", () => {
    const { rerender } = render(<UsagePauseButton row={row({ agentPause: PAUSE })} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Resume agent" }));
    fireEvent.click(screen.getByRole("button", { name: "stub finish action" }));
    expect(screen.getByRole("button", { name: "Pause agent" })).toBeInTheDocument();

    // The reload says the same thing, and then something else (re-paused from another tab).
    rerender(<UsagePauseButton row={row({ agentPause: null })} onChanged={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Pause agent" })).toBeInTheDocument();
    rerender(<UsagePauseButton row={row({ agentPause: { ...PAUSE, reason: "Again" } })} onChanged={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Resume agent" })).toBeInTheDocument();
  });

  it("keeps showing the row's own state when the action returns no account", () => {
    const onChanged = vi.fn();
    render(<UsagePauseButton row={row()} onChanged={onChanged} />);
    fireEvent.click(screen.getByRole("button", { name: "Pause agent" }));
    fireEvent.click(screen.getByRole("button", { name: "stub finish pause without account" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Pause agent" })).toBeInTheDocument();
  });

  it("closes without reloading when the dialog is cancelled", () => {
    const onChanged = vi.fn();
    render(<UsagePauseButton row={row()} onChanged={onChanged} />);
    fireEvent.click(screen.getByRole("button", { name: "Pause agent" }));
    fireEvent.click(screen.getByRole("button", { name: "stub close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("reloads the usage when the dialog finds the account changed, so a deleted person drops out", () => {
    const onChanged = vi.fn();
    render(<UsagePauseButton row={row()} onChanged={onChanged} />);
    fireEvent.click(screen.getByRole("button", { name: "Pause agent" }));
    fireEvent.click(screen.getByRole("button", { name: "stub stale" }));
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog", { name: "pause" })).toBeInTheDocument();
  });
});
