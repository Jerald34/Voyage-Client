import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app/components/team/TeamPage.jsx", () => ({ default: () => null }));
vi.mock("../app/components/settings/DangerZoneCard.jsx", () => ({ default: () => null }));
vi.mock("../app/components/settings/PlanUsageCard.jsx", () => ({
  default: ({ agencyId }) => <div data-testid="plan-usage" data-agency={agencyId} />,
}));
vi.mock("../app/lib/api/support.js", () => ({ createProblemReport: vi.fn() }));

import SettingsPage from "../app/components/trip-dashboard/pages/SettingsPage.jsx";

const agency = { id: "agency-1", name: "Sunline Travel", status: "VERIFIED" };

function renderSettings(role, user = { id: "u1", displayName: "Maria", accountType: "AGENCY_USER" }, status = "ACTIVE") {
  return render(
    <SettingsPage
      user={user}
      agency={role ? agency : null}
      membership={role ? { role, status } : null}
      logout={vi.fn()}
      onUpdateProfile={vi.fn()}
      onUpdateAgency={vi.fn()}
      onReplayTutorial={vi.fn()}
    />,
  );
}

describe("Settings plan card", () => {
  it("shows Plan and usage to the owner", () => {
    renderSettings("OWNER");
    expect(screen.getByRole("heading", { name: "Plan and usage" })).toBeInTheDocument();
    expect(screen.getByTestId("plan-usage")).toHaveAttribute("data-agency", "agency-1");
  });

  it("sits below the Team section, so the card growing after its fetch can't push Team down", () => {
    renderSettings("OWNER");
    const team = screen.getByRole("region", { name: "Team" });
    const plan = screen.getByRole("heading", { name: "Plan and usage" });
    expect(team.compareDocumentPosition(plan) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("hides it from an owner whose membership isn't active", () => {
    renderSettings("OWNER", undefined, "PENDING");
    expect(screen.queryByRole("heading", { name: "Plan and usage" })).not.toBeInTheDocument();
  });

  it.each(["ADMIN", "STAFF"])("hides it from %s members", (role) => {
    renderSettings(role);
    expect(screen.queryByRole("heading", { name: "Plan and usage" })).not.toBeInTheDocument();
  });

  it("hides it from personal accounts", () => {
    renderSettings(null, { id: "p1", displayName: "Lee", accountType: "PERSONAL" });
    expect(screen.queryByRole("heading", { name: "Plan and usage" })).not.toBeInTheDocument();
  });
});

describe("Settings system requirements", () => {
  it.each([
    ["an agency member", "STAFF", { id: "u1", displayName: "Maria", accountType: "AGENCY_USER" }],
    ["a personal account", null, { id: "p1", displayName: "Lee", accountType: "PERSONAL" }],
  ])("lists the minimum and recommended setup for %s", (_who, role, user) => {
    renderSettings(role, user);

    expect(screen.getByRole("heading", { name: "System requirements" })).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "System requirements" });
    expect(table).toHaveTextContent("Chrome or Edge 111, Safari 16.4, Firefox 128");
    expect(screen.getAllByRole("row")).toHaveLength(6); // header + 5 rows
  });
});
