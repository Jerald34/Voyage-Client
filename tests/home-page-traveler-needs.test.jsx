import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// HomePage's own suite fails to import in the baseline, so this wiring test carries its own mocks
// (same shape as home-page-dashboard-tab.test.jsx) and drives the real HomePage + useTripPlanning.
vi.mock("../app/components/icons/index.js", () => {
  const names = [
    "SearchIcon", "CloseIcon", "CheckIcon", "ReplyIcon", "ChatIcon", "MapPinIcon", "ArrowLeftIcon",
    "TrashIcon", "DownloadIcon", "PrinterIcon", "ShareIcon", "SettingsIcon", "UserIcon", "MailIcon", "LockIcon",
    "ShieldIcon", "HomeIcon", "PhoneIcon", "GlobeIcon", "ChevronDownIcon", "EyeIcon", "EyeOffIcon",
    "BuildingIcon", "PlusIcon", "CalendarIcon", "StarIcon", "PlaneIcon", "HotelIcon", "ForkKnifeIcon",
    "CarIcon", "ListIcon", "MapIcon", "SparkleIcon", "UsersIcon", "UserGroupIcon", "ZapIcon",
    "CommentIcon", "BookmarkIcon", "LinkIcon", "RefreshIcon", "CheckCircleIcon", "ChevronLeftIcon",
    "ArrowRightIcon", "PresenterIcon", "SortIcon",
  ];
  return Object.fromEntries(names.map((name) => [name, () => null]));
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
  sendMessage: vi.fn(async () => ({ runId: "run-1" })),
}));

vi.mock("../app/lib/api/index.js", async (importOriginal) => ({
  ...(await importOriginal()),
  createAgentThread: api.createAgentThread,
  sendMessage: api.sendMessage,
  bootstrapAgentWorkspace: async () => ({ trips: [], threads: [], itinerarySummaries: {} }),
  fetchThreadMessages: async () => ({ messages: [] }),
  fetchItineraryDraft: async () => null,
}));

import HomePage from "../app/components/trip-dashboard/HomePage.jsx";

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
  localStorage.setItem("voyage-tour-completed-v2", "true");
  if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = vi.fn();
  api.createAgentThread.mockResolvedValue({ thread: { id: "thread-1", title: "", events: [] } });
});

function openNeedsDialog() {
  fireEvent.click(screen.getAllByRole("button", { name: /traveler needs/i })[0]);
  return screen.getByRole("dialog", { name: "Traveler needs" });
}

