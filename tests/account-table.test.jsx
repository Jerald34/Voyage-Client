import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// icons/index.js is JSX-in-.js and can't be parsed by Vite — mock it (established convention)
vi.mock("../app/components/icons/index.js", () => ({
  SortIcon: ({ active, direction, ...props }) => <svg data-testid="sort-icon" {...props} />,
}));

import AccountTable from "../app/components/admin/AccountTable.jsx";

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

const personal = account();
const agencyOwner = account({
  id: "u2",
  email: "ana@alpha.com",
  displayName: "Ana Reyes",
  accountType: "AGENCY_USER",
  createdAt: "2026-04-10T12:00:00.000Z",
  memberships: [membership(), membership({ agencyId: "ag2", agencyName: "Beta Tours", role: "STAFF" })],
});
const staffMember = account({
  id: "u5",
  email: "sam@alpha.com",
  displayName: "Sam Cruz",
  accountType: "AGENCY_USER",
  memberships: [membership({ role: "STAFF" })],
});
const superAdmin = account({
  id: "u3",
  email: "root@voyage.dev",
  displayName: "Root Admin",
  role: "SUPER_ADMIN",
  accountType: "PENDING",
  emailVerified: false,
  createdAt: "2026-03-02T12:00:00.000Z",
});
const disabled = account({
  id: "u4",
  email: "gone@example.com",
  displayName: "Gus Gone",
  status: "DISABLED",
});

const everyone = [personal, agencyOwner, staffMember, superAdmin, disabled];

function renderTable(props = {}) {
  const onRowClick = props.onRowClick ?? vi.fn();
  const onSort = props.onSort ?? vi.fn();
  render(
    <AccountTable
      accounts={props.accounts ?? everyone}
      sorted={props.sorted ?? everyone}
      sortField={props.sortField ?? "joined"}
      sortDir={props.sortDir ?? "desc"}
      onSort={onSort}
      selectedAccountId={props.selectedAccountId ?? null}
      onRowClick={onRowClick}
    />
  );
  return { onRowClick, onSort };
}

const row = (id) => screen.getByTestId(`account-row-${id}`);

