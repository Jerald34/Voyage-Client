import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Page from "../app/page.jsx";

const mockState = {
  routerPush: vi.fn(),
  searchParamsAuthenticated: null,
  searchParamsTab: null,
  searchParamsInvited: null,
  setActiveScreen: vi.fn(),
  setActiveWorkspaceTab: vi.fn(),
  setDays: vi.fn(),
  setSelectedDayId: vi.fn(),
  setSelectedPlaceId: vi.fn(),
  setAgentMessages: vi.fn(),
  fetchApi: vi.fn(),
  prototypeState: null,
  workspaceProps: null,
  homePageProps: null,
};

vi.mock("../app/lib/api/index.js", () => ({
  fetchApi: (...args) => mockState.fetchApi(...args),
}));

vi.mock("../app/hooks/useAuth.js", () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

// Next's real router is referentially stable. A fresh object per render would
// re-run page.jsx's [authenticatedParam, router] /auth/me effect on every render.
const stableRouter = { push: (...args) => mockState.routerPush(...args) };

vi.mock("next/navigation", () => ({
  useRouter: () => stableRouter,
  useSearchParams: () => ({
    get: (key) => {
      if (key === "authenticated") return mockState.searchParamsAuthenticated;
      if (key === "tab") return mockState.searchParamsTab;
      if (key === "invited") return mockState.searchParamsInvited;
      return null;
    },
  }),
}));

vi.mock("../app/hooks/usePrototypeState.js", () => ({
  usePrototypeState: () => mockState.prototypeState,
}));

vi.mock("../app/components/theme/ThemeToggle", () => ({
  default: () => null,
}));

vi.mock("../app/components/landing/LandingPage.jsx", () => ({
  default: () => <div data-testid="landing-page">Landing page</div>,
}));

vi.mock("../app/components/trip-dashboard/HomePage.jsx", () => ({
  default: (props) => {
    mockState.homePageProps = props;
    return <div data-testid="home-page">Home page</div>;
  },
}));

vi.mock("../app/components/agent/AgentKickoffScreen.jsx", () => ({
  default: () => <div data-testid="agent-kickoff-screen">Agent kickoff</div>,
}));

vi.mock("../app/components/review/ReviewScreen.jsx", () => ({
  default: () => <div data-testid="review-screen">Review screen</div>,
}));

vi.mock("../app/components/share/ShareScreen.jsx", () => ({
  default: () => <div data-testid="share-screen">Share screen</div>,
}));

vi.mock("../app/components/workspace/WorkspaceScreen.jsx", () => ({
  default: (props) => {
    mockState.workspaceProps = props;
    return <div data-testid="workspace-screen">Workspace screen</div>;
  },
}));

vi.mock("../app/data/prototype/trip-dashboard.js", async () => {
  const actual = await vi.importActual("../app/data/prototype/trip-dashboard.js");

  return {
    ...actual,
    default: {
      ...actual.default,
      mapPlaces: [],
    },
  };
});

const testTripBrief = {
  destination: "Barcelona, Spain",
  travelWindow: "May 12-17, 2026",
  travelers: 2,
  pace: "Balanced with room for slow mornings",
  budget: "Mid-range",
};

const testDays = [
  {
    id: "day-1",
    label: "Day 1",
    title: "Arrival",
    locations: [
      { id: "loc-1", name: "Airport transfer", district: "Transit", completed: false },
      { id: "loc-2", name: "Hotel check-in", district: "Eixample", completed: false },
    ],
  },
  {
    id: "day-2",
    label: "Day 2",
    title: "Old city",
    locations: [{ id: "loc-3", name: "Tapas crawl", district: "Ciutat Vella", completed: false }],
  },
];

function landingPrototypeState() {
  return {
    activeScreen: "landing",
    setActiveScreen: mockState.setActiveScreen,
    activeWorkspaceTab: "overview",
    setActiveWorkspaceTab: mockState.setActiveWorkspaceTab,
    tripBrief: testTripBrief,
    days: testDays,
    setDays: mockState.setDays,
    selectedDayId: "day-1",
    setSelectedDayId: mockState.setSelectedDayId,
    selectedPlaceId: null,
    setSelectedPlaceId: mockState.setSelectedPlaceId,
    agentMessages: [],
    setAgentMessages: mockState.setAgentMessages,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  mockState.searchParamsAuthenticated = null;
  mockState.searchParamsTab = null;
  mockState.searchParamsInvited = null;
  mockState.prototypeState = null;
  mockState.workspaceProps = null;
  mockState.homePageProps = null;
  // Default: /auth/me never settles, so tests that don't drive it explicitly
  // (and the existing handoff guards) behave as before this mock existed.
  mockState.fetchApi.mockReset();
  mockState.fetchApi.mockImplementation(() => new Promise(() => {}));
});

describe("page handoff guards", () => {
  it("only auto-advances the login handoff when authenticated is exactly 1", async () => {
    mockState.prototypeState = {
      activeScreen: "landing",
      setActiveScreen: mockState.setActiveScreen,
      activeWorkspaceTab: "overview",
      setActiveWorkspaceTab: mockState.setActiveWorkspaceTab,
      tripBrief: testTripBrief,
      days: testDays,
      setDays: mockState.setDays,
      selectedDayId: "day-1",
      setSelectedDayId: mockState.setSelectedDayId,
      selectedPlaceId: null,
      setSelectedPlaceId: mockState.setSelectedPlaceId,
      agentMessages: [],
      setAgentMessages: mockState.setAgentMessages,
    };

    mockState.searchParamsAuthenticated = "0";
    window.localStorage.setItem("voyage-user", JSON.stringify({ id: "user-1" }));
    render(<Page />);

    expect(mockState.setActiveScreen).not.toHaveBeenCalled();

    mockState.setActiveScreen.mockClear();
    mockState.searchParamsAuthenticated = "1";
    // A transient /auth/me failure with a stored user must still advance (fallback).
    const netError = new Error("Unable to connect. Please try again.");
    netError.status = 0;
    netError.code = "NETWORK_ERROR";
    mockState.fetchApi.mockRejectedValueOnce(netError);
    render(<Page />);

    await waitFor(() => {
      expect(mockState.setActiveScreen).toHaveBeenCalledWith("trip-brief");
    });
  });

  it("keeps the selected day and map fallback safe when map places are empty", () => {
    mockState.prototypeState = {
      activeScreen: "workspace",
      setActiveScreen: mockState.setActiveScreen,
      activeWorkspaceTab: "map",
      setActiveWorkspaceTab: mockState.setActiveWorkspaceTab,
      tripBrief: testTripBrief,
      days: testDays,
      setDays: mockState.setDays,
      selectedDayId: "day-missing",
      setSelectedDayId: mockState.setSelectedDayId,
      selectedPlaceId: "place-missing",
      setSelectedPlaceId: mockState.setSelectedPlaceId,
      agentMessages: [],
      setAgentMessages: mockState.setAgentMessages,
    };

    render(<Page />);

    expect(mockState.workspaceProps).not.toBeNull();
    expect(mockState.workspaceProps.selectedDayId).toBe("day-1");
    expect(mockState.workspaceProps.selectedDay?.id).toBe("day-1");
    expect(mockState.workspaceProps.selectedPlace).toBeNull();

    expect(() => mockState.workspaceProps.onTabChange("map")).not.toThrow();
    expect(mockState.setSelectedPlaceId).toHaveBeenCalledWith(null);
  });

  it("hands accepted agency invites into the dashboard Team tab with its confirmation notice", () => {
    mockState.prototypeState = {
      activeScreen: "trip-brief",
      setActiveScreen: mockState.setActiveScreen,
      activeWorkspaceTab: "overview",
      setActiveWorkspaceTab: mockState.setActiveWorkspaceTab,
      tripBrief: testTripBrief,
      days: testDays,
      setDays: mockState.setDays,
      selectedDayId: "day-1",
      setSelectedDayId: mockState.setSelectedDayId,
      selectedPlaceId: null,
      setSelectedPlaceId: mockState.setSelectedPlaceId,
      agentMessages: [],
      setAgentMessages: mockState.setAgentMessages,
    };
    mockState.searchParamsTab = "team";
    mockState.searchParamsInvited = "1";

    render(<Page />);

    // Team lives inside the Dashboard tab; HomePage has no standalone "team" tab.
    expect(mockState.homePageProps).toMatchObject({
      initialTab: "dashboard",
      showJoinedNotice: true,
    });
  });
});

describe("OAuth return /auth/me failure handling", () => {
  beforeEach(() => {
    mockState.searchParamsAuthenticated = "1";
    mockState.prototypeState = landingPrototypeState();
  });

  it("routes a genuine 401 (cookie not accepted) to /login instead of stranding on the landing page", async () => {
    // Simulate the Google-after-email bug: session cookie not accepted, no stored user.
    window.localStorage.clear();
    const authError = new Error("Sign in is required.");
    authError.status = 401;
    authError.code = "AUTH_REQUIRED";
    mockState.fetchApi.mockRejectedValueOnce(authError);

    render(<Page />);

    await waitFor(() => {
      expect(mockState.routerPush).toHaveBeenCalledWith("/login");
    });
    // Must NOT silently advance into the app, and must not leave the user with no recovery.
    expect(mockState.setActiveScreen).not.toHaveBeenCalledWith("trip-brief");
  });

  it("falls back to the stored user on a transient network error (does not redirect)", async () => {
    window.localStorage.setItem(
      "voyage-user",
      JSON.stringify({ id: "user-1", accountType: "PERSONAL", memberships: [] }),
    );
    const netError = new Error("Unable to connect. Please try again.");
    netError.status = 0;
    netError.code = "NETWORK_ERROR";
    mockState.fetchApi.mockRejectedValueOnce(netError);

    render(<Page />);

    await waitFor(() => {
      expect(mockState.setActiveScreen).toHaveBeenCalledWith("trip-brief");
    });
    expect(mockState.routerPush).not.toHaveBeenCalled();
  });

  it("routes a 401 with no stored user to /login even though localStorage is empty", async () => {
    window.localStorage.clear();
    const authError = new Error("Sign in is required.");
    authError.status = 401;
    authError.code = "AUTH_REQUIRED";
    mockState.fetchApi.mockRejectedValueOnce(authError);

    render(<Page />);

    await waitFor(() => {
      expect(mockState.routerPush).toHaveBeenCalledWith("/login");
    });
  });

  it("still advances into the app when /auth/me succeeds (PERSONAL)", async () => {
    mockState.fetchApi.mockResolvedValueOnce({
      user: { id: "user-1", accountType: "PERSONAL", memberships: [] },
    });

    render(<Page />);

    await waitFor(() => {
      expect(mockState.setActiveScreen).toHaveBeenCalledWith("trip-brief");
    });
    expect(mockState.routerPush).not.toHaveBeenCalled();
  });
});

describe("auth routing — fully set-up users reach the dashboard (Bug B)", () => {
  beforeEach(() => {
    mockState.searchParamsAuthenticated = "1";
    mockState.prototypeState = landingPrototypeState();
  });

  it("(a) PERSONAL user with stale PENDING localStorage reaches the dashboard, not the wizard", async () => {
    // Stale PENDING entry simulates an abandoned earlier signup
    window.localStorage.setItem(
      "voyage-user",
      JSON.stringify({ id: "user-1", accountType: "PENDING", memberships: [] }),
    );
    // Server says the user is fully set up as PERSONAL
    mockState.fetchApi.mockResolvedValueOnce({
      user: { id: "user-1", accountType: "PERSONAL", memberships: [] },
    });

    render(<Page />);

    await waitFor(() => {
      expect(mockState.setActiveScreen).toHaveBeenCalledWith("trip-brief");
    });
    // Must NOT redirect to the wizard
    expect(mockState.routerPush).not.toHaveBeenCalledWith("/login");
    expect(mockState.routerPush).not.toHaveBeenCalledWith("/login?step=agency");
    expect(mockState.routerPush).not.toHaveBeenCalledWith("/login?step=type");
  });

  it("(b) AGENCY_USER with verified membership reaches the dashboard, not the wizard", async () => {
    mockState.fetchApi.mockResolvedValueOnce({
      user: {
        id: "user-2",
        accountType: "AGENCY_USER",
        memberships: [{ agency: { id: "agency-1", status: "VERIFIED" } }],
      },
    });

    render(<Page />);

    await waitFor(() => {
      expect(mockState.setActiveScreen).toHaveBeenCalledWith("trip-brief");
    });
    expect(mockState.routerPush).not.toHaveBeenCalled();
  });

  it("(c) stale PENDING localStorage does NOT cause page.jsx to redirect when server returns PERSONAL", async () => {
    // Even if localStorage has PENDING, server response wins
    window.localStorage.setItem(
      "voyage-user",
      JSON.stringify({ id: "user-3", accountType: "PENDING", memberships: [] }),
    );
    mockState.fetchApi.mockResolvedValueOnce({
      user: { id: "user-3", accountType: "PERSONAL", memberships: [] },
    });

    render(<Page />);

    await waitFor(() => {
      expect(mockState.setActiveScreen).toHaveBeenCalledWith("trip-brief");
    });
    // No wizard redirect of any kind
    expect(mockState.routerPush).not.toHaveBeenCalled();
  });

  it("(d) genuinely PENDING account (server-confirmed) is redirected to ?step=type, not bare /login", async () => {
    mockState.fetchApi.mockResolvedValueOnce({
      user: { id: "user-4", accountType: "PENDING", memberships: [] },
    });

    render(<Page />);

    await waitFor(() => {
      expect(mockState.routerPush).toHaveBeenCalledWith("/login?step=type");
    });
    expect(mockState.setActiveScreen).not.toHaveBeenCalledWith("trip-brief");
  });

  it("(d) AGENCY_USER without membership is redirected to ?step=agency (recoverable setup path)", async () => {
    mockState.fetchApi.mockResolvedValueOnce({
      user: { id: "user-5", accountType: "AGENCY_USER", memberships: [] },
    });

    render(<Page />);

    await waitFor(() => {
      expect(mockState.routerPush).toHaveBeenCalledWith("/login?step=agency");
    });
    expect(mockState.setActiveScreen).not.toHaveBeenCalledWith("trip-brief");
  });
});

describe("agency review screen refresh", () => {
  const agency = { id: "agency-1", name: "Hillside Travel", status: "PENDING_REVIEW" };
  const pendingUser = { id: "user-1", email: "owner@hillside.test", accountType: "AGENCY_USER", memberships: [{ agency }] };

  beforeEach(() => {
    mockState.searchParamsAuthenticated = "1";
    // The dashboard is the post-landing screen; with it active, the app opening is observable.
    mockState.prototypeState = { ...landingPrototypeState(), activeScreen: "trip-brief" };
  });

  async function showReviewScreen() {
    render(<Page />);
    expect(await screen.findByText("Application Under Review")).toBeInTheDocument();
    expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();
  }

  async function focusWindow() {
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
  }

  it("opens the app by itself once the agency is approved", async () => {
    const approvedUser = { ...pendingUser, memberships: [{ agency: { ...agency, status: "VERIFIED" } }] };
    mockState.fetchApi.mockResolvedValueOnce({ user: pendingUser }).mockResolvedValueOnce({ user: approvedUser });

    await showReviewScreen();
    await focusWindow();

    expect(await screen.findByTestId("home-page")).toBeInTheDocument();
    expect(screen.queryByText("Application Under Review")).not.toBeInTheDocument();
    expect(mockState.homePageProps.user).toEqual(approvedUser);
    expect(JSON.parse(window.localStorage.getItem("voyage-user"))).toEqual(approvedUser);
    expect(mockState.fetchApi).toHaveBeenLastCalledWith("/auth/me");
  });

  it("goes to sign-in when the session has ended", async () => {
    const authError = Object.assign(new Error("Sign in is required."), { status: 401, code: "AUTH_REQUIRED" });
    mockState.fetchApi.mockResolvedValueOnce({ user: pendingUser }).mockRejectedValueOnce(authError);

    await showReviewScreen();
    await focusWindow();

    await waitFor(() => expect(mockState.routerPush).toHaveBeenCalledWith("/login"));
    expect(window.localStorage.getItem("voyage-user")).toBeNull();
  });

  it("sends the owner back to the agency setup when the agency is gone", async () => {
    const detachedUser = { ...pendingUser, memberships: [] };
    mockState.fetchApi.mockResolvedValueOnce({ user: pendingUser }).mockResolvedValueOnce({ user: detachedUser });

    await showReviewScreen();
    await focusWindow();

    await waitFor(() => expect(mockState.routerPush).toHaveBeenCalledWith("/login?step=agency"));
  });
});

describe("plain `/` visit — signed-in users skip the landing page", () => {
  beforeEach(() => {
    mockState.prototypeState = landingPrototypeState();
  });

  it("opens the app when /auth/me confirms a session", async () => {
    window.localStorage.setItem("voyage-user", JSON.stringify({ id: "user-1" }));
    mockState.fetchApi.mockResolvedValueOnce({
      user: { id: "user-1", accountType: "PERSONAL", memberships: [] },
    });

    render(<Page />);

    // Waits on the check instead of flashing the landing page.
    expect(screen.queryByTestId("landing-page")).not.toBeInTheDocument();
    expect(mockState.fetchApi).toHaveBeenCalledWith("/auth/me");
    await waitFor(() => {
      expect(mockState.setActiveScreen).toHaveBeenCalledWith("trip-brief");
    });
  });

  it("shows the landing page and drops the stale stored user on 401", async () => {
    window.localStorage.setItem("voyage-user", JSON.stringify({ id: "user-1" }));
    const authError = new Error("Authentication required.");
    authError.status = 401;
    mockState.fetchApi.mockRejectedValueOnce(authError);

    render(<Page />);

    expect(await screen.findByTestId("landing-page")).toBeInTheDocument();
    expect(window.localStorage.getItem("voyage-user")).toBeNull();
    expect(mockState.routerPush).not.toHaveBeenCalled();
  });

  it("shows the landing page right away for visitors with no stored user, without calling /auth/me", () => {
    render(<Page />);

    expect(screen.getByTestId("landing-page")).toBeInTheDocument();
    expect(mockState.fetchApi).not.toHaveBeenCalled();
  });

  it("un-hides the pre-paint check once the landing page is settled", async () => {
    window.localStorage.setItem("voyage-user", JSON.stringify({ id: "user-1" }));
    document.documentElement.setAttribute("data-session-check", "");
    const authError = new Error("Authentication required.");
    authError.status = 401;
    mockState.fetchApi.mockRejectedValueOnce(authError);

    render(<Page />);

    expect(await screen.findByTestId("landing-page")).toBeInTheDocument();
    expect(document.documentElement.hasAttribute("data-session-check")).toBe(false);
  });
});

describe("landing page stays hidden while the session decides the route", () => {
  beforeEach(() => {
    mockState.prototypeState = landingPrototypeState();
  });

  it("hides the landing page during the ?authenticated=1 handoff", () => {
    mockState.searchParamsAuthenticated = "1";

    render(<Page />);

    expect(screen.queryByTestId("landing-page")).not.toBeInTheDocument();
  });

  it("shows the landing page if the handoff fails transiently with no stored user", async () => {
    mockState.searchParamsAuthenticated = "1";
    const netError = new Error("Unable to connect. Please try again.");
    netError.status = 0;
    mockState.fetchApi.mockRejectedValueOnce(netError);

    render(<Page />);

    expect(await screen.findByTestId("landing-page")).toBeInTheDocument();
  });

  it("keeps the landing page hidden while a PENDING user is sent to the type picker", async () => {
    window.localStorage.setItem("voyage-user", JSON.stringify({ id: "user-1" }));
    mockState.fetchApi.mockResolvedValueOnce({
      user: { id: "user-1", accountType: "PENDING", memberships: [] },
    });

    render(<Page />);

    await waitFor(() => {
      expect(mockState.routerPush).toHaveBeenCalledWith("/login?step=type");
    });
    expect(screen.queryByTestId("landing-page")).not.toBeInTheDocument();
  });

  it("sends an agency user with no membership to the agency step", async () => {
    window.localStorage.setItem("voyage-user", JSON.stringify({ id: "user-1" }));
    mockState.fetchApi.mockResolvedValueOnce({
      user: { id: "user-1", accountType: "AGENCY_USER", memberships: [] },
    });

    render(<Page />);

    await waitFor(() => {
      expect(mockState.routerPush).toHaveBeenCalledWith("/login?step=agency");
    });
  });
});
