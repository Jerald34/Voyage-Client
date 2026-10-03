import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app/components/team/TeamPage.jsx", () => ({ default: () => null }));
vi.mock("../app/lib/api/support.js", () => ({ createProblemReport: vi.fn() }));

import SettingsPage from "../app/components/trip-dashboard/pages/SettingsPage.jsx";

function renderSettings({ userStatus, agencyStatus }) {
  return render(
    <SettingsPage
      user={{ id: "u1", displayName: "Maria", email: "maria@example.test", accountType: "AGENCY_USER", status: userStatus }}
      agency={{ id: "agency-1", name: "Sunline Travel", status: agencyStatus }}
      membership={{ role: "STAFF", status: "ACTIVE" }}
      logout={vi.fn()}
      onUpdateProfile={vi.fn()}
      onUpdateAgency={vi.fn()}
      onReplayTutorial={vi.fn()}
    />,
  );
}

/** Each status pill sits just before its label. */
const pillFor = (label) => screen.getByText(label).previousElementSibling;

/** Dark-only Tailwind palette classes that wash out on a light surface. */
const DARK_ONLY = /(^|\s)(text|bg|border)-(emerald|amber|slate|red)-\d+|(^|\s)border-white\//;

describe("Settings status pills", () => {
  it.each([
    ["ACTIVE", "VERIFIED", ["bg-status-success/8", "text-status-success", "border-status-success/30"]],
    ["PENDING", "INVITED", ["bg-status-warning/8", "text-status-warning", "border-status-warning/30"]],
    ["SUSPENDED", "REJECTED", ["bg-text-primary/5", "text-text-muted", "border-border/20"]],
  ])("colour %s / %s with theme tokens", (userStatus, agencyStatus, classes) => {
    renderSettings({ userStatus, agencyStatus });

    for (const label of ["Account status", "Agency status"]) {
      const pill = pillFor(label);
      for (const name of classes) expect(pill.className, `${label}: ${name}`).toContain(name);
      expect(pill.className, label).not.toMatch(DARK_ONLY);
    }
  });
});