describe("AccountTable", () => {
  it("renders a desktop table and a mobile card list for every account", () => {
    renderTable();
    expect(screen.getByRole("table")).toBeInTheDocument();
    for (const a of everyone) {
      expect(screen.getByTestId(`account-row-${a.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`account-card-${a.id}`)).toBeInTheDocument();
    }
  });

  it("names the five columns", () => {
    renderTable();
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent.trim());
    expect(headers).toEqual(["Name", "Type", "Agency", "Status", "Joined"]);
  });

  describe("name cell", () => {
    it("shows the display name with the email beneath it", () => {
      renderTable();
      const r = within(row("u1"));
      expect(r.getByText("Pia Santos")).toBeInTheDocument();
      expect(r.getByText("pia@example.com")).toBeInTheDocument();
    });
  });

  describe("type cell", () => {
    it("labels each account type", () => {
      renderTable();
      expect(within(row("u1")).getByText("Personal")).toBeInTheDocument();
      expect(within(row("u2")).getByText("Agency")).toBeInTheDocument();
      expect(within(row("u3")).getByText("Setup incomplete")).toBeInTheDocument();
    });

    it("adds a Super admin chip only for super admins", () => {
      renderTable();
      expect(within(row("u3")).getByText("Super admin")).toBeInTheDocument();
      expect(within(row("u1")).queryByText("Super admin")).not.toBeInTheDocument();
    });
  });

  describe("agency cell", () => {
    it("shows the first agency with the member's role beneath it", () => {
      renderTable();
      const r = within(row("u5"));
      expect(r.getByText("Alpha Travel")).toBeInTheDocument();
      expect(r.getByText("Staff")).toBeInTheDocument();
      expect(r.queryByText(/more/)).not.toBeInTheDocument();
    });

    it("says how many more agencies the account belongs to", () => {
      renderTable();
      const r = within(row("u2"));
      expect(r.getByText("Alpha Travel")).toBeInTheDocument();
      expect(r.getByText("Owner")).toBeInTheDocument();
      expect(r.getByText("+1 more")).toBeInTheDocument();
      expect(r.queryByText("Beta Tours")).not.toBeInTheDocument();
    });

    it("shows a dash when the account belongs to no agency", () => {
      renderTable();
      expect(within(row("u1")).getByText("—")).toBeInTheDocument();
    });
  });

  describe("status cell", () => {
    it("shows Active or Disabled", () => {
      renderTable();
      expect(within(row("u1")).getByText("Active")).toBeInTheDocument();
      expect(within(row("u4")).getByText("Disabled")).toBeInTheDocument();
    });

    it("notes an unverified email, and only then", () => {
      renderTable();
      expect(within(row("u3")).getByText("Email not verified")).toBeInTheDocument();
      expect(within(row("u1")).queryByText("Email not verified")).not.toBeInTheDocument();
    });
  });

  it("formats the joined date", () => {
    renderTable();
    expect(within(row("u1")).getByText("May 1, 2026")).toBeInTheDocument();
  });

  describe("mobile cards", () => {
    it("carry the same facts as the table row", () => {
      renderTable();
      const c = within(screen.getByTestId("account-card-u2"));
      expect(c.getByText("Ana Reyes")).toBeInTheDocument();
      expect(c.getByText("ana@alpha.com")).toBeInTheDocument();
      expect(c.getByText("Agency")).toBeInTheDocument();
      expect(c.getByText("Active")).toBeInTheDocument();
      expect(c.getByText(/Alpha Travel/)).toBeInTheDocument();
      expect(c.getByText("+1 more")).toBeInTheDocument();
      expect(c.getByText(/Apr 10, 2026/)).toBeInTheDocument();
    });

    it("flag a Super admin and an unverified email", () => {
      renderTable();
      const c = within(screen.getByTestId("account-card-u3"));
      expect(c.getByText("Super admin")).toBeInTheDocument();
      expect(c.getByText("Email not verified")).toBeInTheDocument();
    });

    it("say so when the account has no agency", () => {
      renderTable();
      expect(within(screen.getByTestId("account-card-u1")).getByText("No agency")).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("calls onRowClick with the id when a row is clicked", () => {
      const { onRowClick } = renderTable();
      fireEvent.click(row("u1"));
      expect(onRowClick).toHaveBeenCalledTimes(1);
      expect(onRowClick).toHaveBeenCalledWith("u1");
    });

    it("calls onRowClick with the id when a card is clicked", () => {
      const { onRowClick } = renderTable();
      fireEvent.click(screen.getByTestId("account-card-u1"));
      expect(onRowClick).toHaveBeenCalledTimes(1);
      expect(onRowClick).toHaveBeenCalledWith("u1");
    });

    it("lets keyboard users open an account through the name button, once", () => {
      const { onRowClick } = renderTable();
      const nameButton = within(row("u2")).getByRole("button", { name: "Ana Reyes" });
      fireEvent.click(nameButton); // Enter/Space on a button fire a click that bubbles to the row
      expect(onRowClick).toHaveBeenCalledTimes(1);
      expect(onRowClick).toHaveBeenCalledWith("u2");
    });

    it("marks the selected row and card as current", () => {
      renderTable({ selectedAccountId: "u2" });
      expect(within(row("u2")).getByRole("button", { name: "Ana Reyes" })).toHaveAttribute("aria-current", "true");
      expect(screen.getByTestId("account-card-u2")).toHaveAttribute("aria-current", "true");
      expect(within(row("u1")).getByRole("button", { name: "Pia Santos" })).not.toHaveAttribute("aria-current");
      expect(screen.getByTestId("account-card-u1")).not.toHaveAttribute("aria-current");
    });
  });

  describe("sorting", () => {
    it("sorts by Name, Type and Joined from keyboard-reachable header buttons", () => {
      const { onSort } = renderTable();
      fireEvent.click(screen.getByRole("button", { name: "Name" }));
      fireEvent.click(screen.getByRole("button", { name: "Type" }));
      fireEvent.click(screen.getByRole("button", { name: "Joined" }));
      expect(onSort.mock.calls.map((c) => c[0])).toEqual(["name", "type", "joined"]);
    });

    it("does not offer sorting on Agency or Status", () => {
      renderTable();
      expect(screen.queryByRole("button", { name: "Agency" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Status" })).not.toBeInTheDocument();
    });

    it("announces the active sort column and direction", () => {
      renderTable({ sortField: "joined", sortDir: "desc" });
      expect(screen.getByRole("columnheader", { name: "Joined" })).toHaveAttribute("aria-sort", "descending");
      expect(screen.getByRole("columnheader", { name: "Name" })).not.toHaveAttribute("aria-sort");
    });

    it("announces an ascending sort", () => {
      renderTable({ sortField: "name", sortDir: "asc" });
      expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute("aria-sort", "ascending");
    });
  });

  it("states how many of the accounts are showing", () => {
    renderTable({ accounts: everyone, sorted: [personal, superAdmin] });
    // one footer in the card list, one under the table
    expect(screen.getAllByText("Showing 2 of 5 accounts")).toHaveLength(2);
  });

  it("respects reduced motion on pressable cards", () => {
    renderTable();
    const card = screen.getByTestId("account-card-u1");
    expect(card.className).toContain("active:scale-[0.99]");
    expect(card.className).toContain("motion-reduce:transition-none");
  });
});
