// tests/agency-overview.test.jsx
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchTeam: vi.fn(),
  listAgencyInvitations: vi.fn(),
  fetchPlanUsage: vi.fn(),
}));

vi.mock("../app/lib/api/index.js", () => ({
  fetchTeam: (...args) => mocks.fetchTeam(...args),
  listAgencyInvitations: (...args) => mocks.listAgencyInvitations(...args),
  fetchPlanUsage: (...args) => mocks.fetchPlanUsage(...args),
}));

import AgencyOverview from "../app/components/agency-admin/AgencyOverview.jsx";

const agency = { id: "agency-1", name: "Baguio Trails", status: "VERIFIED", businessPhone: "", city: "Baguio", country: "Philippines" };
const members = [
  { id: "m1", role: "OWNER", user: { displayName: "Jamie Dela Cruz", email: "jamie@example.test" } },
  { id: "m2", role: "STAFF", user: { displayName: "Ben Lim", email: "ben@example.test" } },
];

beforeEach(() => {
  mocks.fetchTeam.mockReset().mockResolvedValue({ members, viewerRole: "OWNER" });
  mocks.listAgencyInvitations.mockReset().mockResolvedValue({ invitations: [{ id: "i1" }, { id: "i2" }] });
  mocks.fetchPlanUsage.mockReset().mockResolvedValue({ usage: { itinerariesCreated: 13, agentRequests: 236, activeMembers: 2 } });
});

function renderOverview(role = "OWNER", props = {}) {
  const onOpenSection = vi.fn();
  render(<AgencyOverview agency={agency} membership={{ role, status: "ACTIVE" }} onOpenSection={onOpenSection} {...props} />);
  return { onOpenSection };
}

describe("AgencyOverview for the owner", () => {
  it("shows the status and the owner's name", async () => {
    renderOverview();
    expect(await screen.findByText("Owner: Jamie Dela Cruz")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  it("shows this month's numbers and the plan that fits", async () => {
    renderOverview();
    const tiles = await screen.findByRole("list", { name: "Agency numbers" });
    expect(within(tiles).getByText("Team members").nextSibling).toHaveTextContent("2");
    expect(within(tiles).getByText("Itineraries this month").nextSibling).toHaveTextContent("13");
    expect(within(tiles).getByText("Messages to the agent").nextSibling).toHaveTextContent("236");
    expect(within(tiles).getByText("Plan that fits").nextSibling).toHaveTextContent("Starter");
  });

  it("lists what needs attention, each opening the section that fixes it", async () => {
    const { onOpenSection } = renderOverview();
    const list = await screen.findByRole("list", { name: "Needs attention" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows.map((row) => row.firstChild.textContent)).toEqual([
      "2 invitations are still pending",
      "Agency details are missing: business phone",
      "Usage is at 87% of the Starter plan",
    ]);

    fireEvent.click(within(list).getByRole("button", { name: "Edit profile" }));
    expect(onOpenSection).toHaveBeenCalledWith("profile");
  });

  it("says so when nothing needs attention", async () => {
    mocks.listAgencyInvitations.mockResolvedValue({ invitations: [] });
    mocks.fetchPlanUsage.mockResolvedValue({ usage: { itinerariesCreated: 1, agentRequests: 3, activeMembers: 2 } });
    renderOverview("OWNER", { agency: { ...agency, businessPhone: "639001112222" } });
    expect(await screen.findByText("Nothing needs your attention right now.")).toBeInTheDocument();
  });

  it("shows an error when the team can't load", async () => {
    mocks.fetchTeam.mockRejectedValue(new Error("offline"));
    renderOverview();
    expect(await screen.findByText("Couldn't load your agency overview. Try again later.")).toBeInTheDocument();
  });
});

describe("AgencyOverview for an admin", () => {
  it("skips the owner-only usage and details rows", async () => {
    renderOverview("ADMIN");
    const tiles = await screen.findByRole("list", { name: "Agency numbers" });
    expect(mocks.fetchPlanUsage).not.toHaveBeenCalled();
    expect(within(tiles).getByText("Pending invitations").nextSibling).toHaveTextContent("2");
    expect(within(tiles).queryByText("Plan that fits")).not.toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Needs attention" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
  });
});
