import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../app/lib/api/index.js", () => ({
  adminDisableUser: vi.fn(),
  adminEnableUser: vi.fn(),
  adminSignOutUser: vi.fn(),
  adminResumeAgent: vi.fn(),
}));

import { adminDisableUser, adminResumeAgent, adminSignOutUser } from "../app/lib/api/index.js";
import AccountActionDialog from "../app/components/admin/AccountActionDialog.jsx";

const account = { id: "u2", displayName: "Mara Santos", email: "mara@hops.travel" };

beforeEach(() => vi.clearAllMocks());

describe("AccountActionDialog", () => {
  it("disables with the typed reason and hands back the refreshed account", async () => {
    adminDisableUser.mockResolvedValue({ user: { ...account, status: "DISABLED" } });
    const onDone = vi.fn();
    render(<AccountActionDialog open action="disable" account={account} onClose={vi.fn()} onDone={onDone} />);

    expect(screen.getByRole("dialog", { name: "Disable Mara Santos?" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: "Left the agency" } });
    fireEvent.click(screen.getByRole("button", { name: "Disable" }));

    await waitFor(() => expect(onDone).toHaveBeenCalledWith({ ...account, status: "DISABLED" }));
    expect(adminDisableUser).toHaveBeenCalledWith("u2", "Left the agency");
  });

  it("shows the server's message when the action fails and stays open", async () => {
    adminSignOutUser.mockRejectedValue(Object.assign(new Error("Account not found."), { code: "ACCOUNT_NOT_FOUND" }));
    const onDone = vi.fn();
    render(<AccountActionDialog open action="sign-out" account={account} onClose={vi.fn()} onDone={onDone} />);

    fireEvent.click(screen.getByRole("button", { name: "Sign out everywhere" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Account not found.");
    expect(onDone).not.toHaveBeenCalled();
  });

  it("locks both buttons while the request is in flight", async () => {
    let resolve;
    adminDisableUser.mockReturnValue(new Promise((r) => (resolve = r)));
    const onClose = vi.fn();
    render(<AccountActionDialog open action="disable" account={account} onClose={onClose} onDone={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Disable" }));

    expect(await screen.findByRole("button", { name: "Working…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    resolve({ user: account });
  });
  describe("error copy", () => {
    const failWith = async (error, onStale) => {
      adminDisableUser.mockRejectedValue(error);
      render(<AccountActionDialog open action="disable" account={account} onClose={vi.fn()} onDone={vi.fn()} onStale={onStale} />);
      fireEvent.click(screen.getByRole("button", { name: "Disable" }));
      return screen.findByRole("alert");
    };

    it.each([
      ["ACCOUNT_DELETED", /already been deleted|has been deleted/i],
      ["CANNOT_ACT_ON_SELF", /your own account/i],
      ["CANNOT_ACT_ON_SUPER_ADMIN", /super admin/i],
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
      expect(alert).toHaveTextContent("That didn't work. Try again.");
    });

    it("asks the parent to load the account again when it turns out to be deleted already", async () => {
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

  describe("resume-agent", () => {
    it("asks to resume, sends the optional reason and hands back the account", async () => {
      adminResumeAgent.mockResolvedValue({ user: { ...account, agentPause: null } });
      const onDone = vi.fn();
      render(<AccountActionDialog open action="resume-agent" account={account} onClose={vi.fn()} onDone={onDone} />);

      expect(screen.getByRole("dialog", { name: "Resume the agent for Mara Santos?" })).toBeInTheDocument();
      expect(screen.getByText("They can use the agent again straight away.")).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: "Cleared after review" } });
      fireEvent.click(screen.getByRole("button", { name: "Resume agent" }));

      await waitFor(() => expect(onDone).toHaveBeenCalledWith({ ...account, agentPause: null }));
      expect(adminResumeAgent).toHaveBeenCalledWith("u2", "Cleared after review");
    });

    it("resumes without a reason when none is typed", async () => {
      adminResumeAgent.mockResolvedValue({ user: account });
      const onDone = vi.fn();
      render(<AccountActionDialog open action="resume-agent" account={account} onClose={vi.fn()} onDone={onDone} />);
      fireEvent.click(screen.getByRole("button", { name: "Resume agent" }));
      await waitFor(() => expect(onDone).toHaveBeenCalled());
      expect(adminResumeAgent).toHaveBeenCalledWith("u2", "");
    });

    it("shows the server's message when resuming fails and stays open", async () => {
      adminResumeAgent.mockRejectedValue(Object.assign(new Error("raw"), { code: "ACCOUNT_DELETED", status: 409 }));
      const onStale = vi.fn();
      render(<AccountActionDialog open action="resume-agent" account={account} onClose={vi.fn()} onDone={vi.fn()} onStale={onStale} />);
      fireEvent.click(screen.getByRole("button", { name: "Resume agent" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(/deleted/i);
      expect(onStale).toHaveBeenCalledTimes(1);
    });
  });

  describe("re-opening", () => {
    it("starts clean after a success and a close, never stuck on Working…", async () => {
      adminDisableUser.mockResolvedValue({ user: account });
      const props = { action: "disable", account, onClose: vi.fn(), onDone: vi.fn() };
      const { rerender } = render(<AccountActionDialog {...props} open />);
      fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: "Left" } });
      fireEvent.click(screen.getByRole("button", { name: "Disable" }));
      await waitFor(() => expect(props.onDone).toHaveBeenCalled());

      rerender(<AccountActionDialog {...props} open={false} />);
      rerender(<AccountActionDialog {...props} open />);

      expect(screen.queryByText("Working…")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Disable" })).toBeEnabled();
      expect(screen.getByLabelText(/reason/i)).toHaveValue("");
    });
  });
});
