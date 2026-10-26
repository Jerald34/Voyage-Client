import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app/components/admin/AdminAgenciesPage.jsx", () => ({
  default: () => <div data-testid="agencies-section">Agencies</div>
}));

// The accounts page is stubbed down to the one callback AdminPage hands it.
vi.mock("../app/components/admin/AdminAccountsPage.jsx", () => ({
  default: ({ onOpenUsage }) => (
    <div data-testid="accounts-section">
      Accounts
      <button type="button" onClick={() => onOpenUsage({ id: "u2", label: "Ana Reyes" })}>
        stub view usage
      </button>
    </div>
  ),
}));

vi.mock("../app/components/admin/usage/UsageSection.jsx", () => ({
  default: ({ initialSelection }) => (
    <div>
      Usage analytics
      {initialSelection && <span data-testid="usage-focus">{`${initialSelection.id}:${initialSelection.label}`}</span>}
    </div>
  ),
}));

vi.mock("../app/components/admin/reports/ReportsSection.jsx", () => ({
  default: () => <div>Reports inbox</div>,
}));

import AdminPage from "../app/components/admin/AdminPage.jsx";

describe("AdminPage", () => {
  it("shows Agencies by default and switches sections via sub-nav", () => {
    render(<AdminPage />);
    expect(screen.getByTestId("agencies-section")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /usage/i }));
    expect(screen.getByText(/usage analytics/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /reports/i }));
    expect(screen.getByText(/no reports yet|reports inbox/i)).toBeInTheDocument();
  });

  it("lists the sections in order: Agencies, Accounts, Usage, Reports", () => {
    render(<AdminPage />);
    const names = screen.getAllByRole("tab").map((t) => t.textContent.trim());
    expect(names).toEqual(["Agencies", "Accounts", "Usage", "Reports"]);
    expect(screen.getByRole("tab", { name: "Agencies" })).toHaveAttribute("aria-selected", "true");
  });

  it("opens the Accounts section from its tab and retitles the page", () => {
    render(<AdminPage />);
    expect(screen.queryByTestId("accounts-section")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Accounts" }));

    expect(screen.getByTestId("accounts-section")).toBeInTheDocument();
    expect(screen.queryByTestId("agencies-section")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Accounts" })).toBeInTheDocument();
  });

  it("renders the active section title in the top bar", () => {
    render(<AdminPage />);
    expect(screen.getByRole("heading", { name: "Agencies" })).toBeInTheDocument();
  });

  it("marks the section switcher for the tour", () => {
    const { container } = render(<AdminPage />);
    const marker = container.querySelector('[data-tour-target="admin-sections"]');
    expect(marker).toContainElement(screen.getByRole("tab", { name: "Agencies" }));
  });

  describe("opening Usage from an account", () => {
    const openUsageFromAccounts = () => {
      fireEvent.click(screen.getByRole("tab", { name: "Accounts" }));
      fireEvent.click(screen.getByRole("button", { name: "stub view usage" }));
    };

    it("switches to the Usage tab with that person already open", () => {
      render(<AdminPage />);
      openUsageFromAccounts();

      expect(screen.getByRole("tab", { name: "Usage" })).toHaveAttribute("aria-selected", "true");
      expect(screen.queryByTestId("accounts-section")).not.toBeInTheDocument();
      expect(screen.getByTestId("usage-focus")).toHaveTextContent("u2:Ana Reyes");
      expect(screen.getByRole("heading", { name: "Usage" })).toBeInTheDocument();
    });

    it("opens Usage plain, with no person, when the admin picks the tab by hand", () => {
      render(<AdminPage />);
      fireEvent.click(screen.getByRole("tab", { name: "Usage" }));
      expect(screen.getByText("Usage analytics")).toBeInTheDocument();
      expect(screen.queryByTestId("usage-focus")).not.toBeInTheDocument();
    });

    it("forgets the person once the admin leaves Usage by hand", () => {
      render(<AdminPage />);
      openUsageFromAccounts();
      expect(screen.getByTestId("usage-focus")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("tab", { name: "Reports" }));
      fireEvent.click(screen.getByRole("tab", { name: "Usage" }));

      expect(screen.getByText("Usage analytics")).toBeInTheDocument();
      expect(screen.queryByTestId("usage-focus")).not.toBeInTheDocument();
    });

    it("keeps the person open when the admin clicks the Usage tab they are already on", () => {
      render(<AdminPage />);
      openUsageFromAccounts();

      fireEvent.click(screen.getByRole("tab", { name: "Usage" }));

      expect(screen.getByTestId("usage-focus")).toHaveTextContent("u2:Ana Reyes");
    });
  });
});
