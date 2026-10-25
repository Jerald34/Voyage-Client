import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// icons/index.js is JSX-in-.js and can't be parsed by Vite — mock it (established convention).
// The page imports SearchIcon + UserIcon; the table SortIcon; the detail pane in the chain CloseIcon.
vi.mock("../app/components/icons/index.js", () => ({
  SearchIcon: (p) => <svg data-testid="search-icon" {...p} />,
  UserIcon: (p) => <svg data-testid="user-icon" {...p} />,
  SortIcon: ({ active, direction, ...p }) => <svg data-testid="sort-icon" {...p} />,
  CloseIcon: (p) => <svg data-testid="close-icon" {...p} />,
}));

vi.mock("../app/lib/api/index.js", () => ({
  fetchAllAccounts: vi.fn(),
}));

// The panel is tested on its own; here it is a stub that exposes the two callbacks the page wires up.
vi.mock("../app/components/admin/AccountDetail.jsx", () => ({
  default: ({ userId, onChanged, onDeleted }) => (
    <div data-testid="account-detail">
      detail for {userId}
      <button type="button" onClick={onChanged}>
        stub changed
      </button>
      <button type="button" onClick={onDeleted}>
        stub deleted
      </button>
    </div>
  ),
}));

import { fetchAllAccounts } from "../app/lib/api/index.js";
import AdminAccountsPage from "../app/components/admin/AdminAccountsPage.jsx";

const membership = (over = {}) => ({
  agencyId: "ag1",
  agencyName: "Alpha Travel",
  agencyStatus: "VERIFIED",
  role: "OWNER",
  status: "ACTIVE",
  ...over,
});

const account = (over = {}) => ({
  id: "u1",
  email: "pia@example.com",
  displayName: "Pia Santos",
  role: "USER",
  status: "ACTIVE",
  accountType: "PERSONAL",
  emailVerified: true,
  createdAt: "2026-05-01T12:00:00.000Z",
  signInMethods: ["PASSWORD"],
  memberships: [],
  ...over,
});

// Deliberately not in createdAt order, so the default sort is observable.
const ACCOUNTS = [
  account({ id: "u1", displayName: "Pia Santos", email: "pia@example.com", createdAt: "2026-05-01T12:00:00.000Z" }),
  account({
    id: "u2",
    displayName: "Ana Reyes",
    email: "ana@alpha.com",
    accountType: "AGENCY_USER",
    createdAt: "2026-06-01T12:00:00.000Z",
    memberships: [membership(), membership({ agencyId: "ag2", agencyName: "Beta Tours", role: "STAFF" })],
  }),
  account({
    id: "u3",
    displayName: "Root Admin",
    email: "root@voyage.dev",
    role: "SUPER_ADMIN",
    accountType: "PENDING",
    emailVerified: false,
    createdAt: "2026-03-01T12:00:00.000Z",
  }),
  account({
    id: "u4",
    displayName: "Zed Newcomer",
    email: "zed@example.com",
    accountType: "PENDING",
    createdAt: "2026-07-01T12:00:00.000Z",
  }),
  account({
    id: "u5",
    displayName: "Lia Mendoza",
    email: "lia@example.com",
    accountType: "PERSONAL",
    createdAt: "2026-04-01T12:00:00.000Z",
  }),
];

// The one always-mounted polite live region (the table footers are not live).
const statusRegion = () => document.querySelector("p.sr-only[role='status']");

const rowIds = () =>
  screen.getAllByTestId(/^account-row-/).map((el) => el.getAttribute("data-testid").replace("account-row-", ""));

async function renderLoaded(accounts = ACCOUNTS) {
  fetchAllAccounts.mockResolvedValue({ users: accounts });
  render(<AdminAccountsPage />);
  await waitFor(() => expect(screen.queryByText("Loading accounts…")).not.toBeInTheDocument());
}

const fetchAccountsNever = () => fetchAllAccounts.mockReturnValue(new Promise(() => {}));

beforeEach(() => {
  fetchAllAccounts.mockReset();
});

