import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomePage, { getAgencyMapFallbackFromUser } from "../app/components/trip-dashboard/HomePage.jsx";
import SettingsPage from "../app/components/trip-dashboard/pages/SettingsPage.jsx";
import { useTripDashboard } from "../app/hooks/useTripDashboard.js";

if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = vi.fn();
}

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
}

const mocks = vi.hoisted(() => ({
  startStreamMock: vi.fn(),
  streamState: {
    isStreaming: false,
    runStatus: "idle",
    assistantMessage: "",
    toolCalls: [],
    mapMarkers: [],
    routeEstimates: [],
    activeToolLabel: null,
    lastItineraryUpdate: null,
    lastCompletedItineraryTool: null,
    error: null,
  },
  sendMessageMock: vi.fn(async () => ({ runId: "run-1" })),
  createAgentThreadMock: vi.fn(),
  deleteAgentThreadMock: vi.fn(async () => ({})),
  listAgentThreadsMock: vi.fn(async () => ({
    threads: [
      {
        id: "thread-1",
        tripId: "trip-1",
        messages: [{ id: "m-1", role: "ASSISTANT", content: "First thread ready" }],
        events: [{ type: "itinerary.updated", payload: { itineraryId: "itinerary-1" } }],
      },
      {
        id: "thread-2",
        tripId: "trip-2",
        messages: [{ id: "m-2", role: "ASSISTANT", content: "Second thread ready" }],
        events: [{ type: "itinerary.updated", payload: { itineraryId: "itinerary-2" } }],
      },
    ],
  })),
  fetchAgentThreadMock: vi.fn(async (_agencyId, threadId) => ({
    thread:
      threadId === "thread-2"
        ? {
            id: "thread-2",
            tripId: "trip-2",
            messages: [{ id: "m-2", role: "ASSISTANT", content: "Second thread ready" }],
            events: [{ type: "itinerary.updated", payload: { itineraryId: "itinerary-2" } }],
          }
        : {
            id: "thread-1",
            tripId: "trip-1",
            messages: [{ id: "m-1", role: "ASSISTANT", content: "First thread ready" }],
            events: [{ type: "itinerary.updated", payload: { itineraryId: "itinerary-1" } }],
          },
  })),
  fetchItineraryDraftMock: vi.fn(async (_agencyId, itineraryId) => ({
    itinerary: {
      id: itineraryId,
      version: itineraryId === "itinerary-2" ? 2 : 1,
      trip: {
        id: itineraryId === "itinerary-2" ? "trip-2" : "trip-1",
        clientName: itineraryId === "itinerary-2" ? "Reyes Group" : "Santos Family",
      },
      days: [],
    },
  })),
  listAgencyTripsMock: vi.fn(async () => ({ trips: [] })),
  bootstrapAgentWorkspaceMock: vi.fn(async () => ({
    trips: [],
    threads: [
      { id: "thread-1", tripId: "trip-1", title: "", status: "ACTIVE", itineraryId: "itinerary-1" },
      { id: "thread-2", tripId: "trip-2", title: "", status: "ACTIVE", itineraryId: "itinerary-2" },
    ],
    itinerarySummaries: {
      "itinerary-1": { id: "itinerary-1", tripId: "trip-1", title: "", summary: null, status: "DRAFT", version: 1 },
      "itinerary-2": { id: "itinerary-2", tripId: "trip-2", title: "", summary: null, status: "DRAFT", version: 2 },
    },
  })),
  fetchThreadMessagesMock: vi.fn(async (_agencyId, threadId) => ({
    messages:
      threadId === "thread-2"
        ? [{ id: "m-2", role: "ASSISTANT", content: "Second thread ready" }]
        : [{ id: "m-1", role: "ASSISTANT", content: "First thread ready" }],
    nextCursor: null,
  })),
  saveAgentThreadItineraryMock: vi.fn(async (_agencyId, threadId, payload) => ({
    thread: {
      id: threadId,
      title: payload.clientName,
      tripId: "trip-approved-1",
      messages: [],
      events: [],
    },
    trip: {
      id: "trip-approved-1",
      clientName: payload.clientName,
      destination: payload.destination,
      destinationSummary: payload.destination,
      travelerCount: payload.travelerCount ?? null,
      budgetLevel: payload.budgetLevel ?? null,
    },
    itinerary: {
      id: payload.itineraryId,
      version: 1,
      status: "DRAFT",
    },
  })),
  updateCurrentUserProfileMock: vi.fn(async (payload) => ({
    user: {
      id: "user-1",
      email: "owner@voyage.test",
      displayName: payload.displayName,
      role: "USER",
      status: "ACTIVE",
      emailVerifiedAt: "2026-05-01T00:00:00.000Z",
      memberships: [],
    },
  })),
  updateAgencySettingsMock: vi.fn(async (_agencyId, payload) => ({
    agency: {
      id: "agency-1",
      name: payload.name,
      status: "VERIFIED",
      businessPhone: payload.businessPhone,
      businessEmail: payload.businessEmail,
      city: payload.city,
      country: payload.country,
    },
  })),
}));

