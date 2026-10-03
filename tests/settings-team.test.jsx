import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../app/components/team/TeamPage.jsx", () => ({
  default: ({ agencyId, embedded }) => (
    <div data-testid="team-page" data-agency={agencyId} data-embedded={String(embedded)} />
  ),
}));
vi.mock("../app/lib/api/support.js", () => ({ createProblemReport: vi.fn() }));

import SettingsPage from "../app/components/trip-dashboard/pages/SettingsPage.jsx";

const agencyMember = { id: "u1", displayName: "Maria", email: "maria@example.test", accountType: "AGENCY_USER" };
const agency = { id: "agency-1", name: "Sunline Travel", status: "VERIFIED" };

function renderSettings(props = {}) {
  return render(
    <SettingsPage
      user={agencyMember}
      agency={agency}
      membership={{ role: "STAFF", status: "ACTIVE" }}
      logout={vi.fn()}
      onUpdateProfile={vi.fn()}
      onUpdateAgency={vi.fn()}
      onReplayTutorial={vi.fn()}
      {...props}
    />,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Settings Team panel", () => {
  it("shows the agency team inside Settings for every member", () => {
    renderSettings();

    const team = screen.getByRole("region", { name: "Team" });
    expect(team).toContainElement(screen.getByTestId("team-page"));
    expect(screen.getByTestId("team-page")).toHaveAttribute("data-agency", "agency-1");
    expect(screen.getByTestId("team-page")).toHaveAttribute("data-embedded", "true");
  });

  it("has no Team panel for personal accounts", () => {
    renderSettings({ user: { id: "u2", displayName: "Pat", accountType: "PERSONAL" }, agency: null, membership: null });

    expect(screen.queryByRole("region", { name: "Team" })).not.toBeInTheDocument();
  });

  it("scrolls to the Team panel once when a team link opened Settings", () => {
    const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
    const onFocusSectionHandled = vi.fn();

    renderSettings({ focusSection: "team", onFocusSectionHandled });

    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(onFocusSectionHandled).toHaveBeenCalledOnce();
  });
});
