import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app/components/admin/AdminAgenciesPage.jsx", () => ({
  default: () => <div data-testid="agencies-section">Agencies</div>
}));

vi.mock("../app/components/admin/usage/UsageSection.jsx", () => ({
  default: () => <div>Usage analytics</div>,
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

  it("renders the active section title in the top bar", () => {
    render(<AdminPage />);
    expect(screen.getByRole("heading", { name: "Agencies" })).toBeInTheDocument();
  });
});
