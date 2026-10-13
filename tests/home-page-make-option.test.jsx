import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  bootstrapAgentWorkspace: vi.fn(),
  createAgentThread: vi.fn(),
  duplicateClientTrip: vi.fn(),
  listAgencyTrips: vi.fn(),
  fetchThreadMessages: vi.fn(),
  fetchItineraryDraft: vi.fn(),
}));

// trip-1 is the original; trip-2 is the copy the server makes, a day-and-a-bit newer.
const CREATED = { "trip-1": "2026-10-01T02:00:00Z", "trip-2": "2026-10-12T03:00:00Z" };
const serverTrip = (id, itineraryId) => ({
  id,
  clientName: "Alice",
  title: "Alice itinerary",
  destinationSummary: "Baguio City",
  status: "IN_REVIEW",
  createdAt: CREATED[id],
  itineraries: [{ id: itineraryId, version: 1 }],
});

vi.mock("../app/lib/api/index.js", async (importOriginal) => ({
  ...(await importOriginal()),
  createAgentThread: api.createAgentThread,
  duplicateClientTrip: api.duplicateClientTrip,
  listAgencyTrips: api.listAgencyTrips,
  fetchThreadMessages: api.fetchThreadMessages,
  fetchItineraryDraft: api.fetchItineraryDraft,
  bootstrapAgentWorkspace: api.bootstrapAgentWorkspace,
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
  api.bootstrapAgentWorkspace.mockResolvedValue({
    trips: [serverTrip("trip-1", "iter-1")],
    threads: [{ id: "thread-1", tripId: "trip-1", itineraryId: "iter-1", createdAt: CREATED["trip-1"] }],
    itinerarySummaries: { "iter-1": { id: "iter-1", title: "Alice itinerary" } },
  });
  api.fetchThreadMessages.mockResolvedValue({ messages: [] });
  // The itinerary GET answers with the itinerary's own fields; the trip's place is not among them.
  api.fetchItineraryDraft.mockImplementation(async (_agencyId, id) => ({ id, title: "Alice itinerary" }));
  api.listAgencyTrips.mockResolvedValue({ trips: [serverTrip("trip-2", "iter-2"), serverTrip("trip-1", "iter-1")] });
});

// What the server answers: the whole new trip row, and the new itinerary's id, status and version.
function copyResponse() {
  return {
    trip: serverTrip("trip-2", "iter-2"),
    itinerary: { id: "iter-2", status: "NEEDS_REVIEW", version: 1 },
    thread: { id: "thread-2", tripId: "trip-2", title: "Alice (another option)", travelerNeeds: null, createdAt: CREATED["trip-2"] },
  };
}

async function openPicker() {
  fireEvent.click(await screen.findByRole("button", { name: /^Current client/ }));
  await screen.findByRole("listbox");
}

const pickerOptions = () => within(screen.getByRole("listbox")).getAllByRole("option");

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
    // Phones have no Approve button, so the notice says where the copy waits, not what to press.
    expect(await screen.findByText("New option created. Adjust it here; it's waiting in review on the Itineraries page.")).toBeInTheDocument();
    expect(screen.queryByText(/approve it/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Planner" })).toHaveAttribute("aria-current", "page");
    // The seeded thread and itinerary are what the Planner hydrates; no second thread is created.
    await waitFor(() => expect(api.fetchThreadMessages).toHaveBeenCalledWith("agency-1", "thread-2", { limit: 50 }));
    expect(api.fetchItineraryDraft).toHaveBeenCalledWith("agency-1", "iter-2");
    expect(api.createAgentThread).not.toHaveBeenCalled();
  });

  it("tells the original from the copy in the Planner's trip picker, newest first", async () => {
    api.duplicateClientTrip.mockResolvedValue({
      trip: { id: "trip-2" },
      itinerary: { id: "iter-2" },
      thread: { id: "thread-2", tripId: "trip-2", title: "Alice itinerary", travelerNeeds: null, createdAt: CREATED["trip-2"] },
    });
    render(<HomePage user={user} initialTab="itineraries" />);

    await clickAnotherOption();
    await screen.findByText(/New option created/);
    // Both threads have loaded: the copy keeps the creation time it was seeded with, so it stays on top.
    await waitFor(() => expect(api.fetchItineraryDraft).toHaveBeenCalledWith("agency-1", "iter-2"));
    fireEvent.click(await screen.findByRole("button", { name: /^Current client/ }));

    const options = within(await screen.findByRole("listbox")).getAllByRole("option");
    await waitFor(() => expect(options[0]).toHaveTextContent("Option 2 · Baguio City"));
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent("Alice itinerary");
    expect(options[0]).toHaveTextContent("In review");
    expect(options[1]).toHaveTextContent("Alice itinerary");
    expect(options[1]).toHaveTextContent("Option 1 · Baguio City");
  });

  it("opens the Planner without waiting for the trip list, and the picker already names the copy", async () => {
    api.duplicateClientTrip.mockResolvedValue(copyResponse());
    // The refresh never answers.
    api.listAgencyTrips.mockReturnValue(new Promise(() => {}));
    render(<HomePage user={user} initialTab="itineraries" />);

    await clickAnotherOption();

    expect(await screen.findByText(/New option created/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Planner" })).toHaveAttribute("aria-current", "page");
    await openPicker();
    await waitFor(() => expect(pickerOptions()[0]).toHaveTextContent("Option 2 · Baguio City"));
    expect(pickerOptions()[0]).toHaveTextContent("In review");
  });

  it("names the copy in the picker right away, before its chat and itinerary have loaded", async () => {
    // The server's itinerary answer has no title, so the copy is named by its trip.
    api.duplicateClientTrip.mockResolvedValue({
      ...copyResponse(),
      trip: { ...serverTrip("trip-2", "iter-2"), title: "Alice Baguio weekend" },
    });
    // The copy's own chat and itinerary never arrive, so the picker only has what the copy seeded.
    api.fetchThreadMessages.mockImplementation((_agencyId, threadId) =>
      threadId === "thread-2" ? new Promise(() => {}) : Promise.resolve({ messages: [] }),
    );
    api.fetchItineraryDraft.mockImplementation((_agencyId, id) =>
      id === "iter-2" ? new Promise(() => {}) : Promise.resolve({ id, title: "Alice itinerary" }),
    );
    render(<HomePage user={user} initialTab="itineraries" />);

    await clickAnotherOption();

    expect(await screen.findByText(/New option created/)).toBeInTheDocument();
    await openPicker();
    await waitFor(() => expect(pickerOptions()[0]).toHaveTextContent("Option 2 · Baguio City"));
    expect(pickerOptions()[0]).toHaveTextContent("Alice Baguio weekend");
    expect(pickerOptions()[0]).not.toHaveTextContent("Client trip");
  });

  it("prefers the itinerary's own title when the server sends one", async () => {
    api.duplicateClientTrip.mockResolvedValue({
      ...copyResponse(),
      trip: { ...serverTrip("trip-2", "iter-2"), title: "Trip title" },
      itinerary: { id: "iter-2", status: "NEEDS_REVIEW", version: 1, title: "Itinerary title" },
    });
    api.fetchThreadMessages.mockImplementation((_agencyId, threadId) =>
      threadId === "thread-2" ? new Promise(() => {}) : Promise.resolve({ messages: [] }),
    );
    api.fetchItineraryDraft.mockImplementation((_agencyId, id) =>
      id === "iter-2" ? new Promise(() => {}) : Promise.resolve({ id, title: "Alice itinerary" }),
    );
    render(<HomePage user={user} initialTab="itineraries" />);

    await clickAnotherOption();

    await screen.findByText(/New option created/);
    await openPicker();
    await waitFor(() => expect(pickerOptions()[0]).toHaveTextContent("Itinerary title"));
    expect(pickerOptions()[0]).not.toHaveTextContent("Trip title");
  });

  it("keeps the copy listed when refreshing the trip list fails", async () => {
    api.duplicateClientTrip.mockResolvedValue(copyResponse());
    api.listAgencyTrips.mockRejectedValue(new Error("offline"));
    render(<HomePage user={user} initialTab="itineraries" />);

    await clickAnotherOption();

    expect(await screen.findByText(/New option created/)).toBeInTheDocument();
    await waitFor(() => expect(console.error).toHaveBeenCalledWith("Failed to refresh agency trips:", expect.any(Error)));
    await openPicker();
    await waitFor(() => expect(pickerOptions()[0]).toHaveTextContent("Option 2 · Baguio City"));
    expect(pickerOptions()[1]).toHaveTextContent("Option 1 · Baguio City");
  });

  it("asks to save the trip first when the server refuses an unsaved or archived trip", async () => {
    api.duplicateClientTrip.mockRejectedValue(Object.assign(new Error("Not saved"), { code: "TRIP_NOT_SAVED", status: 409 }));
    render(<HomePage user={user} initialTab="itineraries" />);

    await clickAnotherOption();

    expect(await screen.findByText("Save this trip before making another option.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Itineraries" })).toHaveAttribute("aria-current", "page");
    expect(api.createAgentThread).not.toHaveBeenCalled();
  });

  it("says there is nothing to copy when the trip has no itinerary yet", async () => {
    api.duplicateClientTrip.mockRejectedValue(Object.assign(new Error("No itinerary"), { code: "ITINERARY_REQUIRED", status: 409 }));
    render(<HomePage user={user} initialTab="itineraries" />);

    await clickAnotherOption();

    expect(await screen.findByText("This trip has no itinerary to copy yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Itineraries" })).toHaveAttribute("aria-current", "page");
    expect(api.createAgentThread).not.toHaveBeenCalled();
  });

  it("asks for a refresh when the trip no longer exists", async () => {
    api.duplicateClientTrip.mockRejectedValue(Object.assign(new Error("Gone"), { code: "TRIP_NOT_FOUND", status: 404 }));
    render(<HomePage user={user} initialTab="itineraries" />);

    await clickAnotherOption();

    expect(await screen.findByText("This trip no longer exists. Refresh the page.")).toBeInTheDocument();
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
