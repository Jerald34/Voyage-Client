import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../app/lib/api/index.js", () => ({ adminPauseAgent: vi.fn() }));

import { adminPauseAgent } from "../app/lib/api/index.js";
import PauseAgentDialog from "../app/components/admin/PauseAgentDialog.jsx";

const account = { id: "u2", displayName: "Mara Santos", email: "mara@hops.travel", usageThisMonth: { costUsd: 1.4, runCount: 71 } };

beforeEach(() => vi.clearAllMocks());

const reasonField = () => screen.getByLabelText(/reason/i);

describe("PauseAgentDialog", () => {
  it("defaults to 24 hours, needs a reason, and sends both", async () => {
    adminPauseAgent.mockResolvedValue({ user: { ...account, agentPause: { until: null } } });
    const onDone = vi.fn();
    render(<PauseAgentDialog open account={account} onClose={vi.fn()} onDone={onDone} />);

    expect(screen.getByRole("dialog", { name: "Pause the agent for Mara Santos?" })).toBeInTheDocument();
    expect(screen.getByText("This month: $1.40 · 71 runs")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "24 hours" })).toBeChecked();
    const submit = screen.getByRole("button", { name: "Pause agent" });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: "Until I lift it" }));
    fireEvent.change(reasonField(), { target: { value: "Abuse" } });
    fireEvent.click(submit);

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(adminPauseAgent).toHaveBeenCalledWith("u2", { duration: "indefinite", reason: "Abuse" });
  });

  it("shows the spend a caller hands it, under the caller's own label, ahead of the account's monthly figure", () => {
    render(<PauseAgentDialog open account={account} spend={{ label: "Last 7 days", costUsd: 0.2, runCount: 1 }} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText("Last 7 days: $0.200 · 1 run")).toBeInTheDocument();
    expect(screen.queryByText(/^This month:/)).not.toBeInTheDocument();
  });

  it("leaves the spend line out when there is nothing to say", () => {
    render(<PauseAgentDialog open account={{ id: "u2", displayName: "Mara Santos" }} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText("They can still sign in and edit trips by hand.")).toBeInTheDocument();
    expect(screen.queryByText(/ runs?$/)).not.toBeInTheDocument();
  });

  it("makes the duration chips tint on hover only for a mouse, and animate only what changes", () => {
    render(<PauseAgentDialog open account={account} onClose={vi.fn()} onDone={vi.fn()} />);
    const chip = screen.getByRole("radio", { name: "1 hour" }).closest("label");
    expect(chip).toHaveClass("transition-[color,background-color,border-color]", "duration-150", "ease-out");
    expect(chip.className).toContain("[@media(hover:hover)_and_(pointer:fine)]:hover:bg-surface");
    expect(chip.className).not.toMatch(/(^|\s)hover:/);
  });

  it("hands back the refreshed account", async () => {
    const user = { ...account, agentPause: { pausedAt: "p", until: null, reason: "Abuse" } };
    adminPauseAgent.mockResolvedValue({ user });
    const onDone = vi.fn();
    render(<PauseAgentDialog open account={account} onClose={vi.fn()} onDone={onDone} />);
    fireEvent.change(reasonField(), { target: { value: "Abuse" } });
    fireEvent.click(screen.getByRole("button", { name: "Pause agent" }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(user));
  });

  it("offers the four durations as one radio group", () => {
    render(<PauseAgentDialog open account={account} onClose={vi.fn()} onDone={vi.fn()} />);
    const group = screen.getByRole("group", { name: "Duration" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio").map((r) => r.value)).toEqual(["1h", "24h", "7d", "indefinite"]);
    expect(screen.getAllByRole("radio").map((r) => r.labels[0].textContent.trim())).toEqual(["1 hour", "24 hours", "7 days", "Until I lift it"]);
  });

  it("sends the chosen timed duration", async () => {
    adminPauseAgent.mockResolvedValue({ user: account });
    render(<PauseAgentDialog open account={account} onClose={vi.fn()} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole("radio", { name: "7 days" }));
    fireEvent.change(reasonField(), { target: { value: "Spam" } });
    fireEvent.click(screen.getByRole("button", { name: "Pause agent" }));
    await waitFor(() => expect(adminPauseAgent).toHaveBeenCalledWith("u2", { duration: "7d", reason: "Spam" }));
  });

  it("does not accept a reason that is only spaces", () => {
    render(<PauseAgentDialog open account={account} onClose={vi.fn()} onDone={vi.fn()} />);
    fireEvent.change(reasonField(), { target: { value: "    " } });
    expect(screen.getByRole("button", { name: "Pause agent" })).toBeDisabled();
  });

  it("says who sees the reason, caps it at 300 and counts the characters", () => {
    render(<PauseAgentDialog open account={account} onClose={vi.fn()} onDone={vi.fn()} />);
    const field = reasonField();
    expect(field).toHaveAttribute("maxlength", "300");
    expect(screen.getByText("0 / 300")).toBeInTheDocument();
    fireEvent.change(field, { target: { value: "Too many requests" } });
    expect(screen.getByText("17 / 300")).toBeInTheDocument();
    // The count is part of the field's description, so a screen reader hears it with the field.
    expect(field).toHaveAccessibleDescription(/17 \/ 300/);
    expect(screen.getByText(/shown to the user and their agency/i)).toBeInTheDocument();
  });

  it("reassures the admin that the person can still use everything but the agent", () => {
    render(<PauseAgentDialog open account={account} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText(/can still sign in and edit trips by hand/i)).toBeInTheDocument();
  });

  it("leaves out the spend line when the account has no usage figures", () => {
    render(<PauseAgentDialog open account={{ id: "u2", displayName: "Mara Santos" }} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.queryByText(/This month/)).not.toBeInTheDocument();
  });

  it("names the account by email when it has no display name", () => {
    render(<PauseAgentDialog open account={{ id: "u2", email: "mara@hops.travel" }} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Pause the agent for mara@hops.travel?" })).toBeInTheDocument();
  });

  it("renders nothing when there is no account", () => {
    const { container } = render(<PauseAgentDialog open account={null} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("locks the form while the request is in flight", async () => {
    let resolve;
    adminPauseAgent.mockReturnValue(new Promise((r) => (resolve = r)));
    const onClose = vi.fn();
    render(<PauseAgentDialog open account={account} onClose={onClose} onDone={vi.fn()} />);
    fireEvent.change(reasonField(), { target: { value: "Abuse" } });
    fireEvent.click(screen.getByRole("button", { name: "Pause agent" }));

    expect(await screen.findByRole("button", { name: "Pausing…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(reasonField()).toHaveAttribute("readonly");
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    resolve({ user: account });
  });

  it("sends only once when the button is pressed twice", async () => {
    adminPauseAgent.mockReturnValue(new Promise(() => {}));
    render(<PauseAgentDialog open account={account} onClose={vi.fn()} onDone={vi.fn()} />);
    fireEvent.change(reasonField(), { target: { value: "Abuse" } });
    const submit = screen.getByRole("button", { name: "Pause agent" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(adminPauseAgent).toHaveBeenCalledTimes(1);
  });

  it("closes from Cancel and from Escape when idle", () => {
    const onClose = vi.fn();
    render(<PauseAgentDialog open account={account} onClose={onClose} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  describe("errors", () => {
    const failWith = async (error, onStale) => {
      adminPauseAgent.mockRejectedValue(error);
      const onDone = vi.fn();
      render(<PauseAgentDialog open account={account} onClose={vi.fn()} onDone={onDone} onStale={onStale} />);
      fireEvent.change(reasonField(), { target: { value: "Abuse" } });
      fireEvent.click(screen.getByRole("button", { name: "Pause agent" }));
      const alert = await screen.findByRole("alert");
      expect(onDone).not.toHaveBeenCalled();
      return alert;
    };

    it.each([
      ["CANNOT_ACT_ON_SELF", /your own account/i],
      ["CANNOT_ACT_ON_SUPER_ADMIN", /super admin/i],
      ["ACCOUNT_DELETED", /deleted/i],
      ["VALIDATION_ERROR", /reason/i],
    ])("turns %s into plain words, not the server's wording", async (code, words) => {
      const alert = await failWith(Object.assign(new Error("Request validation failed."), { code, status: 409 }));
      expect(alert).toHaveTextContent(words);
      expect(alert).not.toHaveTextContent("Request validation failed.");
    });

    it("shows the server's own message for a code it has no copy for", async () => {
      const alert = await failWith(Object.assign(new Error("Too many requests. Please try again in 30 seconds."), { code: "RATE_LIMITED" }));
      expect(alert).toHaveTextContent("Too many requests. Please try again in 30 seconds.");
    });

    it("falls back to a generic line when the error carries nothing", async () => {
      const alert = await failWith({});
      expect(alert).toHaveTextContent("Couldn't pause the agent. Try again.");
    });

    it("unlocks the form so the admin can try again", async () => {
      await failWith(Object.assign(new Error("raw"), { code: "RATE_LIMITED" }));
      expect(screen.getByRole("button", { name: "Pause agent" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
      expect(reasonField()).not.toHaveAttribute("readonly");
      expect(reasonField()).toHaveValue("Abuse");
    });

    it("asks the parent to load the account again when it turns out to be deleted", async () => {
      const onStale = vi.fn();
      await failWith(Object.assign(new Error("raw"), { code: "ACCOUNT_DELETED", status: 409 }), onStale);
      expect(onStale).toHaveBeenCalledTimes(1);
    });

    it("does not for an error that says nothing about the account's state", async () => {
      const onStale = vi.fn();
      await failWith(Object.assign(new Error("raw"), { code: "VALIDATION_ERROR", status: 400 }), onStale);
      expect(onStale).not.toHaveBeenCalled();
    });
  });

  describe("re-opening", () => {
    it("starts clean after a success and a close, never stuck on Pausing…", async () => {
      adminPauseAgent.mockResolvedValue({ user: account });
      const props = { account, onClose: vi.fn(), onDone: vi.fn() };
      const { rerender } = render(<PauseAgentDialog {...props} open />);
      fireEvent.click(screen.getByRole("radio", { name: "7 days" }));
      fireEvent.change(reasonField(), { target: { value: "Abuse" } });
      fireEvent.click(screen.getByRole("button", { name: "Pause agent" }));
      await waitFor(() => expect(props.onDone).toHaveBeenCalled());

      rerender(<PauseAgentDialog {...props} open={false} />);
      rerender(<PauseAgentDialog {...props} open />);

      expect(screen.queryByText("Pausing…")).not.toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "24 hours" })).toBeChecked();
      expect(reasonField()).toHaveValue("");
      expect(screen.getByRole("button", { name: "Pause agent" })).toBeDisabled();
    });

    it("clears an old error when it opens again", async () => {
      adminPauseAgent.mockRejectedValue(Object.assign(new Error("raw"), { code: "RATE_LIMITED" }));
      const props = { account, onClose: vi.fn(), onDone: vi.fn() };
      const { rerender } = render(<PauseAgentDialog {...props} open />);
      fireEvent.change(reasonField(), { target: { value: "Abuse" } });
      fireEvent.click(screen.getByRole("button", { name: "Pause agent" }));
      await screen.findByRole("alert");

      rerender(<PauseAgentDialog {...props} open={false} />);
      rerender(<PauseAgentDialog {...props} open />);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
