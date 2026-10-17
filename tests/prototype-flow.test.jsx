import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Page from "../app/page.jsx";

const mockNavigationState = {
  authenticated: null,
  routerPush: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockNavigationState.routerPush,
  }),
  useSearchParams: () => ({
    get: (key) => (key === "authenticated" ? mockNavigationState.authenticated : null),
  }),
}));

function getHeroStartPlanningButton() {
  return screen.getByRole("button", { name: "Start planning" });
}

async function renderAuthenticatedPage() {
  mockNavigationState.authenticated = "1";
  window.localStorage.setItem("voyage-user", JSON.stringify({ id: "user-1" }));
  render(<Page />);
  await screen.findByRole("button", { name: "New Itinerary" });
}

beforeEach(() => {
  mockNavigationState.authenticated = null;
  mockNavigationState.routerPush.mockReset();
  window.localStorage.clear();
});

describe("prototype entry points", () => {
  it("routes the landing CTA to login and then completes the authenticated handoff through share", async () => {
    const landingPage = render(<Page />);

    fireEvent.click(getHeroStartPlanningButton());
    expect(mockNavigationState.routerPush).toHaveBeenCalledWith("/login");

    landingPage.unmount();
    await renderAuthenticatedPage();

    fireEvent.click(screen.getByRole("button", { name: "Run Agency Review" }));
    fireEvent.click(screen.getByRole("button", { name: "Enter Workspace" }));
    fireEvent.click(screen.getByRole("tab", { name: "Share" }));
    fireEvent.click(screen.getByRole("button", { name: "Review & Export" }));

    expect(screen.getByRole("heading", { name: "The Grand Tour" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm Voyage" }));

    expect(screen.getByRole("heading", { name: "Share your Voyage" })).toBeInTheDocument();
  }, 10000);

  it("moves from the authenticated handoff into the workspace tabs without using the old guest screen", async () => {
    await renderAuthenticatedPage();

    await waitFor(() => {
      expect(screen.queryByText("Continue your journey")).not.toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "New Itinerary" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No client trips available" })).toBeInTheDocument();
    // expect(screen.getByText("Live Itinerary")).toBeInTheDocument(); - DISABLED

    fireEvent.click(screen.getByRole("button", { name: "Run Agency Review" }));

    expect(screen.getByRole("heading", { name: "Your copilot is ready." })).toBeInTheDocument();
    expect(screen.getByText(/The Voyage Agent has processed your brief/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Enter Workspace" }));

    expect(screen.getByRole("tab", { name: "Trip", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Workspace sections" })).toBeInTheDocument();
    expect(screen.getByText("Voyage agent")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Map" }));

    expect(screen.getByText("Selected place")).toBeInTheDocument();
  }, 10000);

  it("keeps New Itinerary inside the Planner when agency context is cached", async () => {
    mockNavigationState.authenticated = "1";
    window.localStorage.setItem(
      "voyage-user",
      JSON.stringify({ id: "user-1", memberships: [{ agencyId: "agency-1" }] }),
    );

    render(<Page />);
    fireEvent.click(await screen.findByRole("button", { name: "New Itinerary" }));

    expect(mockNavigationState.routerPush).not.toHaveBeenCalledWith("/agency/agency-1/agent");
    expect(screen.getByText("No conversation yet")).toBeInTheDocument();
  }, 10000);

});