function resetApiMocks() {
  mocks.startStreamMock.mockClear();
  Object.assign(mocks.streamState, {
    isStreaming: false,
    runStatus: "idle",
    assistantMessage: "",
    toolCalls: [],
    mapMarkers: [],
    routeEstimates: [],
    activeToolLabel: null,
    lastItineraryUpdate: null,
    lastCompletedItineraryTool: null,
    error: null,
  });
  mocks.sendMessageMock.mockReset();
  mocks.sendMessageMock.mockImplementation(async () => ({ runId: "run-1" }));
  mocks.createAgentThreadMock.mockReset();
  mocks.createAgentThreadMock.mockImplementation(async (_agencyId, tripId) => ({
    thread: {
      id: tripId ? `created-${tripId}` : "created-draft",
      title: tripId ? `Trip ${tripId}` : "Planning draft",
      tripId,
      messages: [],
      events: [],
    },
  }));
  mocks.deleteAgentThreadMock.mockReset();
  mocks.deleteAgentThreadMock.mockImplementation(async () => ({}));
  mocks.listAgentThreadsMock.mockReset();
  mocks.listAgentThreadsMock.mockImplementation(async () => ({
    threads: [
      {
        id: "thread-1",
        tripId: "trip-1",
        messages: [{ id: "m-1", role: "ASSISTANT", content: "First thread ready" }],
        events: [{ type: "itinerary.updated", payload: { itineraryId: "itinerary-1" } }],
      },
      {
        id: "thread-2",
        tripId: "trip-2",
        messages: [{ id: "m-2", role: "ASSISTANT", content: "Second thread ready" }],
        events: [{ type: "itinerary.updated", payload: { itineraryId: "itinerary-2" } }],
      },
    ],
  }));
  mocks.fetchAgentThreadMock.mockReset();
  mocks.fetchAgentThreadMock.mockImplementation(async (_agencyId, threadId) => ({
    thread:
      threadId === "thread-2"
        ? {
            id: "thread-2",
            tripId: "trip-2",
            messages: [{ id: "m-2", role: "ASSISTANT", content: "Second thread ready" }],
            events: [{ type: "itinerary.updated", payload: { itineraryId: "itinerary-2" } }],
          }
        : {
            id: "thread-1",
            tripId: "trip-1",
            messages: [{ id: "m-1", role: "ASSISTANT", content: "First thread ready" }],
            events: [{ type: "itinerary.updated", payload: { itineraryId: "itinerary-1" } }],
          },
  }));
  mocks.fetchItineraryDraftMock.mockReset();
  mocks.fetchItineraryDraftMock.mockImplementation(async (_agencyId, itineraryId) => ({
    itinerary: {
      id: itineraryId,
      version: itineraryId === "itinerary-2" ? 2 : 1,
      trip: {
        id: itineraryId === "itinerary-2" ? "trip-2" : "trip-1",
        clientName: itineraryId === "itinerary-2" ? "Reyes Group" : "Santos Family",
      },
      days: [],
    },
  }));
  mocks.listAgencyTripsMock.mockReset();
  mocks.listAgencyTripsMock.mockImplementation(async () => ({ trips: [] }));
  mocks.bootstrapAgentWorkspaceMock.mockReset();
  mocks.bootstrapAgentWorkspaceMock.mockImplementation(async () => ({
    trips: [],
    threads: [
      { id: "thread-1", tripId: "trip-1", title: "", status: "ACTIVE", itineraryId: "itinerary-1" },
      { id: "thread-2", tripId: "trip-2", title: "", status: "ACTIVE", itineraryId: "itinerary-2" },
    ],
    itinerarySummaries: {
      "itinerary-1": { id: "itinerary-1", tripId: "trip-1", title: "", summary: null, status: "DRAFT", version: 1 },
      "itinerary-2": { id: "itinerary-2", tripId: "trip-2", title: "", summary: null, status: "DRAFT", version: 2 },
    },
  }));
  mocks.fetchThreadMessagesMock.mockReset();
  mocks.fetchThreadMessagesMock.mockImplementation(async (_agencyId, threadId) => ({
    messages:
      threadId === "thread-2"
        ? [{ id: "m-2", role: "ASSISTANT", content: "Second thread ready" }]
        : [{ id: "m-1", role: "ASSISTANT", content: "First thread ready" }],
    nextCursor: null,
  }));
  mocks.saveAgentThreadItineraryMock.mockReset();
  mocks.saveAgentThreadItineraryMock.mockImplementation(async (_agencyId, threadId, payload) => ({
    thread: {
      id: threadId,
      title: payload.clientName,
      tripId: "trip-approved-1",
      messages: [],
      events: [],
    },
    trip: {
      id: "trip-approved-1",
      clientName: payload.clientName,
      destination: payload.destination,
      destinationSummary: payload.destination,
      travelerCount: payload.travelerCount ?? null,
      budgetLevel: payload.budgetLevel ?? null,
    },
    itinerary: {
      id: payload.itineraryId,
      version: 1,
      status: "DRAFT",
    },
  }));
  mocks.updateCurrentUserProfileMock.mockReset();
  mocks.updateCurrentUserProfileMock.mockImplementation(async (payload) => ({
    user: {
      id: "user-1",
      email: "owner@voyage.test",
      displayName: payload.displayName,
      role: "USER",
      status: "ACTIVE",
      emailVerifiedAt: "2026-05-01T00:00:00.000Z",
      memberships: [],
    },
  }));
  mocks.updateAgencySettingsMock.mockReset();
  mocks.updateAgencySettingsMock.mockImplementation(async (_agencyId, payload) => ({
    agency: {
      id: "agency-1",
      name: payload.name,
      status: "VERIFIED",
      businessPhone: payload.businessPhone,
      businessEmail: payload.businessEmail,
      city: payload.city,
      country: payload.country,
    },
  }));
}

