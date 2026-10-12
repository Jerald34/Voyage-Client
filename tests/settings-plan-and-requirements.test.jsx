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

function renderSettings(role, user = { id: "u1", displayName: "Maria", accountType: "AGENCY_USER" }) {
  return render(
    <SettingsPage
      user={user}
      agency={role ? agency : null}
      membership={role ? { role, status: "ACTIVE" } : null}
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

  it.each(["ADMIN", "STAFF"])("hides it from %s members", (role) => {
    renderSettings(role);
    expect(screen.queryByRole("heading", { name: "Plan and usage" })).not.toBeInTheDocument();
  });

  it("hides it from personal accounts", () => {
    renderSettings(null, { id: "p1", displayName: "Lee", accountType: "PERSONAL" });
    expect(screen.queryByRole("heading", { name: "Plan and usage" })).not.toBeInTheDocument();
  });
});
