// tests/agency-admin-page.test.jsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app/components/agency-admin/AgencyOverview.jsx", () => ({
  default: ({ onOpenSection }) => (
    <button type="button" onClick={() => onOpenSection("profile")}>overview-stub</button>
  ),
}));
vi.mock("../app/components/team/TeamPage.jsx", () => ({
  default: ({ agencyId, embedded }) => <div data-testid="team-page" data-agency={agencyId} data-embedded={String(embedded)} />,
}));
vi.mock("../app/components/settings/PlanUsageCard.jsx", () => ({
  default: ({ agencyId }) => <div data-testid="plan-usage" data-agency={agencyId} />,
}));
vi.mock("../app/components/settings/DangerZoneCard.jsx", () => ({
  default: ({ agencyName }) => <div data-testid="danger-zone" data-name={agencyName} />,
}));
vi.mock("../app/components/settings/AgencyDetailsForm.jsx", () => ({
  default: ({ membership }) => <div data-testid="details-form" data-role={membership.role} />,
}));

import AgencyAdminPage from "../app/components/agency-admin/AgencyAdminPage.jsx";

const agency = { id: "agency-1", name: "Baguio Trails" };

function renderPage(role = "OWNER", props = {}) {
  return render(
    <AgencyAdminPage agency={agency} membership={{ role, status: "ACTIVE" }} onUpdateAgency={vi.fn()} {...props} />,
  );
}

describe("AgencyAdminPage", () => {
  it("titles the page with the agency name and opens on Overview", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Baguio Trails" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "overview-stub" })).toBeInTheDocument();
  });

  it("gives owners all four sections", () => {
    renderPage("OWNER");
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Overview", "Team", "Profile", "Plan and usage"]);
  });

  it("hides Plan and usage from admins", () => {
    renderPage("ADMIN");
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Overview", "Team", "Profile"]);
  });

  it("shows the embedded team list under Team", () => {
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "Team" }));
    expect(screen.getByTestId("team-page")).toHaveAttribute("data-embedded", "true");
    expect(screen.getByTestId("team-page")).toHaveAttribute("data-agency", "agency-1");
  });

  it("shows the details form and the owner's danger zone under Profile", () => {
    renderPage("OWNER");
    fireEvent.click(screen.getByRole("tab", { name: "Profile" }));
    expect(screen.getByTestId("details-form")).toHaveAttribute("data-role", "OWNER");
    expect(screen.getByTestId("danger-zone")).toHaveAttribute("data-name", "Baguio Trails");
  });

  it("keeps the danger zone from admins", () => {
    renderPage("ADMIN");
    fireEvent.click(screen.getByRole("tab", { name: "Profile" }));
    expect(screen.getByTestId("details-form")).toBeInTheDocument();
    expect(screen.queryByTestId("danger-zone")).not.toBeInTheDocument();
  });

  it("shows plan usage under Plan and usage", () => {
    renderPage("OWNER");
    fireEvent.click(screen.getByRole("tab", { name: "Plan and usage" }));
    expect(screen.getByTestId("plan-usage")).toHaveAttribute("data-agency", "agency-1");
  });

  it("follows the overview's links to a section", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "overview-stub" }));
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute("aria-selected", "true");
  });

  it("moves focus to the section panel when the overview opens a section", () => {
    renderPage();
    const link = screen.getByRole("button", { name: "overview-stub" });
    link.focus();
    fireEvent.click(link);
    const panel = screen.getByRole("tabpanel", { name: "Profile" });
    expect(panel).toHaveAttribute("tabindex", "-1");
    expect(panel).toHaveFocus();
  });

  it("keeps focus on the tab when a tab is clicked", () => {
    renderPage();
    const tab = screen.getByRole("tab", { name: "Team" });
    tab.focus();
    fireEvent.click(tab);
    expect(tab).toHaveFocus();
  });

  it("keeps focus on the tab for a tab click after the overview opened a section", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "overview-stub" }));
    const tab = screen.getByRole("tab", { name: "Team" });
    tab.focus();
    fireEvent.click(tab);
    expect(tab).toHaveFocus();
  });

  it("does not steal focus on first render", () => {
    renderPage();
    expect(screen.getByRole("tabpanel")).not.toHaveFocus();
  });

  it("opens the initial section once and reports it handled", () => {
    const onInitialSectionHandled = vi.fn();
    renderPage("OWNER", { initialSection: "team", onInitialSectionHandled });
    expect(screen.getByRole("tab", { name: "Team" })).toHaveAttribute("aria-selected", "true");
    expect(onInitialSectionHandled).toHaveBeenCalledOnce();
  });

  it("falls back to Overview for a section the viewer can't open", () => {
    renderPage("ADMIN", { initialSection: "plan" });
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  });

  it("scrolls itself, since <main> doesn't on phones", () => {
    renderPage();
    expect(screen.getByTestId("agency-admin-page")).toHaveClass("overflow-y-auto");
  });
});