describe("AdminAccountsPage", () => {
  describe("loading and failure", () => {
    it("shows a loading state, then the accounts", async () => {
      let resolve;
      fetchAllAccounts.mockReturnValue(new Promise((r) => (resolve = r)));
      render(<AdminAccountsPage />);
      expect(screen.getByText("Loading accounts…")).toBeInTheDocument();

      resolve({ users: ACCOUNTS });
      await waitFor(() => expect(screen.queryByText("Loading accounts…")).not.toBeInTheDocument());
      expect(screen.getByTestId("account-row-u1")).toBeInTheDocument();
    });

    it("loads the accounts once, not again when the filter changes", async () => {
      await renderLoaded();
      fireEvent.click(screen.getByRole("radio", { name: /^Personal/ }));
      fireEvent.click(screen.getByRole("radio", { name: /^All/ }));
      expect(fetchAllAccounts).toHaveBeenCalledTimes(1);
    });

    it("shows the error and lets the admin retry", async () => {
      fetchAllAccounts.mockRejectedValueOnce(new Error("Server unreachable"));
      render(<AdminAccountsPage />);
      expect(await screen.findByText("Server unreachable")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();

      fetchAllAccounts.mockResolvedValueOnce({ users: ACCOUNTS });
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      await waitFor(() => expect(screen.getByTestId("account-row-u1")).toBeInTheDocument());
      expect(screen.queryByText("Server unreachable")).not.toBeInTheDocument();
    });

    it("says so when there are no accounts at all", async () => {
      await renderLoaded([]);
      expect(screen.getAllByText("No accounts found.").length).toBeGreaterThan(0);
      expect(statusRegion()).toHaveTextContent("No accounts found.");
    });
  });

  describe("type filter", () => {
    it("is a labelled radio group with the five options in order", async () => {
      await renderLoaded();
      const group = screen.getByRole("radiogroup", { name: "Filter by account type" });
      const names = within(group).getAllByRole("radio").map((r) => r.textContent.replace(/\s+/g, " ").trim());
      expect(names).toEqual(["All 5", "Personal 2", "Agency 1", "Setup incomplete 2", "Deleted 0"]);
    });

    it("counts each type, and the counts add up to All", async () => {
      await renderLoaded();
      expect(screen.getByRole("radio", { name: "All 5" })).toHaveAttribute("aria-checked", "true");
      expect(screen.getByRole("radio", { name: "Personal 2" })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "Agency 1" })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "Setup incomplete 2" })).toBeInTheDocument();
    });

    it("keeps the label legible in the active segment (count inherits the fill's text colour)", async () => {
      await renderLoaded();
      const all = screen.getByRole("radio", { name: "All 5" });
      expect(all.className).toContain("bg-primary");
      expect(all.className).toContain("text-on-primary");
      const count = within(all).getByText("5");
      expect(count.className).toContain("bg-current/10"); // a tint of whatever the label colour is
      expect(count.className).not.toMatch(/opacity-/); // never dimmed below the label
    });

    it("shows no counts while the list is still loading", () => {
      fetchAllAccounts.mockReturnValue(new Promise(() => {}));
      render(<AdminAccountsPage />);
      expect(screen.getByRole("radio", { name: "Personal" })).toBeInTheDocument();
    });

    it("shows only personal accounts when Personal is chosen", async () => {
      await renderLoaded();
      fireEvent.click(screen.getByRole("radio", { name: "Personal 2" }));
      expect(screen.getByRole("radio", { name: "Personal 2" })).toHaveAttribute("aria-checked", "true");
      expect(rowIds().sort()).toEqual(["u1", "u5"]);
    });

    it("shows only agency accounts, and only setup-incomplete ones, for those choices", async () => {
      await renderLoaded();
      fireEvent.click(screen.getByRole("radio", { name: "Agency 1" }));
      expect(rowIds()).toEqual(["u2"]);

      fireEvent.click(screen.getByRole("radio", { name: "Setup incomplete 2" }));
      expect(rowIds().sort()).toEqual(["u3", "u4"]);

      fireEvent.click(screen.getByRole("radio", { name: "All 5" }));
      expect(rowIds()).toHaveLength(5);
    });

    it("counts stay put while searching", async () => {
      await renderLoaded();
      fireEvent.change(screen.getByPlaceholderText("Search accounts…"), { target: { value: "pia" } });
      expect(screen.getByRole("radio", { name: "Personal 2" })).toBeInTheDocument();
    });
  });

  describe("deleted accounts", () => {
    const deletedUser = () =>
      account({ id: "u9", displayName: "Deleted user", email: "deleted+u9@deleted.invalid", status: "DELETED", createdAt: "2026-02-01T12:00:00.000Z" });

    it("hides deleted accounts from All and lists them under Deleted", async () => {
      await renderLoaded([account({ id: "u1", displayName: "Ana Reyes" }), deletedUser()]);

      expect(screen.getAllByText("Ana Reyes").length).toBeGreaterThan(0);
      expect(screen.queryAllByText("Deleted user")).toHaveLength(0);
      expect(screen.getByRole("radio", { name: "All 1" })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("radio", { name: /deleted 1/i }));
      expect(screen.getAllByText("Deleted user").length).toBeGreaterThan(0);
      expect(screen.queryAllByText("Ana Reyes")).toHaveLength(0);
      expect(statusRegion()).toHaveTextContent("Showing 1 of 1 accounts");
    });

    it("keeps deleted accounts out of the type filters and their counts", async () => {
      await renderLoaded([account({ id: "u1" }), { ...deletedUser(), accountType: "PERSONAL" }]);
      expect(screen.getByRole("radio", { name: "Personal 1" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("radio", { name: "Personal 1" }));
      expect(rowIds()).toEqual(["u1"]);
    });

    it("marks a deleted account with its status pill, and a disabled one, but not an active one", async () => {
      await renderLoaded([
        account({ id: "u1" }),
        account({ id: "u2", status: "DISABLED" }),
        deletedUser(),
      ]);
      const row = (id) => within(screen.getByTestId(`account-row-${id}`));
      const card = (id) => within(screen.getByTestId(`account-card-${id}`));

      expect(row("u1").queryByText("Active")).not.toBeInTheDocument();
      expect(card("u1").queryByText("Active")).not.toBeInTheDocument();
      expect(row("u2").getByText("Disabled")).toBeInTheDocument();
      expect(card("u2").getByText("Disabled")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("radio", { name: /deleted 1/i }));
      expect(row("u9").getByText("Deleted")).toBeInTheDocument();
      expect(card("u9").getByText("Deleted")).toBeInTheDocument();
    });

    it("says there is nothing here when no account has been deleted", async () => {
      await renderLoaded();
      fireEvent.click(screen.getByRole("radio", { name: "Deleted 0" }));
      expect(screen.getAllByText("No accounts found.").length).toBeGreaterThan(0);
      expect(statusRegion()).toHaveTextContent("No accounts found.");
    });

    it("searches within the Deleted filter too", async () => {
      await renderLoaded([deletedUser(), { ...deletedUser(), id: "u10", displayName: "Deleted user", email: "deleted+u10@deleted.invalid" }]);
      fireEvent.click(screen.getByRole("radio", { name: /deleted 2/i }));
      fireEvent.change(screen.getByPlaceholderText("Search accounts…"), { target: { value: "u10@" } });
      expect(rowIds()).toEqual(["u10"]);
    });
  });

  describe("refreshing after an account action", () => {
    it("reloads the list when the panel reports a change, keeping the panel open", async () => {
      await renderLoaded();
      fireEvent.click(screen.getByTestId("account-row-u2"));
      fetchAllAccounts.mockResolvedValue({
        users: ACCOUNTS.map((a) => (a.id === "u2" ? { ...a, status: "DISABLED" } : a)),
      });

      fireEvent.click(screen.getByRole("button", { name: "stub changed" }));
      // Refreshes in place: the list never flashes back to the spinner.
      expect(screen.queryByText("Loading accounts…")).not.toBeInTheDocument();
      expect(screen.getByTestId("account-row-u2")).toBeInTheDocument();
      await waitFor(() => expect(fetchAllAccounts).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(within(screen.getByTestId("account-row-u2")).getByText("Disabled")).toBeInTheDocument());
      expect(screen.getByTestId("account-detail")).toHaveTextContent("detail for u2");
    });

    it("reloads the list and closes the panel when the panel reports a delete", async () => {
      await renderLoaded();
      fireEvent.click(screen.getByTestId("account-row-u2"));
      fetchAllAccounts.mockResolvedValue({
        users: ACCOUNTS.map((a) => (a.id === "u2" ? { ...a, displayName: "Deleted user", status: "DELETED" } : a)),
      });

      fireEvent.click(screen.getByRole("button", { name: "stub deleted" }));
      await waitFor(() => expect(fetchAllAccounts).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(screen.queryByTestId("account-detail")).not.toBeInTheDocument());
      expect(screen.getByText("Select an account")).toBeInTheDocument();
      await waitFor(() => expect(screen.getByRole("radio", { name: /deleted 1/i })).toBeInTheDocument());
      expect(screen.queryByTestId("account-row-u2")).not.toBeInTheDocument(); // moved out of All
    });
  });

  describe("search", () => {
    const search = (value) =>
      fireEvent.change(screen.getByPlaceholderText("Search accounts…"), { target: { value } });

    it("matches the display name, ignoring case", async () => {
      await renderLoaded();
      search("ROOT adm");
      expect(rowIds()).toEqual(["u3"]);
    });

    it("matches the email", async () => {
      await renderLoaded();
      search("ana@alpha");
      expect(rowIds()).toEqual(["u2"]);
    });

    it("matches any of the account's agencies, not just the first", async () => {
      await renderLoaded();
      search("beta tours");
      expect(rowIds()).toEqual(["u2"]);
    });

    it("combines with the type filter", async () => {
      await renderLoaded();
      fireEvent.click(screen.getByRole("radio", { name: "Personal 2" }));
      search("example.com");
      expect(rowIds().sort()).toEqual(["u1", "u5"]);
      search("lia@");
      expect(rowIds()).toEqual(["u5"]);
      expect(screen.getAllByText("Showing 1 of 2 accounts").length).toBeGreaterThan(0);
    });

    it("says nothing matches when the search finds no one", async () => {
      await renderLoaded();
      search("nobody here");
      expect(screen.getAllByText("No accounts match your search.").length).toBeGreaterThan(0);
      expect(statusRegion()).toHaveTextContent("No accounts match your search.");
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      // The visible copy stays readable to touch / mouse-tracking screen readers.
      const visible = screen.getAllByText("No accounts match your search.").find((el) => el !== statusRegion());
      expect(visible.closest("[aria-hidden='true']")).toBeNull();
    });
  });

  describe("live region", () => {
    const search = (value) =>
      fireEvent.change(screen.getByPlaceholderText("Search accounts…"), { target: { value } });

    it("is mounted from the first render, before the accounts have loaded, and empty", () => {
      fetchAccountsNever();
      render(<AdminAccountsPage />);
      const region = statusRegion();
      expect(region).toBeInTheDocument();
      expect(region).toBeEmptyDOMElement();
    });

    it("keeps the same element and announces the count once loaded", async () => {
      fetchAllAccounts.mockResolvedValue({ users: ACCOUNTS });
      render(<AdminAccountsPage />);
      const region = statusRegion();
      await waitFor(() => expect(region).toHaveTextContent("Showing 5 of 5 accounts"));
      expect(statusRegion()).toBe(region);
    });

    it("announces the count after a filter and after a search", async () => {
      await renderLoaded();
      fireEvent.click(screen.getByRole("radio", { name: "Personal 2" }));
      expect(statusRegion()).toHaveTextContent("Showing 2 of 2 accounts");
      search("lia@");
      expect(statusRegion()).toHaveTextContent("Showing 1 of 2 accounts");
    });

    it("announces the no-match message, and the count again when the search is cleared", async () => {
      await renderLoaded();
      search("nobody here");
      expect(statusRegion()).toHaveTextContent("No accounts match your search.");
      search("");
      expect(statusRegion()).toHaveTextContent("Showing 5 of 5 accounts");
    });

    it("announces who was deleted, and keeps saying so while the list reloads", async () => {
      await renderLoaded();
      fireEvent.click(screen.getByTestId("account-row-u2"));
      fetchAllAccounts.mockResolvedValue({
        users: ACCOUNTS.map((a) => (a.id === "u2" ? { ...a, displayName: "Deleted user", status: "DELETED" } : a)),
      });

      fireEvent.click(screen.getByRole("button", { name: "stub deleted" }));
      expect(statusRegion()).toHaveTextContent("Ana Reyes was deleted.");

      await waitFor(() => expect(fetchAllAccounts).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(screen.queryByTestId("account-row-u2")).not.toBeInTheDocument());
      expect(statusRegion()).toHaveTextContent("Ana Reyes was deleted.");
    });

    it("goes back to the count once the admin picks another account, filters or searches", async () => {
      const deleteAna = async () => {
        fireEvent.click(screen.getByTestId("account-row-u2"));
        fireEvent.click(screen.getByRole("button", { name: "stub deleted" }));
        expect(statusRegion()).toHaveTextContent("was deleted.");
      };

      await renderLoaded();
      await deleteAna();
      fireEvent.click(screen.getByTestId("account-row-u1"));
      expect(statusRegion()).not.toHaveTextContent("was deleted");
      expect(statusRegion()).toHaveTextContent(/Showing/);

      fireEvent.click(screen.getByRole("button", { name: "stub deleted" }));
      expect(statusRegion()).toHaveTextContent("Pia Santos was deleted.");
      fireEvent.click(screen.getByRole("radio", { name: /Personal/ }));
      expect(statusRegion()).not.toHaveTextContent("was deleted");

      fireEvent.click(screen.getByTestId("account-row-u1"));
      fireEvent.click(screen.getByRole("button", { name: "stub deleted" }));
      expect(statusRegion()).toHaveTextContent("was deleted.");
      search("lia");
      expect(statusRegion()).not.toHaveTextContent("was deleted");
    });

    it("says so plainly if the deleted account is no longer in the list", async () => {
      await renderLoaded();
      fireEvent.click(screen.getByTestId("account-row-u2"));
      // The list reloaded without the account while its panel was still open.
      fetchAllAccounts.mockResolvedValue({ users: ACCOUNTS.filter((a) => a.id !== "u2") });
      fireEvent.click(screen.getByRole("button", { name: "stub changed" }));
      await waitFor(() => expect(screen.queryByTestId("account-row-u2")).not.toBeInTheDocument());

      fireEvent.click(screen.getByRole("button", { name: "stub deleted" }));

      expect(statusRegion()).toHaveTextContent("The account was deleted.");
    });

    it("is the only live region: neither table footer has aria-live", async () => {
      await renderLoaded();
      expect(document.querySelectorAll("[aria-live]")).toHaveLength(0);
      expect(document.querySelectorAll("[role='status']:not(.sr-only)")).toHaveLength(0);
    });
  });

  describe("sorting", () => {
    it("lists the newest account first by default", async () => {
      await renderLoaded();
      expect(rowIds()).toEqual(["u4", "u2", "u1", "u5", "u3"]);
      expect(screen.getByRole("columnheader", { name: "Joined" })).toHaveAttribute("aria-sort", "descending");
    });

    it("flips Joined to oldest first on a second click", async () => {
      await renderLoaded();
      fireEvent.click(screen.getByRole("button", { name: "Joined" }));
      expect(rowIds()).toEqual(["u3", "u5", "u1", "u2", "u4"]);
      expect(screen.getByRole("columnheader", { name: "Joined" })).toHaveAttribute("aria-sort", "ascending");
    });

    it("sorts by name A-Z, then Z-A", async () => {
      await renderLoaded();
      fireEvent.click(screen.getByRole("button", { name: "Name" }));
      expect(rowIds()).toEqual(["u2", "u5", "u1", "u3", "u4"]); // Ana, Lia, Pia, Root, Zed
      fireEvent.click(screen.getByRole("button", { name: "Name" }));
      expect(rowIds()).toEqual(["u4", "u3", "u1", "u5", "u2"]);
    });

    it("sorts by type label: Agency, Personal, Setup incomplete", async () => {
      await renderLoaded();
      fireEvent.click(screen.getByRole("button", { name: "Type" }));
      const ids = rowIds();
      expect(ids[0]).toBe("u2");
      expect(ids.slice(1, 3).sort()).toEqual(["u1", "u5"]);
      expect(ids.slice(3).sort()).toEqual(["u3", "u4"]);
    });
  });

  describe("detail pane", () => {
    it("invites the admin to pick an account before one is selected", async () => {
      await renderLoaded();
      expect(screen.getByText("Select an account")).toBeInTheDocument();
      expect(screen.getByText("Pick an account from the list to see its details.")).toBeInTheDocument();
      expect(screen.queryByTestId("account-detail")).not.toBeInTheDocument();
    });

    it("titles the pane with the email when the account has no display name", async () => {
      await renderLoaded([account({ id: "u9", displayName: "", email: "nameless@example.com" })]);
      fireEvent.click(screen.getByTestId("account-row-u9"));
      expect(within(screen.getByRole("dialog")).getByRole("heading", { name: "nameless@example.com" })).toBeInTheDocument();
    });

    it("opens the selected account, titled with its name", async () => {
      await renderLoaded();
      fireEvent.click(screen.getByTestId("account-row-u2"));

      const pane = screen.getByRole("dialog", { name: "Account details" });
      expect(within(pane).getByRole("heading", { name: "Ana Reyes" })).toBeInTheDocument();
      expect(within(pane).getByTestId("account-detail")).toHaveTextContent("detail for u2");
      expect(screen.queryByText("Select an account")).not.toBeInTheDocument();
    });

    it("opens from a mobile card too, and swaps to another account", async () => {
      await renderLoaded();
      fireEvent.click(screen.getByTestId("account-card-u1"));
      expect(screen.getByTestId("account-detail")).toHaveTextContent("detail for u1");

      fireEvent.click(screen.getByTestId("account-row-u3"));
      expect(screen.getByTestId("account-detail")).toHaveTextContent("detail for u3");
      expect(within(screen.getByRole("dialog")).getByRole("heading", { name: "Root Admin" })).toBeInTheDocument();
    });

    it("clears the selection on Escape", async () => {
      await renderLoaded();
      fireEvent.click(screen.getByTestId("account-row-u2"));
      expect(screen.getByTestId("account-detail")).toBeInTheDocument();
      fireEvent.keyDown(window, { key: "Escape" });
      await waitFor(() => expect(screen.queryByTestId("account-detail")).not.toBeInTheDocument());
      expect(screen.getByText("Select an account")).toBeInTheDocument();
    });
  });
});
