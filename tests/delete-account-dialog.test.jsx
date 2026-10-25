import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

// Fill in the form for `account` and press its submit button, then wait for the error.
async function submitAndFail(account, code, extra = {}) {
  adminDeleteUser.mockRejectedValue(Object.assign(new Error("raw"), { code, status: 409 }));
  const props = renderDialog(account, extra);
  fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: account.email } });
  const pick = screen.queryByLabelText(/new owner/i);
  if (pick) fireEvent.change(pick, { target: { value: "u5" } });
  fireEvent.click(screen.getByRole("button", { name: /Transfer and delete|Delete account/ }));
  await screen.findByRole("alert");
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

  it("leaves out Disable instead (and its copy) when the parent does not offer it", () => {
    renderDialog(soloOwner, { onDisableInstead: undefined });
    expect(screen.getByText(/bayani tours has no other members/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Disable instead" })).not.toBeInTheDocument();
    expect(screen.queryByText(/disable this account/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Close" }).length).toBeGreaterThan(0);
  });

  it("blocks an owner of several agencies and offers Disable instead", () => {
    const props = renderDialog(multiOwner);
    expect(screen.getByRole("dialog", { name: "Jose Rizal owns more than one agency" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/to confirm/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Disable instead" }));
    expect(props.onDisableInstead).toHaveBeenCalled();
  });

  describe("errors", () => {
    it("turns a server error code into plain words", async () => {
      adminDeleteUser.mockRejectedValue(Object.assign(new Error("raw"), { code: "EMAIL_CONFIRMATION_MISMATCH" }));
      renderDialog(base);
      fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: "mara@hops.travel" } });
      fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("That email doesn't match this account.");
    });

    it("says the owner changed and that the details were refreshed, without telling the admin to reload", async () => {
      const props = await submitAndFail(owner, "OWNERSHIP_CHANGED");
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent(/owner changed.*refreshed/i);
      expect(alert).not.toHaveTextContent(/reload|close it/i);
      expect(props.onDeleted).not.toHaveBeenCalled();
    });

    it("shows the server's own message for an error it has no copy for, and re-enables the form", async () => {
      adminDeleteUser.mockRejectedValue(
        Object.assign(new Error("Too many requests. Please try again in 30 seconds."), { code: "RATE_LIMITED" })
      );
      const props = renderDialog(base);
      fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: "mara@hops.travel" } });
      fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests. Please try again in 30 seconds.");
      expect(screen.getByRole("button", { name: "Delete account" })).toBeEnabled();
      expect(props.onDeleted).not.toHaveBeenCalled();
    });

    it("falls back to a generic message when the error carries nothing at all", async () => {
      adminDeleteUser.mockRejectedValue({});
      renderDialog(base);
      fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: "mara@hops.travel" } });
      fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't delete this account. Try again.");
    });

    it("never shows the raw validation message", async () => {
      adminDeleteUser.mockRejectedValue(
        Object.assign(new Error("Request validation failed."), { code: "VALIDATION_ERROR", status: 400 })
      );
      renderDialog(base);
      fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: "mara@hops.travel" } });
      fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
      const alert = await screen.findByRole("alert");
      expect(alert).not.toHaveTextContent("Request validation failed.");
      expect(alert).toHaveTextContent(/aren't valid/i);
    });
  });

  describe("labels", () => {
    it("shows the email to type exactly as it must be typed, not in capitals", () => {
      renderDialog(base);
      const label = screen.getByText(/to confirm/i, { selector: "label" });
      const email = within(label).getByText("mara@hops.travel");
      expect(email.className).toContain("normal-case");
      expect(email.className).toContain("font-mono");
      expect(label).toHaveTextContent("Type mara@hops.travel to confirm");
    });

    it("says the reason is optional", () => {
      renderDialog(base);
      expect(screen.getByLabelText("Reason (optional, kept in the audit trail)")).toBeInTheDocument();
    });
  });

  describe("blocked copy", () => {
    it("tells the admin who has to do what, and where, for an owner of several agencies", () => {
      renderDialog(multiOwner);
      const copy = screen.getByText(/jose rizal owns bayani tours, luzon trails/i);
      expect(copy).toHaveTextContent(/each of these agencies needs a new owner/i);
      expect(copy).toHaveTextContent(/jose rizal can hand each one over from that agency's settings/i);
      expect(copy).toHaveTextContent(/transfer ownership/i);
    });

    it("tells the admin who deletes the solo owner's agency, and where", () => {
      renderDialog(soloOwner);
      expect(screen.getByText(/jose rizal must delete the agency from its settings/i)).toBeInTheDocument();
    });
  });

  describe("an account that changed since the panel loaded it", () => {
    it.each(["OWNERSHIP_CHANGED", "INVALID_NEW_OWNER", "OWNER_HAS_NO_SUCCESSOR", "MULTIPLE_OWNED_AGENCIES", "ACCOUNT_DELETED"])(
      "asks the parent to load the account again after %s",
      async (code) => {
        const onStale = vi.fn();
        await submitAndFail(owner, code, { onStale });
        expect(onStale).toHaveBeenCalledTimes(1);
      }
    );

    it("does not, for an error that has nothing to do with the account's state", async () => {
      const onStale = vi.fn();
      await submitAndFail(base, "EMAIL_CONFIRMATION_MISMATCH", { onStale });
      expect(onStale).not.toHaveBeenCalled();
    });

    it("copes with a parent that gives no onStale", async () => {
      await submitAndFail(owner, "OWNERSHIP_CHANGED");
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("keeps the message while the list of new owners redraws", async () => {
      adminDeleteUser.mockRejectedValue(Object.assign(new Error("raw"), { code: "OWNERSHIP_CHANGED", status: 409 }));
      const props = { open: true, onClose: vi.fn(), onDeleted: vi.fn() };
      const { rerender } = render(<DeleteAccountDialog {...props} account={owner} />);
      fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: "jose@bayani.ph" } });
      fireEvent.change(screen.getByLabelText(/new owner/i), { target: { value: "u5" } });
      fireEvent.click(screen.getByRole("button", { name: "Transfer and delete" }));
      await screen.findByRole("alert");

      const fresh = {
        ...owner,
        ownedAgencies: [{ agencyId: "a1", agencyName: "Bayani Tours", successors: [{ userId: "u6", displayName: "Ben Reyes", role: "STAFF" }] }],
      };
      rerender(<DeleteAccountDialog {...props} account={fresh} />);

      expect(screen.getByRole("alert")).toHaveTextContent(/owner changed/i);
      expect(screen.getByRole("option", { name: /Ben Reyes/ })).toBeInTheDocument();
      // The form is usable again for another try.
      expect(screen.getByLabelText(/to confirm/i)).toHaveValue("jose@bayani.ph");
    });

    it("drops a choice of new owner who can no longer take over, and keeps one who still can", () => {
      const props = { open: true, onClose: vi.fn(), onDeleted: vi.fn() };
      const { rerender } = render(<DeleteAccountDialog {...props} account={owner} />);
      fireEvent.change(screen.getByLabelText(/new owner/i), { target: { value: "u5" } });

      rerender(<DeleteAccountDialog {...props} account={{ ...owner, updatedAt: "later" }} />);
      expect(screen.getByLabelText(/new owner/i)).toHaveValue("u5");

      // Liza Cruz left the agency; Ben Reyes is the only one who can take over now.
      const fresh = {
        ...owner,
        ownedAgencies: [{ agencyId: "a1", agencyName: "Bayani Tours", successors: [{ userId: "u6", displayName: "Ben Reyes", role: "STAFF" }] }],
      };
      rerender(<DeleteAccountDialog {...props} account={fresh} />);
      expect(screen.getByRole("option", { name: /Ben Reyes/ })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: /Liza Cruz/ })).not.toBeInTheDocument();
      expect(screen.getByLabelText(/new owner/i)).toHaveValue("");
      fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: "jose@bayani.ph" } });
      expect(screen.getByRole("button", { name: "Transfer and delete" })).toBeDisabled();
    });

    it("keeps the message when the redraw turns the form into the blocked dialog", async () => {
      adminDeleteUser.mockRejectedValue(Object.assign(new Error("raw"), { code: "MULTIPLE_OWNED_AGENCIES", status: 409 }));
      const props = { open: true, onClose: vi.fn(), onDeleted: vi.fn() };
      const { rerender } = render(<DeleteAccountDialog {...props} account={owner} />);
      fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: "jose@bayani.ph" } });
      fireEvent.change(screen.getByLabelText(/new owner/i), { target: { value: "u5" } });
      fireEvent.click(screen.getByRole("button", { name: "Transfer and delete" }));
      await screen.findByRole("alert");

      rerender(<DeleteAccountDialog {...props} account={multiOwner} />);

      expect(screen.getByRole("dialog", { name: "Jose Rizal owns more than one agency" })).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(/more than one agency/i);
    });
  });

  describe("re-opening", () => {
    it("starts from a clean form after a delete went through and the dialog was closed", async () => {
      adminDeleteUser.mockResolvedValue({});
      const props = { account: base, onClose: vi.fn(), onDeleted: vi.fn() };
      const { rerender } = render(<DeleteAccountDialog {...props} open />);
      fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: "mara@hops.travel" } });
      fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
      await waitFor(() => expect(props.onDeleted).toHaveBeenCalled());

      rerender(<DeleteAccountDialog {...props} open={false} />);
      rerender(<DeleteAccountDialog {...props} open />);

      expect(screen.queryByText("Deleting…")).not.toBeInTheDocument();
      expect(screen.getByLabelText(/to confirm/i)).toHaveValue("");
      expect(screen.getByLabelText(/to confirm/i)).not.toHaveAttribute("readonly");
    });
  });
});
