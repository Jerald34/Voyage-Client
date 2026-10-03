import { describe, expect, it } from "vitest";
import { resolveInitialView } from "../app/lib/deepLinks.js";

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

  it("opens Settings at the Team panel for a plain team link", () => {
    expect(view("authenticated=1&tab=team")).toEqual({ initialTab: "settings", showJoinedNotice: false, settingsSection: "team" });
  });
});
