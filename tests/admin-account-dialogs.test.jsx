import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The whole Accounts tab, real from the page down to the dialogs: only the API is faked.
// (icons/index.js is JSX-in-.js and can't be parsed by Vite, so it is mocked.)
vi.mock("../app/components/icons/index.js", () => ({
  SearchIcon: (p) => <svg {...p} />,
  UserIcon: (p) => <svg {...p} />,
  SortIcon: () => <svg />,
  CloseIcon: (p) => <svg {...p} />,
}));
vi.mock("../app/lib/api/index.js", () => ({
  fetchAllAccounts: vi.fn(),
  fetchAccountDetail: vi.fn(),
  adminDisableUser: vi.fn(),
  adminEnableUser: vi.fn(),
  adminSignOutUser: vi.fn(),
  adminDeleteUser: vi.fn(),
}));

import { adminDeleteUser, adminDisableUser, fetchAccountDetail, fetchAllAccounts } from "../app/lib/api/index.js";
import AdminAccountsPage from "../app/components/admin/AdminAccountsPage.jsx";

const ana = {
  id: "u2",
  email: "ana@a.com",
  displayName: "Ana",
  role: "USER",
  status: "ACTIVE",
  accountType: "AGENCY_USER",
  createdAt: "2026-01-01T00:00:00Z",
  memberships: [],
  signInMethods: [],
  auditEvents: [],
  ownedAgencies: [{ agencyId: "ag1", agencyName: "Alpha", successors: [{ userId: "u5", displayName: "Bo", role: "STAFF" }] }],
};

const pending = () => new Promise(() => {});

beforeEach(() => {
  vi.resetAllMocks();
  fetchAllAccounts.mockResolvedValue({ users: [ana] });
  fetchAccountDetail.mockResolvedValue({ user: ana });
});

async function openPanel() {
  render(<AdminAccountsPage />);
  await waitFor(() => screen.getByTestId("account-row-u2"));
  fireEvent.click(screen.getByTestId("account-row-u2"));
  await screen.findByRole("button", { name: "Disable" });
}

const panelOpen = () => !!screen.queryByRole("button", { name: "Delete account" });
const statusRegion = () => document.querySelector("p.sr-only[role='status']");

async function fillDeleteForm() {
  fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
  const dialog = await screen.findByRole("dialog", { name: /Delete Ana/ });
  fireEvent.change(screen.getByLabelText(/New owner/), { target: { value: "u5" } });
  fireEvent.change(screen.getByLabelText(/to confirm/), { target: { value: "ana@a.com" } });
  return dialog;
}

