import { describe, expect, it } from "vitest";
import { buildTourSteps, tourStorageKey } from "../app/components/trip-dashboard/tutorial/tutorialContent.js";

const member = (role, extra = {}) => ({
  id: "u1",
  displayName: "Ana Cruz",
  accountType: "AGENCY_USER",
  memberships: [{ agencyId: "a1", role, status: "ACTIVE" }],
  ...extra,
});
const personal = { id: "p1", displayName: "Lee", accountType: "PERSONAL", memberships: [] };
const ids = (steps) => steps.map((step) => step.id);

describe("buildTourSteps", () => {
  it("opens with a centred welcome card that names the person and lists their sections", () => {
    const [welcome] = buildTourSteps({ user: member("OWNER"), agencyId: "a1" });

    expect(welcome).toMatchObject({
      id: "welcome",
      target: null,
      centered: true,
      tab: "dashboard",
      title: "Welcome to Voyage, Ana",
      nextLabel: "Start tour",
    });
    expect(welcome.chips).toEqual(["Dashboard", "Planner", "Itineraries", "Settings"]);
  });

  it("falls back to a plain welcome when there is no name", () => {
    const [welcome] = buildTourSteps({ user: member("OWNER", { displayName: "  " }), agencyId: "a1" });
    expect(welcome.title).toBe("Welcome to Voyage");
  });

  it("shows owners Insights and staff My work, after Needs you and the calendar", () => {
    const owner = ids(buildTourSteps({ user: member("OWNER"), agencyId: "a1" }));
    const staff = ids(buildTourSteps({ user: member("STAFF"), agencyId: "a1" }));

    expect(owner.slice(0, 4)).toEqual(["welcome", "dashboard-needs-you", "dashboard-calendar", "dashboard-insights"]);
    expect(owner).not.toContain("dashboard-my-work");
    expect(staff.slice(0, 4)).toEqual(["welcome", "dashboard-needs-you", "dashboard-calendar", "dashboard-my-work"]);
    expect(staff).not.toContain("dashboard-insights");
  });

  it("picks the role from the membership of the current agency, not the first one", () => {
    const user = member("OWNER", {
      memberships: [
        { agencyId: "a2", role: "STAFF", status: "ACTIVE" },
        { agencyId: "a1", role: "OWNER", status: "ACTIVE" },
      ],
    });

    const inA1 = ids(buildTourSteps({ user, agencyId: "a1" }));
    const inA2 = ids(buildTourSteps({ user, agencyId: "a2" }));

    expect(inA1).toContain("dashboard-insights");
    expect(inA1).not.toContain("dashboard-my-work");
    expect(inA2).toContain("dashboard-my-work");
    expect(inA2).not.toContain("dashboard-insights");
  });

  it("treats an agency admin like the owner", () => {
    expect(ids(buildTourSteps({ user: member("ADMIN"), agencyId: "a1" }))).toContain("dashboard-insights");
  });

  it("gives personal accounts no Dashboard, starts them on the Planner and names their settings page", () => {
    const steps = buildTourSteps({ user: personal, agencyId: null });

    expect(steps[0].tab).toBe("command-center");
    expect(steps.some((step) => step.section === "Dashboard")).toBe(false);
    expect(steps[0].chips).toEqual(["Planner", "Itineraries", "My account"]);
    expect(steps.at(-1).title).toBe("Replay the tour from My account");
  });

  it("adds the Admin step only for super admins", () => {
    const admin = buildTourSteps({ user: member("OWNER", { role: "SUPER_ADMIN" }), agencyId: "a1" });
    const owner = buildTourSteps({ user: member("OWNER"), agencyId: "a1" });

    expect(ids(admin)).toContain("admin-sections");
    expect(admin[0].chips).toEqual(["Dashboard", "Planner", "Itineraries", "Admin", "Settings"]);
    expect(ids(owner)).not.toContain("admin-sections");
  });

  it("has 14 steps for agency members, 11 for personal accounts and 12 for a super admin without an agency", () => {
    expect(buildTourSteps({ user: member("OWNER"), agencyId: "a1" })).toHaveLength(14);
    expect(buildTourSteps({ user: member("STAFF"), agencyId: "a1" })).toHaveLength(14);
    expect(buildTourSteps({ user: personal, agencyId: null })).toHaveLength(11);
    expect(
      buildTourSteps({ user: { id: "s1", displayName: "Root", role: "SUPER_ADMIN", memberships: [] }, agencyId: null }),
    ).toHaveLength(12);
  });

  it("gives every step after the welcome card a target and bullets", () => {
    const steps = buildTourSteps({ user: member("OWNER", { role: "SUPER_ADMIN" }), agencyId: "a1" });
    for (const step of steps.slice(1)) {
      expect(typeof step.target).toBe("string");
      expect(step.bullets.length).toBeGreaterThan(0);
    }
  });

  it("never says Command Center", () => {
    const steps = buildTourSteps({ user: member("OWNER", { role: "SUPER_ADMIN" }), agencyId: "a1" });
    expect(JSON.stringify(steps)).not.toMatch(/command center/i);
  });

  it("builds a generic tour when nothing is known yet", () => {
    const steps = buildTourSteps();
    expect(steps[0].title).toBe("Welcome to Voyage");
    expect(steps[0].tab).toBe("command-center");
  });

  it("treats a null argument like no argument", () => {
    expect(buildTourSteps(null)[0].title).toBe("Welcome to Voyage");
  });
});

describe("tourStorageKey", () => {
  it("scopes the flag to the account", () => {
    expect(tourStorageKey("u1")).toBe("voyage-tour-completed-v3:u1");
    expect(tourStorageKey(null)).toBe("voyage-tour-completed-v3:anonymous");
  });
});
