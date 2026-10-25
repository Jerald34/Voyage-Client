import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../app/lib/api/index.js", () => ({ adminDeleteUser: vi.fn() }));

import { adminDeleteUser } from "../app/lib/api/index.js";
import DeleteAccountDialog from "../app/components/admin/DeleteAccountDialog.jsx";

const base = { id: "u2", displayName: "Mara Santos", email: "mara@hops.travel", ownedAgencies: [] };
const owner = {
  ...base,
  displayName: "Jose Rizal",
  email: "jose@bayani.ph",
  ownedAgencies: [{ agencyId: "a1", agencyName: "Bayani Tours", successors: [{ userId: "u5", displayName: "Liza Cruz", role: "ADMIN" }] }],
};
const soloOwner = { ...owner, ownedAgencies: [{ agencyId: "a1", agencyName: "Bayani Tours", successors: [] }] };
const multiOwner = {
  ...owner,
  ownedAgencies: [
    { agencyId: "a1", agencyName: "Bayani Tours", successors: [{ userId: "u5", displayName: "Liza Cruz", role: "ADMIN" }] },
    { agencyId: "a2", agencyName: "Luzon Trails", successors: [{ userId: "u6", displayName: "Ben Reyes", role: "STAFF" }] },
  ],
};

beforeEach(() => vi.clearAllMocks());

function renderDialog(account, extra = {}) {
  const props = { open: true, account, onClose: vi.fn(), onDeleted: vi.fn(), onDisableInstead: vi.fn(), ...extra };
  render(<DeleteAccountDialog {...props} />);
  return props;
}

describe("DeleteAccountDialog", () => {
  it("only enables Delete once the email is typed exactly (any case)", async () => {
    adminDeleteUser.mockResolvedValue({});
    const props = renderDialog(base);
    const button = screen.getByRole("button", { name: "Delete account" });
    expect(button).toBeDisabled();
    // Focus starts on the field that matters, not on the close button.
    expect(screen.getByLabelText(/type mara@hops.travel to confirm/i)).toHaveFocus();

    fireEvent.change(screen.getByLabelText(/type mara@hops.travel to confirm/i), { target: { value: "MARA@hops.travel" } });
    expect(button).toBeEnabled();
    fireEvent.click(button);

    await waitFor(() => expect(props.onDeleted).toHaveBeenCalled());
    expect(adminDeleteUser).toHaveBeenCalledWith("u2", { confirmEmail: "MARA@hops.travel", reason: "", newOwnerUserId: undefined });
  });

  it("asks an owner's dialog for a new owner and sends it", async () => {
    adminDeleteUser.mockResolvedValue({});
    renderDialog(owner);
    const button = screen.getByRole("button", { name: "Transfer and delete" });
    expect(screen.getByLabelText(/new owner/i)).toHaveFocus();

    fireEvent.change(screen.getByLabelText(/type jose@bayani.ph to confirm/i), { target: { value: "jose@bayani.ph" } });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/new owner/i), { target: { value: "u5" } });
    fireEvent.click(button);

    await waitFor(() => expect(adminDeleteUser).toHaveBeenCalledWith("u2", { confirmEmail: "jose@bayani.ph", reason: "", newOwnerUserId: "u5" }));
  });

  it("explains a solo owner and offers Disable instead, with no delete form", () => {
    const props = renderDialog(soloOwner);
    expect(screen.getByText(/bayani tours has no other members/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Disable instead" }));
    expect(props.onDisableInstead).toHaveBeenCalled();
  });

  it("blocks an owner of several agencies and offers Disable instead", () => {
    const props = renderDialog(multiOwner);
    expect(screen.getByRole("dialog", { name: "Jose Rizal owns more than one agency" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/to confirm/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Disable instead" }));
    expect(props.onDisableInstead).toHaveBeenCalled();
  });

  it("turns a server error code into plain words", async () => {
    adminDeleteUser.mockRejectedValue(Object.assign(new Error("raw"), { code: "EMAIL_CONFIRMATION_MISMATCH" }));
    renderDialog(base);
    fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: "mara@hops.travel" } });
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That email doesn't match this account.");
  });

  it("tells the admin to reload when the agency's owner changed underneath them", async () => {
    adminDeleteUser.mockRejectedValue(Object.assign(new Error("raw"), { code: "OWNERSHIP_CHANGED", status: 409 }));
    const props = renderDialog(owner);
    fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: "jose@bayani.ph" } });
    fireEvent.change(screen.getByLabelText(/new owner/i), { target: { value: "u5" } });
    fireEvent.click(screen.getByRole("button", { name: "Transfer and delete" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/owner changed.*reload/i);
    expect(props.onDeleted).not.toHaveBeenCalled();
  });

  it("falls back to a generic message for an unknown error and re-enables the form", async () => {
    adminDeleteUser.mockRejectedValue(Object.assign(new Error("boom"), { code: "SOMETHING_NEW" }));
    const props = renderDialog(base);
    fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: "mara@hops.travel" } });
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't delete this account. Try again.");
    expect(screen.getByRole("button", { name: "Delete account" })).toBeEnabled();
    expect(props.onDeleted).not.toHaveBeenCalled();
  });
});