describe("account dialogs inside the Accounts page", () => {
  describe("Escape", () => {
    it("closes the dialog but leaves the account panel open", async () => {
      await openPanel();
      fireEvent.click(screen.getByRole("button", { name: "Disable" }));
      await screen.findByRole("dialog", { name: /Disable Ana/ });

      fireEvent.keyDown(document.activeElement, { key: "Escape" });

      expect(screen.queryByRole("dialog", { name: /Disable Ana/ })).not.toBeInTheDocument();
      expect(panelOpen()).toBe(true);
    });

    it("does nothing while the request is in flight, so the outcome is still seen", async () => {
      adminDisableUser.mockReturnValue(pending());
      await openPanel();
      fireEvent.click(screen.getByRole("button", { name: "Disable" }));
      await screen.findByRole("dialog", { name: /Disable Ana/ });
      fireEvent.click(within(screen.getByRole("dialog", { name: /Disable Ana/ })).getByRole("button", { name: "Disable" }));
      await screen.findByText("Working…");

      fireEvent.keyDown(document.activeElement, { key: "Escape" });

      expect(screen.getByText("Working…")).toBeInTheDocument();
      expect(screen.getByRole("dialog", { name: /Disable Ana/ })).toBeInTheDocument();
      expect(panelOpen()).toBe(true);
    });

    it("still clears the selection when no dialog is open", async () => {
      await openPanel();
      fireEvent.keyDown(document.body, { key: "Escape" });
      await waitFor(() => expect(panelOpen()).toBe(false));
    });
  });

  describe("focus", () => {
    it("stays inside the delete dialog after Transfer and delete is pressed", async () => {
      adminDeleteUser.mockReturnValue(pending());
      await openPanel();
      const dialog = await fillDeleteForm();
      const submit = screen.getByRole("button", { name: "Transfer and delete" });
      submit.focus();

      fireEvent.click(submit);
      await screen.findByText("Deleting…");

      expect(dialog).toContainElement(document.activeElement);
    });

    it("stays inside the disable dialog after Disable is pressed", async () => {
      adminDisableUser.mockReturnValue(pending());
      await openPanel();
      fireEvent.click(screen.getByRole("button", { name: "Disable" }));
      const dialog = await screen.findByRole("dialog", { name: /Disable Ana/ });
      const submit = within(dialog).getByRole("button", { name: "Disable" });
      submit.focus();

      fireEvent.click(submit);
      await screen.findByText("Working…");

      expect(dialog).toContainElement(document.activeElement);
    });
  });

  describe("after a delete", () => {
    it("announces who was deleted, and keeps saying so once the list refreshes", async () => {
      adminDeleteUser.mockResolvedValue({});
      await openPanel();
      fetchAllAccounts.mockResolvedValue({ users: [{ ...ana, displayName: "Deleted user", status: "DELETED" }] });
      await fillDeleteForm();

      fireEvent.click(screen.getByRole("button", { name: "Transfer and delete" }));

      await waitFor(() => expect(statusRegion()).toHaveTextContent("Ana was deleted."));
      await waitFor(() => expect(fetchAllAccounts).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(screen.queryByTestId("account-row-u2")).not.toBeInTheDocument());
      expect(statusRegion()).toHaveTextContent("Ana was deleted.");
    });

    it("goes back to the list count when the admin searches or filters again", async () => {
      adminDeleteUser.mockResolvedValue({});
      await openPanel();
      await fillDeleteForm();
      fireEvent.click(screen.getByRole("button", { name: "Transfer and delete" }));
      await waitFor(() => expect(statusRegion()).toHaveTextContent("Ana was deleted."));

      fireEvent.change(screen.getByPlaceholderText("Search accounts…"), { target: { value: "ana" } });

      expect(statusRegion()).not.toHaveTextContent("was deleted");
      expect(statusRegion()).toHaveTextContent(/Showing|No accounts/);
    });
  });

  describe("when the account changed under the admin", () => {
    it("redraws the delete dialog from a fresh copy of the account and keeps the message", async () => {
      adminDeleteUser.mockRejectedValue(Object.assign(new Error("raw"), { code: "OWNERSHIP_CHANGED", status: 409 }));
      await openPanel();
      const dialog = await fillDeleteForm();
      // The agency now has a different set of people who can take over.
      fetchAccountDetail.mockResolvedValue({
        user: {
          ...ana,
          ownedAgencies: [
            {
              agencyId: "ag1",
              agencyName: "Alpha",
              successors: [
                { userId: "u6", displayName: "Cy", role: "ADMIN" },
                { userId: "u5", displayName: "Bo", role: "STAFF" },
              ],
            },
          ],
        },
      });

      fireEvent.click(screen.getByRole("button", { name: "Transfer and delete" }));

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(/owner changed/i);
      await within(dialog).findByRole("option", { name: /Cy/ });
      expect(within(dialog).getByRole("alert")).toHaveTextContent(/owner changed/i);
      expect(fetchAccountDetail).toHaveBeenCalledTimes(2);
      expect(fetchAccountDetail).toHaveBeenLastCalledWith("u2");
    });

    it("turns into the blocked dialog when the person now owns several agencies", async () => {
      adminDeleteUser.mockRejectedValue(Object.assign(new Error("raw"), { code: "MULTIPLE_OWNED_AGENCIES", status: 409 }));
      await openPanel();
      await fillDeleteForm();
      fetchAccountDetail.mockResolvedValue({
        user: {
          ...ana,
          ownedAgencies: [
            ...ana.ownedAgencies,
            { agencyId: "ag2", agencyName: "Beta", successors: [{ userId: "u7", displayName: "Di", role: "STAFF" }] },
          ],
        },
      });

      fireEvent.click(screen.getByRole("button", { name: "Transfer and delete" }));

      const dialog = await screen.findByRole("dialog", { name: /owns more than one agency/ });
      expect(within(dialog).getByRole("alert")).toHaveTextContent(/more than one agency/i);
    });

    it("hides the actions when the account turns out to be deleted already", async () => {
      adminDeleteUser.mockRejectedValue(Object.assign(new Error("raw"), { code: "ACCOUNT_DELETED", status: 409 }));
      await openPanel();
      await fillDeleteForm();
      fetchAccountDetail.mockResolvedValue({ user: { ...ana, status: "DELETED", ownedAgencies: [] } });

      fireEvent.click(screen.getByRole("button", { name: "Transfer and delete" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("This account is already deleted.");
      await waitFor(() => expect(screen.queryByRole("button", { name: "Sign out everywhere" })).not.toBeInTheDocument());
      expect(screen.getByRole("alert")).toHaveTextContent("This account is already deleted.");
    });
  });
});
