import { describe, expect, it } from "vitest";
import { resolveInitialView, resolveVisibleTab } from "../app/lib/deepLinks.js";

const view = (query) => resolveInitialView(new URLSearchParams(query));

describe("resolveInitialView", () => {
  it("opens the Planner by default", () => {
    expect(view("authenticated=1")).toEqual({ initialTab: "command-center", showJoinedNotice: false, settingsSection: null });
  });

  it("opens the Dashboard with the joined notice after an invite is accepted", () => {
    expect(view("authenticated=1&tab=team&invited=1")).toEqual({
      initialTab: "dashboard",
      showJoinedNotice: true,
      settingsSection: null,
    });
  });

  it("opens the Planner, with no notice, for an unknown tab", () => {
    expect(view("authenticated=1&tab=nonsense")).toEqual({ initialTab: "command-center", showJoinedNotice: false, settingsSection: null });
    expect(view("authenticated=1&tab=nonsense&invited=1")).toEqual({
      initialTab: "command-center",
      showJoinedNotice: false,
      settingsSection: null,
    });
  });

  it("ignores invited=1 without tab=team", () => {
    expect(view("authenticated=1&invited=1")).toEqual({ initialTab: "command-center", showJoinedNotice: false, settingsSection: null });
  });

  it("opens the Agency tab at Team for a plain team link (managers; others fall back to Settings)", () => {
    expect(view("authenticated=1&tab=team")).toEqual({ initialTab: "agency", showJoinedNotice: false, settingsSection: "team" });
  });

  it("opens the Agency tab for tab=agency", () => {
    expect(view("authenticated=1&tab=agency")).toEqual({ initialTab: "agency", showJoinedNotice: false, settingsSection: null });
  });
});

describe("admin links", () => {
  it("opens the Admin tab for tab=admin (the new-agency alert email)", () => {
    expect(view("authenticated=1&tab=admin")).toEqual({ initialTab: "admin", showJoinedNotice: false, settingsSection: null });
  });
});

describe("resolveVisibleTab", () => {
  const admin = { role: "SUPER_ADMIN" };
  const member = { role: "USER" };

  it("shows the Admin tab to super admins only", () => {
    expect(resolveVisibleTab({ activeTab: "admin", user: admin, isPersonal: false, agencyId: "a1" })).toBe("admin");
    expect(resolveVisibleTab({ activeTab: "admin", user: member, isPersonal: false, agencyId: "a1" })).toBe("command-center");
    expect(resolveVisibleTab({ activeTab: "admin", user: admin, isPersonal: true, agencyId: null })).toBe("admin");
    expect(resolveVisibleTab({ activeTab: "settings", user: member, isPersonal: false, agencyId: "a1" })).toBe("settings");
  });

  it("sends users without an agency workspace from the dashboard to the Planner", () => {
    expect(resolveVisibleTab({ activeTab: "dashboard", user: member, isPersonal: true, agencyId: null })).toBe("command-center");
    expect(resolveVisibleTab({ activeTab: "dashboard", user: member, isPersonal: false, agencyId: null })).toBe("command-center");
    expect(resolveVisibleTab({ activeTab: "dashboard", user: member, isPersonal: false, agencyId: "a1" })).toBe("dashboard");
  });

  it("keeps the requested tab until the user has loaded", () => {
    expect(resolveVisibleTab({ activeTab: "admin", user: null, isPersonal: false, agencyId: null })).toBe("admin");
  });

  it("shows the Agency tab to active owners and admins only, else Settings", () => {
    const owner = { role: "OWNER", status: "ACTIVE" };
    const args = { activeTab: "agency", user: member, isPersonal: false, agencyId: "a1" };
    expect(resolveVisibleTab({ ...args, membership: owner })).toBe("agency");
    expect(resolveVisibleTab({ ...args, membership: { role: "ADMIN", status: "ACTIVE" } })).toBe("agency");
    expect(resolveVisibleTab({ ...args, membership: { role: "STAFF", status: "ACTIVE" } })).toBe("settings");
    expect(resolveVisibleTab({ ...args, membership: { role: "OWNER", status: "PENDING" } })).toBe("settings");
    expect(resolveVisibleTab({ ...args, membership: null })).toBe("settings");
    expect(resolveVisibleTab({ ...args, isPersonal: true, agencyId: null, membership: owner })).toBe("settings");
  });
});
