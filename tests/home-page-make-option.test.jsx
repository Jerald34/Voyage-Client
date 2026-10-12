import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// HomePage's own suite fails to import in the baseline, so this wiring test carries its own mocks
// (same shape as home-page-traveler-needs.test.jsx) and drives the real HomePage, Itineraries page
// and useTripPlanning to check what "Another option" does once the server has made the copy.
vi.mock("../app/components/icons/index.js", () => {
  const Icon = () => null;
  const isIcon = (name) => typeof name === "string" && name !== "then";
  // vitest checks `name in module` before reading an export, so answer `has` too.
  return new Proxy(
    { __esModule: true },
    {
      get: (target, name) => (name in target ? target[name] : isIcon(name) ? Icon : undefined),
      has: (target, name) => name in target || isIcon(name),
    },
  );
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

vi.mock("next/dynamic", () => ({ default: () => () => null }));

vi.mock("../app/hooks/useAuth.js", () => ({ useAuth: () => ({ logout: vi.fn() }) }));

vi.mock("../app/hooks/useAgentRunStream.js", () => ({
  useAgentRunStream: () => ({
    isStreaming: false,
    runStatus: "idle",
    assistantMessage: "",
    completedMessageContent: null,
    completedMessageProcess: null,
    tasks: [],
    tasksTouchedThisRun: new Set(),
    toolCalls: [],
    thoughtEntries: [],
    mapMarkers: [],
    routeEstimates: [],
    activeToolLabel: null,
    lastItineraryUpdate: null,
    streamingItinerary: null,
    error: null,
    startStream: vi.fn(),
    stopStream: vi.fn(),
  }),
}));

vi.mock("../app/hooks/useDashboardPoll.js", () => {
  const useDashboardPoll = () => ({ data: null, isStale: false, isFetching: false, error: null, refetch: () => {} });
  return { default: useDashboardPoll, useDashboardPoll };
});

vi.mock("../app/lib/api/client.js", () => ({
  API_URL: "/api",
  fetchApi: () => new Promise(() => {}),
}));

const api = vi.hoisted(() => ({
  createAgentThread: vi.fn(),
  duplicateClientTrip: vi.fn(),
  listAgencyTrips: vi.fn(),
  fetchThreadMessages: vi.fn(),
  fetchItineraryDraft: vi.fn(),
}));

const serverTrip = (id, itineraryId) => ({
  id,
  clientName: "Alice",
  title: "Alice itinerary",
  destinationSummary: "Baguio City",
  status: "IN_REVIEW",
  createdAt: "2026-10-12T02:00:00Z",
  itineraries: [{ id: itineraryId, version: 1 }],
});

vi.mock("../app/lib/api/index.js", async (importOriginal) => ({
  ...(await importOriginal()),
  createAgentThread: api.createAgentThread,
  duplicateClientTrip: api.duplicateClientTrip,
  listAgencyTrips: api.listAgencyTrips,
  fetchThreadMessages: api.fetchThreadMessages,
  fetchItineraryDraft: api.fetchItineraryDraft,
  bootstrapAgentWorkspace: async () => ({
    trips: [serverTrip("trip-1", "iter-1")],
    threads: [],
    itinerarySummaries: {},
  }),
}));

import HomePage from "../app/components/trip-dashboard/HomePage.jsx";
import { tourStorageKey } from "../app/components/trip-dashboard/tutorial/tutorialContent.js";

const user = {
  id: "user-owner",
  displayName: "Mara",
  accountType: "AGENCY_USER",
  memberships: [
    {
      agencyId: "agency-1",
      role: "OWNER",
      status: "ACTIVE",
      agency: { id: "agency-1", name: "Voyage Test Agency", status: "VERIFIED" },
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem(tourStorageKey("user-owner"), "true");
  if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.spyOn(console, "error").mockImplementation(() => {});
  api.fetchThreadMessages.mockResolvedValue({ messages: [] });
  api.fetchItineraryDraft.mockResolvedValue(null);
  api.listAgencyTrips.mockResolvedValue({ trips: [serverTrip("trip-1", "iter-1"), serverTrip("trip-2", "iter-2")] });
});

async function clickAnotherOption() {
  const button = await screen.findByRole("button", { name: "Make another option for Alice" });
  fireEvent.click(button);
}

describe("HomePage: Another option on the Itineraries page", () => {
  it("opens the copy in the Planner, loads its own thread and says so", async () => {
    api.duplicateClientTrip.mockResolvedValue({
      trip: { id: "trip-2" },
      itinerary: { id: "iter-2" },
      thread: { id: "thread-2", tripId: "trip-2", title: "Alice itinerary", travelerNeeds: null, createdAt: "2026-10-12T03:00:00Z" },
    });
    render(<HomePage user={user} initialTab="itineraries" />);

    await clickAnotherOption();

    expect(api.duplicateClientTrip).toHaveBeenCalledWith("agency-1", "trip-1");
    expect(await screen.findByText(/New option created/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Planner" })).toHaveAttribute("aria-current", "page");
    // The seeded thread and itinerary are what the Planner hydrates; no second thread is created.
    await waitFor(() => expect(api.fetchThreadMessages).toHaveBeenCalledWith("agency-1", "thread-2", { limit: 50 }));
    expect(api.fetchItineraryDraft).toHaveBeenCalledWith("agency-1", "iter-2");
    expect(api.createAgentThread).not.toHaveBeenCalled();
  });

  it("asks to save the trip first when the server refuses an unsaved or archived trip", async () => {
    api.duplicateClientTrip.mockRejectedValue(Object.assign(new Error("Not saved"), { code: "TRIP_NOT_SAVED", status: 409 }));
    render(<HomePage user={user} initialTab="itineraries" />);

    await clickAnotherOption();

    expect(await screen.findByText("Save this trip before making another option.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Itineraries" })).toHaveAttribute("aria-current", "page");
    expect(api.createAgentThread).not.toHaveBeenCalled();
  });

  it("says the copy failed for any other error and stays on the Itineraries page", async () => {
    api.duplicateClientTrip.mockRejectedValue(Object.assign(new Error("Boom"), { code: "UNKNOWN_ERROR", status: 500 }));
    render(<HomePage user={user} initialTab="itineraries" />);

    await clickAnotherOption();

    expect(await screen.findByText("Couldn't copy this trip. Try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Itineraries" })).toHaveAttribute("aria-current", "page");
    // The button comes back so the agent can try again.
    expect(screen.getByRole("button", { name: "Make another option for Alice" })).toBeEnabled();
  });
});