vi.mock("../app/hooks/useAgentRunStream.js", () => ({
  useAgentRunStream: () => ({
    ...mocks.streamState,
    startStream: mocks.startStreamMock,
  }),
}));

vi.mock("../app/hooks/useAuth.js", () => ({
  useAuth: () => ({
    logout: vi.fn(),
    user: null,
  }),
}));

vi.mock("../app/lib/api.js", () => ({
  saveAgentThreadItinerary: (...args) => mocks.saveAgentThreadItineraryMock(...args),
  bootstrapAgentWorkspace: (...args) => mocks.bootstrapAgentWorkspaceMock(...args),
  createAgentThread: (...args) => mocks.createAgentThreadMock(...args),
  deleteAgentThread: (...args) => mocks.deleteAgentThreadMock(...args),
  fetchAgentThread: (...args) => mocks.fetchAgentThreadMock(...args),
  fetchItineraryDraft: (...args) => mocks.fetchItineraryDraftMock(...args),
  fetchThreadMessages: (...args) => mocks.fetchThreadMessagesMock(...args),
  listAgencyTrips: (...args) => mocks.listAgencyTripsMock(...args),
  listAgentThreads: (...args) => mocks.listAgentThreadsMock(...args),
  updateAgencySettings: (...args) => mocks.updateAgencySettingsMock(...args),
  updateCurrentUserProfile: (...args) => mocks.updateCurrentUserProfileMock(...args),
  sendMessage: (...args) => mocks.sendMessageMock(...args),
}));

const testMapPlaces = [
  { id: "place-1", name: "Airport transfer", district: "Transit", note: "Arrival route" },
  { id: "place-2", name: "Hotel check-in", district: "Eixample", note: "Drop bags first" },
  { id: "place-3", name: "Tapas crawl", district: "Ciutat Vella", note: "Evening cluster" },
];

const testDays = [
  {
    id: "day-1",
    label: "Day 1",
    title: "Arrival",
    note: "Ease into the city after check-in.",
    locations: [
      { id: "loc-1", name: "Airport transfer", district: "Transit", time: "13:30", completed: false },
      { id: "loc-2", name: "Hotel check-in", district: "Eixample", time: "15:00", completed: true },
    ],
  },
  {
    id: "day-2",
    label: "Day 2",
    title: "Old city",
    note: "Keep the walking route clustered.",
    locations: [{ id: "loc-3", name: "Tapas crawl", district: "Ciutat Vella", time: "19:30", completed: false }],
  },
];

function DashboardHookHarness() {
  const [days, setDays] = useState(testDays);
  const dashboard = useTripDashboard({
    days,
    setDays,
    mapPlaces: testMapPlaces,
  });

  return (
    <div>
      <p>Trip progress {dashboard.tripProgress.percent}%</p>
      <p>Next day {dashboard.nextActiveDay?.label ?? "none"}</p>
      <p>First day {dashboard.days[0].progress.percent}%</p>
      <p>Map highlight {dashboard.mapHighlights[0]?.value ?? "none"}</p>
      <button type="button" onClick={() => dashboard.toggleLocationComplete("day-1", "loc-1")}>
        toggle first stop
      </button>
      <button type="button" onClick={() => dashboard.markDayDone("day-2")}>
        finish day 2
      </button>
    </div>
  );
}

