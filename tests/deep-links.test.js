import { describe, expect, it } from "vitest";
import { resolveInitialView, resolveVisibleTab } from "../app/lib/deepLinks.js";

const view = (query) => resolveInitialView(new URLSearchParams(query));

describe("resolveInitialView", () => {
  it("opens the Command Center by default", () => {
    expect(view("authenticated=1")).toEqual({ initialTab: "command-center", showJoinedNotice: false, settingsSection: null });
  });

  it("opens the Dashboard with the joined notice after an invite is accepted", () => {
    expect(view("authenticated=1&tab=team&invited=1")).toEqual({
      initialTab: "dashboard",
      showJoinedNotice: true,
      settingsSection: null,
    });
  });

  it("opens the Command Center, with no notice, for an unknown tab", () => {
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

  it("opens Settings at the Team panel for a plain team link", () => {
    expect(view("authenticated=1&tab=team")).toEqual({ initialTab: "settings", showJoinedNotice: false, settingsSection: "team" });
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
  });

  it("sends users without an agency workspace from the dashboard to the Command Center", () => {
    expect(resolveVisibleTab({ activeTab: "dashboard", user: member, isPersonal: true, agencyId: null })).toBe("command-center");
    expect(resolveVisibleTab({ activeTab: "dashboard", user: member, isPersonal: false, agencyId: null })).toBe("command-center");
    expect(resolveVisibleTab({ activeTab: "dashboard", user: member, isPersonal: false, agencyId: "a1" })).toBe("dashboard");
  });

  it("keeps the requested tab until the user has loaded", () => {
    expect(resolveVisibleTab({ activeTab: "admin", user: null, isPersonal: false, agencyId: null })).toBe("admin");
  });
});
