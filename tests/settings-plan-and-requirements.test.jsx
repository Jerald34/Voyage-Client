import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CLIENT_REQUIREMENTS } from "../app/lib/systemRequirements.js";

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
  it.each(["OWNER", "ADMIN", "STAFF"])("is no longer in Settings for %s members (it lives in the Agency tab)", (role) => {
    renderSettings(role);
    expect(screen.queryByRole("heading", { name: "Plan and usage" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("plan-usage")).not.toBeInTheDocument();
  });

  it("is not shown to personal accounts", () => {
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
    expect(within(table).getAllByRole("row")).toHaveLength(CLIENT_REQUIREMENTS.length + 1);
  });
});
