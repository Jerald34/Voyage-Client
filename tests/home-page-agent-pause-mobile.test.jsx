import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The phone layout of home-page-agent-pause.test.jsx: below 900px the sheet's own ChatComposer is the one
// the user types in, wired separately from the desktop panel's.
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

vi.mock("../app/components/trip-dashboard/mobile/useMobileViewport.js", () => ({ default: () => true }));

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

const POPUP = "The agent is paused for your account";
const pauseDetails = { pausedAt: "2026-10-25T07:00:00.000Z", until: null, reason: "Repeated off-topic requests" };

const refusal = (details) =>
  Object.assign(new Error("The agent is paused for your account."), { code: "AGENT_PAUSED", status: 403, details });

// The desktop panel is still in the DOM here (CSS hides it); the sheet's composer comes after it.
const sheetComposerBox = () => screen.getAllByPlaceholderText(/ask|plan|trip/i).at(-1);

function sendTypedOnPhone(text) {
  fireEvent.change(sheetComposerBox(), { target: { value: text } });
  fireEvent.click(screen.getAllByRole("button", { name: "Send message" }).at(-1));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem(tourStorageKey("user-owner"), "true");
  if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = vi.fn();
  api.createAgentThread.mockResolvedValue({ thread: { id: "thread-1", title: "", events: [] } });
});

describe("HomePage on a phone when the agent is paused", () => {
  it("locks the sheet's composer and opens the popup", async () => {
    render(<HomePage user={{ ...user, agentPause: pauseDetails }} initialTab="command-center" />);

    expect(await screen.findByRole("dialog", { name: POPUP })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/ask|plan|trip/i)).toBeNull();
    // One strip in the desktop panel (hidden by CSS) and one in the sheet.
    expect(screen.getAllByText("Agent paused")).toHaveLength(2);
  });

  it("locks, with no failed-send error, when a send is refused, and brings the text back after", async () => {
    api.sendMessage.mockRejectedValueOnce(refusal({ ...pauseDetails, until: new Date(Date.now() + 1500).toISOString() }));
    render(<HomePage user={user} initialTab="command-center" />);

    sendTypedOnPhone("Plan 3 days in Cebu");

    expect(await screen.findByRole("dialog", { name: POPUP })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/ask|plan|trip/i)).toBeNull();
    expect(screen.queryByText("The agent is paused for your account.")).toBeNull();

    const boxes = await screen.findAllByPlaceholderText(/ask|plan|trip/i, undefined, { timeout: 4000 });
    expect(boxes.at(-1).value).toBe("Plan 3 days in Cebu");
  });
});
