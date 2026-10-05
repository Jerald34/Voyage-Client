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

vi.mock("../app/components/admin/AccountDetail.jsx", () => ({
  default: ({ userId }) => <div data-testid="account-detail">detail for {userId}</div>,
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

const rowIds = () =>
  screen.getAllByTestId(/^account-row-/).map((el) => el.getAttribute("data-testid").replace("account-row-", ""));

async function renderLoaded(accounts = ACCOUNTS) {
  fetchAllAccounts.mockResolvedValue({ users: accounts });
  render(<AdminAccountsPage />);
  await waitFor(() => expect(screen.queryByText("Loading accounts…")).not.toBeInTheDocument());
}

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
      expect(screen.getByText("No accounts found.")).toBeInTheDocument();
    });
  });

  describe("type filter", () => {
    it("is a labelled radio group with the four options in order", async () => {
      await renderLoaded();
      const group = screen.getByRole("radiogroup", { name: "Filter by account type" });
      const names = within(group).getAllByRole("radio").map((r) => r.textContent.replace(/\s+/g, " ").trim());
      expect(names).toEqual(["All 5", "Personal 2", "Agency 1", "Setup incomplete 2"]);
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
      expect(screen.getByText("No accounts match your search.")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
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
