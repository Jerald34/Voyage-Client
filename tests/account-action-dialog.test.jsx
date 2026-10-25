import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../app/lib/api/index.js", () => ({
  adminDisableUser: vi.fn(),
  adminEnableUser: vi.fn(),
  adminSignOutUser: vi.fn(),
}));

import { adminDisableUser, adminSignOutUser } from "../app/lib/api/index.js";
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
});
