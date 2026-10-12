import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTourFlow } from "../app/hooks/useTourFlow.js";
import { tourStorageKey } from "../app/components/trip-dashboard/tutorial/tutorialContent.js";

const cipTourState = { hasSelectedClient: false, hasMultipleTrips: false, hasItineraryDays: false };
const owner = {
  id: "u-owner",
  displayName: "Ana",
  accountType: "AGENCY_USER",
  memberships: [{ agencyId: "a1", role: "OWNER", status: "ACTIVE" }],
};

function setup(user = owner, agencyId = "a1") {
  const setActiveTab = vi.fn();
  const setIsSidebarOpen = vi.fn();
  const hook = renderHook(() => useTourFlow({ user, agencyId, cipTourState, setActiveTab, setIsSidebarOpen }));
  return { ...hook, setActiveTab, setIsSidebarOpen };
}

beforeEach(() => {
  localStorage.clear();
});

describe("useTourFlow", () => {
  it("opens with the person's own tour when their account hasn't seen it", () => {
    const { result } = setup();
    expect(result.current.isFirstUseTutorialOpen).toBe(true);
    expect(result.current.activeTourSteps[0]).toMatchObject({ id: "welcome", tab: "dashboard" });
    expect(result.current.activeTourSteps.map((step) => step.id)).toContain("dashboard-insights");
  });

  it("stays closed when this account has seen it", () => {
    localStorage.setItem(tourStorageKey("u-owner"), "true");
    expect(setup().result.current.isFirstUseTutorialOpen).toBe(false);
  });

  it("still opens for a new account on a browser where someone else finished it", () => {
    localStorage.setItem(tourStorageKey("someone-else"), "true");
    expect(setup().result.current.isFirstUseTutorialOpen).toBe(true);
  });

  it("shows the new tour once to people who finished the old one", () => {
    localStorage.setItem("voyage-tour-completed-v2", "true");
    expect(setup().result.current.isFirstUseTutorialOpen).toBe(true);
  });

  it("waits until the account is known", () => {
    expect(setup(null, null).result.current.isFirstUseTutorialOpen).toBe(false);
  });

  it("remembers closing for this account only", () => {
    const { result } = setup();
    act(() => result.current.closeFirstUseTutorial());

    expect(result.current.isFirstUseTutorialOpen).toBe(false);
    expect(localStorage.getItem(tourStorageKey("u-owner"))).toBe("true");
    expect(localStorage.getItem(tourStorageKey("someone-else"))).toBeNull();
  });

  it("replays from the welcome card", () => {
    const { result } = setup();
    act(() => result.current.closeFirstUseTutorial());
    act(() => result.current.replayFirstUseTutorial());

    expect(result.current.isFirstUseTutorialOpen).toBe(true);
    expect(result.current.activeTourSteps[0].id).toBe("welcome");
  });

  it("moves to each step's tab and opens the sidebar for the replay step", () => {
    const { result, setActiveTab, setIsSidebarOpen } = setup();

    act(() => result.current.handleFirstUseTutorialStepChange({ tab: "dashboard", target: null }));
    const updater = setActiveTab.mock.calls[0][0];
    expect(updater("command-center")).toBe("dashboard");

    act(() => result.current.handleFirstUseTutorialStepChange({ target: "settings-replay" }));
    expect(setIsSidebarOpen).toHaveBeenCalledWith(true);
  });

  it("closes the sidebar drawer when the tour is closed", () => {
    const { result, setIsSidebarOpen } = setup();
    act(() => result.current.handleFirstUseTutorialStepChange({ target: "settings-replay" }));
    setIsSidebarOpen.mockClear();

    act(() => result.current.closeFirstUseTutorial());

    expect(setIsSidebarOpen).toHaveBeenCalledWith(false);
  });

  it("hides the sidebar on any step other than the replay step", () => {
    const { result, setIsSidebarOpen } = setup();

    act(() => result.current.handleFirstUseTutorialStepChange({ tab: "dashboard", target: "dashboard-needs-you" }));

    expect(setIsSidebarOpen).toHaveBeenLastCalledWith(false);
  });

  it("gives a personal account the Planner start", () => {
    const { result } = setup({ id: "p1", displayName: "Lee", accountType: "PERSONAL", memberships: [] }, null);
    expect(result.current.activeTourSteps[0].tab).toBe("command-center");
  });
});