describe("HomePage traveler needs for new plans", () => {
  it("does not carry one client's needs into the next new itinerary or its first message", async () => {
    render(<HomePage user={user} initialTab="command-center" />);

    // Needs chosen for the first new plan.
    openNeedsDialog();
    fireEvent.click(screen.getByRole("checkbox", { name: /Wheelchair user/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save needs" }));
    expect(screen.getAllByRole("button", { name: /Traveler needs: Wheelchair user/ }).length).toBeGreaterThan(0);

    // Start another new itinerary: the dialog must open clean.
    fireEvent.click(screen.getAllByRole("button", { name: "New Itinerary" })[0]);
    await waitFor(() => expect(screen.queryByRole("button", { name: /Traveler needs: Wheelchair user/ })).toBeNull());
    openNeedsDialog();
    expect(screen.getByRole("checkbox", { name: /Wheelchair user/ })).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // And the first message of that plan carries no needs.
    fireEvent.change(screen.getAllByPlaceholderText(/ask|plan|trip/i)[0], { target: { value: "Plan 3 days in Cebu" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Send message" })[0]);

    await waitFor(() => expect(api.sendMessage).toHaveBeenCalled());
    expect(api.sendMessage).toHaveBeenCalledWith("agency-1", "thread-1", "Plan 3 days in Cebu", [], null);
  });

  it("sends the needs chosen for this plan with its first message", async () => {
    render(<HomePage user={user} initialTab="command-center" />);

    openNeedsDialog();
    fireEvent.click(screen.getByRole("checkbox", { name: /Wheelchair user/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save needs" }));

    fireEvent.change(screen.getAllByPlaceholderText(/ask|plan|trip/i)[0], { target: { value: "Plan Baguio" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Send message" })[0]);

    await waitFor(() => expect(api.sendMessage).toHaveBeenCalled());
    expect(api.sendMessage).toHaveBeenCalledWith("agency-1", "thread-1", "Plan Baguio", [], { needs: ["WHEELCHAIR"], notes: null });
  });

  it("does not re-send the needs with later messages on the same thread", async () => {
    render(<HomePage user={user} initialTab="command-center" />);

    openNeedsDialog();
    fireEvent.click(screen.getByRole("checkbox", { name: /Wheelchair user/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save needs" }));

    const send = async (text, nth) => {
      fireEvent.change(screen.getAllByPlaceholderText(/ask|plan|trip/i)[0], { target: { value: text } });
      fireEvent.click(screen.getAllByRole("button", { name: "Send message" })[0]);
      await waitFor(() => expect(api.sendMessage).toHaveBeenCalledTimes(nth));
    };

    await send("Plan Baguio", 1);
    await waitFor(() => expect(screen.getAllByPlaceholderText(/ask|plan|trip/i)[0].value).toBe(""));
    await send("Make day 2 slower", 2);

    expect(api.sendMessage).toHaveBeenNthCalledWith(1, "agency-1", "thread-1", "Plan Baguio", [], { needs: ["WHEELCHAIR"], notes: null });
    expect(api.sendMessage).toHaveBeenNthCalledWith(2, "agency-1", "thread-1", "Make day 2 slower", [], null);
  });

  it("sends a cleared selection as an empty needs object, never null", async () => {
    render(<HomePage user={user} initialTab="command-center" />);

    openNeedsDialog();
    fireEvent.click(screen.getByRole("checkbox", { name: /Wheelchair user/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save needs" }));
    fireEvent.change(screen.getAllByPlaceholderText(/ask|plan|trip/i)[0], { target: { value: "Plan Baguio" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Send message" })[0]);
    await waitFor(() => expect(api.sendMessage).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getAllByPlaceholderText(/ask|plan|trip/i)[0].value).toBe(""));

    // Staff removes the need on the now-saved thread, then sends again.
    openNeedsDialog();
    fireEvent.click(screen.getByRole("checkbox", { name: /Wheelchair user/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save needs" }));
    fireEvent.change(screen.getAllByPlaceholderText(/ask|plan|trip/i)[0], { target: { value: "No stairs please" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Send message" })[0]);

    await waitFor(() => expect(api.sendMessage).toHaveBeenCalledTimes(2));
    expect(api.sendMessage).toHaveBeenNthCalledWith(2, "agency-1", "thread-1", "No stairs please", [], { needs: [], notes: null });
  });
});

describe("HomePage traveler needs focus", () => {
  it("returns focus to the composer needs toggle when clearing every need removes the chips", async () => {
    render(<HomePage user={user} initialTab="command-center" />);

    openNeedsDialog();
    fireEvent.click(screen.getByRole("checkbox", { name: /Wheelchair user/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save needs" }));

    // Open the dialog from the chips' Edit button, then clear every need.
    const chips = screen.getAllByRole("group", { name: "Traveler needs" })[0];
    const edit = within(chips).getByRole("button", { name: /edit/i });
    edit.focus();
    fireEvent.click(edit);
    fireEvent.click(screen.getByRole("checkbox", { name: /Wheelchair user/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save needs" }));

    await waitFor(() => expect(screen.queryByRole("group", { name: "Traveler needs" })).toBeNull());
    expect(edit.isConnected).toBe(false);
    expect(document.activeElement).toBe(screen.getAllByRole("button", { name: "Add traveler needs" })[0]);
  });
});