describe("useTripDashboard", () => {
  beforeEach(() => {
    resetApiMocks();
    localStorage.setItem("voyage-home-tour-completed-v1", "true");
  });

  it("updates dashboard progress and derived highlights after mutations", () => {
    render(<DashboardHookHarness />);

    expect(screen.getByText("Trip progress 33%")).toBeInTheDocument();
    expect(screen.getByText("Next day Day 1")).toBeInTheDocument();
    expect(screen.getByText("First day 50%")).toBeInTheDocument();
    expect(screen.getByText("Map highlight Airport transfer")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "toggle first stop" }));

    expect(screen.getByText("Trip progress 67%")).toBeInTheDocument();
    expect(screen.getByText("First day 100%")).toBeInTheDocument();
    expect(screen.getByText("Next day Day 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "finish day 2" }));

    expect(screen.getByText("Trip progress 100%")).toBeInTheDocument();
    expect(screen.getByText("Next day none")).toBeInTheDocument();
  });
});

describe("Agency portfolio HomePage", () => {
  const agencyTrips = [
    {
      id: "trip-1",
      clientName: "Santos Family",
      destination: "Olongapo City",
      travelWindow: "May 12-17, 2026",
      departureDate: "2026-05-12",
      assignedOrganizer: "Mara",
      readinessPercent: 68,
      approvalStatus: "Awaiting itinerary approval",
      riskLevel: "Medium",
      nextAction: "Draft client approval reminder",
      agentInsight: "Departure is inside 30 days and itinerary approval is still pending.",
      status: "active",
    },
    {
      id: "trip-2",
      clientName: "Reyes Group",
      destination: "Baguio",
      travelWindow: "May 2-5, 2026",
      departureDate: "2026-05-02",
      assignedOrganizer: "Luis",
      readinessPercent: 82,
      approvalStatus: "Final confirmation pending",
      riskLevel: "High",
      nextAction: "Review readiness",
      agentInsight: "High-risk trip departs soon and still needs final confirmation.",
      status: "active",
    },
  ];
  const user = {
    displayName: "Mara",
    memberships: [{ agencyId: "agency-1" }],
  };

  beforeEach(() => {
    resetApiMocks();
  });

  it("derives the map fallback from the signed-in agency registration location", () => {
    expect(
      getAgencyMapFallbackFromUser({
        memberships: [
          {
            agencyId: "agency-1",
            agency: {
              name: "Voyage Baguio",
              city: "Baguio",
              country: "Philippines",
            },
          },
        ],
      }),
    ).toEqual({
      name: "Voyage Baguio",
      city: "Baguio",
      country: "Philippines",
    });
  });

  it("renders the Agent-centered agency portfolio dashboard", () => {
    render(<HomePage agencyTrips={agencyTrips} onContinue={vi.fn()} />);

    expect(screen.getByRole("button", { name: "New Itinerary" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Current client: Santos Family" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();
  });

  it("opens settings from the homepage sidebar", async () => {
    render(<HomePage user={user} agencyTrips={agencyTrips} onContinue={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /settings/i }));

    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
  });

  it("gives settings its own scroll container for mobile dashboard layouts", async () => {
    localStorage.setItem("voyage-home-tour-completed-v1", "true");

    render(<HomePage user={user} agencyTrips={agencyTrips} onContinue={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /settings/i }));

    expect(await screen.findByTestId("settings-page")).toHaveClass("overflow-y-auto");
  });

  it("wires the New Itinerary button through the homepage", () => {
    const onNewItinerary = vi.fn();

    render(<HomePage agencyTrips={agencyTrips} onContinue={vi.fn()} onNewItinerary={onNewItinerary} />);

    fireEvent.click(screen.getByRole("button", { name: "New Itinerary" }));

    expect(onNewItinerary).toHaveBeenCalledTimes(1);
  });

  it("creates a no-client agent thread from New Itinerary and sends messages to it", async () => {
    const { container } = render(<HomePage user={user} agencyTrips={[]} onContinue={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "New Itinerary" }));
    fireEvent.change(screen.getByPlaceholderText("Ask the agent to adjust the draft..."), {
      target: { value: "Create a 4-day Cebu itinerary" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(mocks.createAgentThreadMock).toHaveBeenCalledWith("agency-1");
    });

    await waitFor(() => {
      expect(mocks.sendMessageMock).toHaveBeenCalledWith(
        "agency-1",
        "created-draft",
        "Create a 4-day Cebu itinerary",
      );
    });
  });

  it("creates and adds a new draft option for each New Itinerary click", async () => {
    mocks.createAgentThreadMock
      .mockResolvedValueOnce({
        thread: { id: "draft-thread-1", title: "Draft itinerary 1", tripId: null, messages: [], events: [] },
      })
      .mockResolvedValueOnce({
        thread: { id: "draft-thread-2", title: "Draft itinerary 2", tripId: null, messages: [], events: [] },
      });

    render(<HomePage user={user} agencyTrips={agencyTrips} onContinue={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "New Itinerary" }));
    fireEvent.change(screen.getByPlaceholderText("Ask the agent to adjust the draft..."), {
      target: { value: "Draft one" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(mocks.createAgentThreadMock).toHaveBeenCalledWith("agency-1");
    });

    expect(await screen.findByRole("button", { name: "Current client: Draft itinerary 1" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New Itinerary" }));
    fireEvent.change(screen.getByPlaceholderText("Ask the agent to adjust the draft..."), {
      target: { value: "Draft two" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(mocks.createAgentThreadMock).toHaveBeenCalledTimes(2);
    });

    expect(await screen.findByRole("button", { name: "Current client: Draft itinerary 2" })).toBeInTheDocument();
    expect(mocks.createAgentThreadMock).toHaveBeenNthCalledWith(1, "agency-1");
    expect(mocks.createAgentThreadMock).toHaveBeenNthCalledWith(2, "agency-1");
  });

  it("shows existing no-client draft threads in the dropdown after initial load", async () => {
    mocks.bootstrapAgentWorkspaceMock.mockResolvedValue({
      trips: [],
      threads: [
        { id: "draft-refresh", tripId: null, title: "Refresh draft", status: "ACTIVE", itineraryId: "draft-itinerary" },
        { id: "thread-1", tripId: "trip-1", title: "", status: "ACTIVE", itineraryId: "itinerary-1" },
      ],
      itinerarySummaries: {
        "draft-itinerary": { id: "draft-itinerary", tripId: "trip-1", title: "", summary: null, status: "DRAFT", version: 1 },
        "itinerary-1": { id: "itinerary-1", tripId: "trip-1", title: "", summary: null, status: "DRAFT", version: 1 },
      },
    });

    render(<HomePage user={user} agencyTrips={agencyTrips} onContinue={vi.fn()} />);

    await waitFor(() => {
      expect(mocks.bootstrapAgentWorkspaceMock).toHaveBeenCalledWith("agency-1");
    });

    expect(screen.getByRole("button", { name: "Current client: Santos Family" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Current client: Santos Family" }));
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Refresh draft/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("option", { name: /Refresh draft/i }));
    expect(screen.getByRole("button", { name: "Current client: Refresh draft" })).toBeInTheDocument();
  });

  it("ignores rapid New Itinerary clicks while draft creation is pending", async () => {
    render(<HomePage user={user} agencyTrips={agencyTrips} onContinue={vi.fn()} />);

    const newItineraryButton = screen.getByRole("button", { name: "New Itinerary" });
    fireEvent.click(newItineraryButton);
    fireEvent.click(newItineraryButton);

    expect(newItineraryButton).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Current client: New Itinerary..." })).toBeInTheDocument();
    expect(mocks.createAgentThreadMock).not.toHaveBeenCalled();
  });

  it("keeps both draft options in the current client dropdown after two New Itinerary clicks", async () => {
    mocks.createAgentThreadMock
      .mockResolvedValueOnce({
        thread: { id: "draft-thread-1", title: "Draft itinerary 1", tripId: null, messages: [], events: [] },
      })
      .mockResolvedValueOnce({
        thread: { id: "draft-thread-2", title: "Draft itinerary 2", tripId: null, messages: [], events: [] },
      });

    render(<HomePage user={user} agencyTrips={agencyTrips} onContinue={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "New Itinerary" }));
    fireEvent.change(screen.getByPlaceholderText("Ask the agent to adjust the draft..."), {
      target: { value: "Draft one" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByRole("button", { name: "Current client: Draft itinerary 1" });

    fireEvent.click(screen.getByRole("button", { name: "New Itinerary" }));
    fireEvent.change(screen.getByPlaceholderText("Ask the agent to adjust the draft..."), {
      target: { value: "Draft two" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByRole("button", { name: "Current client: Draft itinerary 2" });

    fireEvent.click(screen.getByRole("button", { name: "Current client: Draft itinerary 2" }));

    expect(screen.getByRole("option", { name: /Draft itinerary 2/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Draft itinerary 1/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Santos Family/i })).toBeInTheDocument();
  });

  it("sends messages through the selected draft thread", async () => {
    mocks.createAgentThreadMock
      .mockResolvedValueOnce({
        thread: { id: "draft-thread-1", title: "Draft itinerary 1", tripId: null, messages: [], events: [] },
      })
      .mockResolvedValueOnce({
        thread: { id: "draft-thread-2", title: "Draft itinerary 2", tripId: null, messages: [], events: [] },
      });

    const { container } = render(<HomePage user={user} agencyTrips={agencyTrips} onContinue={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "New Itinerary" }));
    fireEvent.change(screen.getByPlaceholderText("Ask the agent to adjust the draft..."), {
      target: { value: "Draft one" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByRole("button", { name: "Current client: Draft itinerary 1" });

    fireEvent.click(screen.getByRole("button", { name: "New Itinerary" }));
    fireEvent.change(screen.getByPlaceholderText("Ask the agent to adjust the draft..."), {
      target: { value: "Draft two" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByRole("button", { name: "Current client: Draft itinerary 2" });

    fireEvent.click(screen.getByRole("button", { name: "Current client: Draft itinerary 2" }));
    fireEvent.click(screen.getByRole("option", { name: /Draft itinerary 1/i }));

    fireEvent.change(screen.getByPlaceholderText("Ask the agent to adjust the draft..."), {
      target: { value: "Plan the selected draft" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(mocks.sendMessageMock).toHaveBeenCalledWith("agency-1", "draft-thread-1", "Plan the selected draft");
    });
  });

  it("deletes a draft thread from the current client dropdown", async () => {
    mocks.createAgentThreadMock
      .mockResolvedValueOnce({
        thread: { id: "draft-thread-1", title: "Draft itinerary 1", tripId: null, messages: [], events: [] },
      })
      .mockResolvedValueOnce({
        thread: { id: "draft-thread-2", title: "Draft itinerary 2", tripId: null, messages: [], events: [] },
      });

    render(<HomePage user={user} agencyTrips={agencyTrips} onContinue={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "New Itinerary" }));
    fireEvent.change(screen.getByPlaceholderText("Ask the agent to adjust the draft..."), {
      target: { value: "Draft one" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByRole("button", { name: "Current client: Draft itinerary 1" });

    fireEvent.click(screen.getByRole("button", { name: "New Itinerary" }));
    fireEvent.change(screen.getByPlaceholderText("Ask the agent to adjust the draft..."), {
      target: { value: "Draft two" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByRole("button", { name: "Current client: Draft itinerary 2" });

    fireEvent.click(screen.getByRole("button", { name: "Current client: Draft itinerary 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Draft itinerary 1 thread" }));

    await waitFor(() => {
      expect(mocks.deleteAgentThreadMock).toHaveBeenCalledWith("agency-1", "draft-thread-1");
    });

    expect(screen.queryByRole("option", { name: /Draft itinerary 1/i })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Draft itinerary 2/i })).toBeInTheDocument();
  });

  it("hides live stream output when the selected planning context changes", async () => {
    mocks.createAgentThreadMock.mockResolvedValue({
      thread: { id: "draft-thread-1", title: "Draft itinerary 1", tripId: null, messages: [], events: [] },
    });

    const { container } = render(<HomePage user={user} agencyTrips={agencyTrips} onContinue={vi.fn()} />);

    await screen.findByText("First thread ready");
    fireEvent.click(screen.getByRole("button", { name: "New Itinerary" }));
    await screen.findByRole("button", { name: "Current client: New Itinerary..." });

    fireEvent.change(screen.getByPlaceholderText("Ask the agent to adjust the draft..."), {
      target: { value: "Update Santos plan" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(mocks.createAgentThreadMock).toHaveBeenCalledWith("agency-1");
      expect(mocks.startStreamMock).toHaveBeenCalledWith("run-1");
    });

    Object.assign(mocks.streamState, {
      isStreaming: true,
      runStatus: "in_progress",
      assistantMessage: "Streaming Santos answer",
      toolCalls: [{ name: "map_pinpoint" }],
      activeToolLabel: "Pinpointing map stops",
      mapMarkers: [{ id: "marker-1", name: "Live marker" }],
      routeEstimates: [{ distanceMeters: 1200, durationSeconds: 900 }],
    });

    fireEvent.click(screen.getByRole("button", { name: "New Itinerary" }));
    await screen.findByRole("button", { name: "Current client: New Itinerary..." });

    expect(screen.queryByText("Streaming Santos answer")).not.toBeInTheDocument();
    expect(screen.queryByText("Agent working")).not.toBeInTheDocument();
    expect(screen.queryByText("1 live markers")).not.toBeInTheDocument();
  });

  it("approves a draft itinerary and renames the selector option to the client name", async () => {
    mocks.createAgentThreadMock.mockResolvedValue({
      thread: {
        id: "draft-thread-1",
        title: "Draft itinerary 1",
        tripId: null,
        messages: [],
        events: [{ type: "itinerary.updated", payload: { itineraryId: "itinerary-1" } }],
      },
    });

    render(<HomePage user={user} agencyTrips={agencyTrips} onContinue={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "New Itinerary" }));
    fireEvent.change(screen.getByPlaceholderText("Ask the agent to adjust the draft..."), {
      target: { value: "Draft one" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByRole("button", { name: "Current client: Draft itinerary 1" });

    fireEvent.click(screen.getByRole("button", { name: /save.*client/i }));
    fireEvent.change(screen.getByLabelText("Client name"), { target: { value: "Garcia Family" } });
    fireEvent.change(screen.getByLabelText("Destination"), { target: { value: "Olongapo City" } });
    fireEvent.click(screen.getByRole("button", { name: "Save client plan" }));

    await waitFor(() => {
      expect(mocks.saveAgentThreadItineraryMock).toHaveBeenCalledWith("agency-1", "draft-thread-1", {
        itineraryId: "itinerary-1",
        clientName: "Garcia Family",
        destination: "Olongapo City",
        startDate: null,
        endDate: null,
        travelerCount: undefined,
        budgetLevel: undefined,
      });
    });
    expect(await screen.findByRole("button", { name: "Current client: Garcia Family" })).toBeInTheDocument();
  });

  it("renders empty states for an empty portfolio", () => {
    render(<HomePage agencyTrips={[]} onContinue={vi.fn()} />);

    expect(screen.getByText("No conversation yet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "No client trips available" }));
    expect(screen.getByRole("button", { name: "No client trips available" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("No client trips available");
    expect(screen.getByRole("status")).toHaveTextContent("Use New Itinerary to create the first trip.");
  });

  it("switches the active trip and thread when a client is selected", async () => {
    const { container } = render(<HomePage user={user} agencyTrips={agencyTrips} onContinue={vi.fn()} />);

    expect(await screen.findByText("First thread ready")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Santos Family/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Santos Family/i }));
    fireEvent.click(screen.getByRole("option", { name: /Reyes Group/i }));

    expect(await screen.findByText("Second thread ready")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reyes Group/i })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Ask the agent to adjust the draft..."), {
      target: { value: "Send the update" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(mocks.sendMessageMock).toHaveBeenCalledWith("agency-1", "thread-2", "Send the update");
    });
  });

  it("opens settings with real account and agency data", async () => {
    render(
      <HomePage
        user={{
          id: "user-1",
          email: "owner@voyage.test",
          displayName: "Agency Owner",
          role: "USER",
          status: "ACTIVE",
          emailVerifiedAt: "2026-05-01T00:00:00.000Z",
          memberships: [
            {
              agencyId: "agency-1",
              role: "OWNER",
              status: "ACTIVE",
              agency: {
                id: "agency-1",
                name: "Olongapo Travel Studio",
                status: "VERIFIED",
                businessPhone: "639001112222",
                businessEmail: "hello@olongapo.example",
                city: "Olongapo City",
                country: "Philippines",
              },
            },
          ],
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /settings/i }));

    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Agency Owner")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Olongapo Travel Studio")).toBeInTheDocument();
    expect(screen.getByDisplayValue("639001112222")).toBeInTheDocument();
    expect(screen.getByDisplayValue("hello@olongapo.example")).toBeInTheDocument();
  });

  it("shows an anchored first-use guided tour until it is dismissed", async () => {
    localStorage.removeItem("voyage-home-tour-completed-v1");

    render(<HomePage user={user} agencyTrips={agencyTrips} onContinue={vi.fn()} />);

    expect(await screen.findByRole("dialog", { name: "First-use tutorial" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create a new itinerary" })).toBeInTheDocument();
    expect(document.querySelector('[data-tour-target="new-itinerary"]')).toBeInTheDocument();
    expect(document.querySelector('[data-tour-spotlight="new-itinerary"]')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Close tutorial backdrop" })).toHaveLength(4);
    });
    expect(document.querySelector('[data-tour-spotlight="new-itinerary"]')).not.toHaveClass("backdrop-blur-[2px]");
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();

    for (let step = 0; step < 4; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }

    fireEvent.click(screen.getByRole("button", { name: "Finish tutorial" }));

    await waitFor(() => {
      expect(localStorage.getItem("voyage-home-tour-completed-v1")).toBe("true");
    });

    expect(screen.queryByRole("dialog", { name: "First-use tutorial" })).not.toBeInTheDocument();
  });

  it("stores completion when the first-use tutorial is skipped", async () => {
    localStorage.removeItem("voyage-home-tour-completed-v1");

    render(<HomePage user={user} agencyTrips={agencyTrips} onContinue={vi.fn()} />);

    expect(await screen.findByRole("dialog", { name: "First-use tutorial" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Skip tutorial" }));

    await waitFor(() => {
      expect(localStorage.getItem("voyage-home-tour-completed-v1")).toBe("true");
    });
  });

  it("closes the first-use tutorial with Escape and stores completion", async () => {
    localStorage.removeItem("voyage-home-tour-completed-v1");

    render(<HomePage user={user} agencyTrips={agencyTrips} onContinue={vi.fn()} />);

    expect(await screen.findByRole("dialog", { name: "First-use tutorial" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(localStorage.getItem("voyage-home-tour-completed-v1")).toBe("true");
    });

    expect(screen.queryByRole("dialog", { name: "First-use tutorial" })).not.toBeInTheDocument();
  });

  it("keeps Tab focus inside the first-use tutorial controls", async () => {
    localStorage.removeItem("voyage-home-tour-completed-v1");

    render(<HomePage user={user} agencyTrips={agencyTrips} onContinue={vi.fn()} />);

    const dialog = await screen.findByRole("dialog", { name: "First-use tutorial" });
    const skipButton = screen.getByRole("button", { name: "Skip tutorial" });
    const nextButton = screen.getByRole("button", { name: "Next" });
    const focusableElements = Array.from(dialog.querySelectorAll("button:not([disabled])"));

    skipButton.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(focusableElements.at(-1));

    nextButton.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(dialog).toContainElement(document.activeElement);
  });

  it("moves the guided tour spotlight through real dashboard targets", async () => {
    localStorage.removeItem("voyage-home-tour-completed-v1");

    render(<HomePage user={user} agencyTrips={agencyTrips} onContinue={vi.fn()} />);

    expect(await screen.findByRole("dialog", { name: "First-use tutorial" })).toBeInTheDocument();
    expect(document.querySelector('[data-tour-spotlight="new-itinerary"]')).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Switch active clients" })).toBeInTheDocument();
    expect(document.querySelector('[data-tour-spotlight="client-switcher"]')).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Work in the planning space" })).toBeInTheDocument();
    expect(document.querySelector('[data-tour-spotlight="workspace"]')).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Use the map context" })).toBeInTheDocument();
    expect(document.querySelector('[data-tour-spotlight="workspace-map"]')).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Replay the guide later" })).toBeInTheDocument();
    expect(document.querySelector('[data-tour-spotlight="settings-replay"]')).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Use the map context" })).toBeInTheDocument();
    expect(document.querySelector('[data-tour-spotlight="workspace-map"]')).toBeInTheDocument();
  });

  it("normalizes saved workspace fields after a successful agency update", async () => {
    const onUpdateAgency = vi.fn(async () => ({
      agency: {
        id: "agency-1",
        name: "Voyage Travel Co",
        status: "VERIFIED",
        businessPhone: "639001112222",
        businessEmail: "hello@voyage.example",
        city: "Olongapo City",
        country: "Philippines",
      },
    }));

    render(
      <SettingsPage
        user={{
          id: "user-1",
          email: "owner@voyage.test",
          displayName: "Agency Owner",
          role: "USER",
          status: "ACTIVE",
          emailVerifiedAt: "2026-05-01T00:00:00.000Z",
        }}
        agency={{
          id: "agency-1",
          name: "Voyage Travel Studio",
          status: "VERIFIED",
          businessPhone: "639001112222",
          businessEmail: "hello@voyage.example",
          city: "Olongapo City",
          country: "Philippines",
        }}
        membership={{ role: "OWNER", status: "ACTIVE" }}
        logout={vi.fn()}
        onUpdateProfile={vi.fn()}
      onUpdateAgency={onUpdateAgency}
      />,
    );

    fireEvent.change(screen.getByLabelText("Agency name"), { target: { value: "  Voyage Travel Co  " } });
    fireEvent.change(screen.getByLabelText("Business phone"), { target: { value: "  +63 900 111 2222  " } });
    fireEvent.change(screen.getByLabelText("Business email"), { target: { value: "  hello@voyage.example  " } });
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "  Olongapo City  " } });
    fireEvent.change(screen.getByLabelText("Country"), { target: { value: "  Philippines  " } });

    expect(screen.getByRole("button", { name: "Save workspace changes" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Save workspace changes" }));

    await waitFor(() => {
      expect(onUpdateAgency).toHaveBeenCalledWith({
        name: "Voyage Travel Co",
        businessPhone: "639001112222",
        businessEmail: "hello@voyage.example",
        city: "Olongapo City",
        country: "Philippines",
      });
    });

    expect(screen.getByLabelText("Agency name")).toHaveValue("Voyage Travel Co");
    expect(screen.getByLabelText("Business phone")).toHaveValue("639001112222");
    expect(screen.getByLabelText("Business email")).toHaveValue("hello@voyage.example");
    expect(screen.getByLabelText("City")).toHaveValue("Olongapo City");
    expect(screen.getByLabelText("Country")).toHaveValue("Philippines");
    expect(screen.getByLabelText("Agency name")).not.toHaveValue("  Voyage Travel Co  ");
    expect(screen.getByRole("button", { name: "Save workspace changes" })).toBeDisabled();
  });

  it("offers a replay tutorial action from settings help", () => {
    const onReplayTutorial = vi.fn();

    render(
      <SettingsPage
        user={{
          id: "user-1",
          email: "owner@voyage.test",
          displayName: "Agency Owner",
          role: "USER",
          status: "ACTIVE",
          emailVerifiedAt: "2026-05-01T00:00:00.000Z",
        }}
        agency={{
          id: "agency-1",
          name: "Voyage Travel Studio",
          status: "VERIFIED",
          businessPhone: "639001112222",
          businessEmail: "hello@voyage.example",
          city: "Olongapo City",
          country: "Philippines",
        }}
        membership={{ role: "OWNER", status: "ACTIVE" }}
        logout={vi.fn()}
        onUpdateProfile={vi.fn()}
        onUpdateAgency={vi.fn()}
        onReplayTutorial={onReplayTutorial}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Replay tutorial" }));

    expect(onReplayTutorial).toHaveBeenCalledTimes(1);
  });
});
