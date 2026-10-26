import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// HomePage's own suite fails to import in the baseline, so this wiring test carries its own mocks
// (same shape as home-page-traveler-needs.test.jsx) and drives the real HomePage + useTripPlanning +
// useAgentPause + AgentPausedModal + the composer.
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

const never = () => new Promise(() => {});

// Everything the page asks for stays pending, except what a test sets up (the /auth/me re-read).
const fetchApiMock = vi.hoisted(() => vi.fn());

vi.mock("../app/lib/api/client.js", () => ({
  API_URL: "/api",
  fetchApi: fetchApiMock,
}));

const api = vi.hoisted(() => ({
  createAgentThread: vi.fn(),
  sendMessage: vi.fn(async () => ({ runId: "run-1" })),
  uploadChatImages: vi.fn(),
}));

vi.mock("../app/lib/api/index.js", async (importOriginal) => ({
  ...(await importOriginal()),
  createAgentThread: api.createAgentThread,
  sendMessage: api.sendMessage,
  uploadChatImages: api.uploadChatImages,
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

const composerBox = () => screen.getAllByPlaceholderText(/ask|plan|trip/i)[0];

function sendTyped(text) {
  fireEvent.change(composerBox(), { target: { value: text } });
  fireEvent.click(screen.getAllByRole("button", { name: "Send message" })[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchApiMock.mockReset();
  fetchApiMock.mockImplementation(never);
  localStorage.clear();
  localStorage.setItem(tourStorageKey("user-owner"), "true");
  if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = vi.fn();
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
  api.createAgentThread.mockResolvedValue({ thread: { id: "thread-1", title: "", events: [] } });
});

describe("HomePage for a user whose agent is paused", () => {
  it("opens the popup, locks the composer, and lets the user reopen the popup from the strip", async () => {
    render(<HomePage user={{ ...user, agentPause: pauseDetails }} initialTab="command-center" />);

    const dialog = await screen.findByRole("dialog", { name: POPUP });
    expect(within(dialog).getByText("Repeated off-topic requests")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/ask|plan|trip/i)).toBeNull();

    fireEvent.click(within(dialog).getByRole("button", { name: "Got it" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: POPUP })).toBeNull());
    expect(screen.getByText("Agent paused")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Why?" }));
    expect(await screen.findByRole("dialog", { name: POPUP })).toBeInTheDocument();
  });

  it("leaves the composer alone for a user who is not paused", async () => {
    render(<HomePage user={user} initialTab="command-center" />);

    expect(composerBox()).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: POPUP })).toBeNull();
    expect(screen.queryByText("Agent paused")).toBeNull();
  });
});

const meCalls = () => fetchApiMock.mock.calls.filter(([path]) => path === "/auth/me");
const serverSays = (agentPause) =>
  fetchApiMock.mockImplementation((path) => (path === "/auth/me" ? Promise.resolve({ user: { ...user, agentPause } }) : never()));
const focusWindow = () => act(async () => { window.dispatchEvent(new Event("focus")); });

describe("HomePage for a user whose pause an administrator lifts while the page is open", () => {
  it("re-reads the user when the window gains focus and unlocks the composer once the server says the pause is lifted", async () => {
    serverSays(null);
    render(<HomePage user={{ ...user, agentPause: pauseDetails }} initialTab="command-center" />);
    await screen.findByRole("dialog", { name: POPUP });
    expect(screen.queryByPlaceholderText(/ask|plan|trip/i)).toBeNull();
    expect(meCalls()).toHaveLength(0);

    await focusWindow();

    expect(meCalls()).toHaveLength(1);
    await waitFor(() => expect(composerBox()).toBeInTheDocument());
    expect(screen.queryByRole("dialog", { name: POPUP })).toBeNull();
    expect(screen.queryByText("Agent paused")).toBeNull();
  });

  it("stays locked when the server says the pause is still on", async () => {
    serverSays(pauseDetails);
    render(<HomePage user={{ ...user, agentPause: pauseDetails }} initialTab="command-center" />);
    await screen.findByRole("dialog", { name: POPUP });

    await focusWindow();

    await waitFor(() => expect(meCalls()).toHaveLength(1));
    expect(screen.queryByPlaceholderText(/ask|plan|trip/i)).toBeNull();
    expect(screen.getByRole("dialog", { name: POPUP })).toBeInTheDocument();
  });

  it("does not ask the server anything on focus for a user who is not paused", async () => {
    serverSays(null);
    render(<HomePage user={user} initialTab="command-center" />);

    await focusWindow();

    expect(meCalls()).toHaveLength(0);
    expect(composerBox()).toBeInTheDocument();
  });

  it("unlocks a pause learned from a refusal when the user was loaded before the pause and the admin has since resumed", async () => {
    api.sendMessage.mockRejectedValueOnce(refusal(pauseDetails));
    serverSays(null);
    render(<HomePage user={user} initialTab="command-center" />);
    sendTyped("Plan 3 days in Cebu");
    await screen.findByRole("dialog", { name: POPUP });
    expect(screen.queryByPlaceholderText(/ask|plan|trip/i)).toBeNull();

    await focusWindow();

    await waitFor(() => expect(composerBox()).toBeInTheDocument());
    expect(screen.queryByRole("dialog", { name: POPUP })).toBeNull();
    expect(screen.queryByText("Agent paused")).toBeNull();
  });

  it("has a Check again button in the popup that unlocks the composer and closes the popup", async () => {
    serverSays(null);
    render(<HomePage user={{ ...user, agentPause: pauseDetails }} initialTab="command-center" />);
    const dialog = await screen.findByRole("dialog", { name: POPUP });

    fireEvent.click(within(dialog).getByRole("button", { name: "Check again" }));

    await waitFor(() => expect(composerBox()).toBeInTheDocument());
    expect(screen.queryByRole("dialog", { name: POPUP })).toBeNull();
    expect(meCalls()).toHaveLength(1);
  });

  it("tells the user the pause is still on when Check again finds it so", async () => {
    serverSays(pauseDetails);
    render(<HomePage user={{ ...user, agentPause: pauseDetails }} initialTab="command-center" />);
    const dialog = await screen.findByRole("dialog", { name: POPUP });

    fireEvent.click(within(dialog).getByRole("button", { name: "Check again" }));

    expect(await within(dialog).findByText("Still paused. Checked just now.")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/ask|plan|trip/i)).toBeNull();
  });

  it("tells the user when Check again could not reach the server", async () => {
    fetchApiMock.mockImplementation((path) => (path === "/auth/me" ? Promise.reject(new Error("offline")) : never()));
    render(<HomePage user={{ ...user, agentPause: pauseDetails }} initialTab="command-center" />);
    const dialog = await screen.findByRole("dialog", { name: POPUP });

    fireEvent.click(within(dialog).getByRole("button", { name: "Check again" }));

    expect(await within(dialog).findByText("Couldn't check right now. Try again in a moment.")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/ask|plan|trip/i)).toBeNull();
  });
});

describe("HomePage when the server refuses a send because the agent was paused after the page loaded", () => {
  it("opens the popup and locks the composer without a failed-send error or a ghost message", async () => {
    api.sendMessage.mockRejectedValueOnce(refusal(pauseDetails));
    render(<HomePage user={user} initialTab="command-center" />);

    sendTyped("Plan 3 days in Cebu");

    expect(await screen.findByRole("dialog", { name: POPUP })).toBeInTheDocument();
    expect(screen.getByText("Agent paused")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/ask|plan|trip/i)).toBeNull();
    // Neither an error line under the composer nor the unsent message in the chat.
    expect(screen.queryByText("The agent is paused for your account.")).toBeNull();
    expect(within(screen.getByTestId("chat-log")).queryByText("Plan 3 days in Cebu")).toBeNull();
  });

  it("puts the typed message back in the composer for when the pause ends", async () => {
    const until = new Date(Date.now() + 1500).toISOString();
    api.sendMessage.mockRejectedValueOnce(refusal({ ...pauseDetails, until }));
    render(<HomePage user={user} initialTab="command-center" />);

    sendTyped("Plan 3 days in Cebu");
    await screen.findByRole("dialog", { name: POPUP });
    expect(screen.queryByPlaceholderText(/ask|plan|trip/i)).toBeNull();

    const box = await screen.findByPlaceholderText(/ask|plan|trip/i, undefined, { timeout: 4000 });
    expect(box.value).toBe("Plan 3 days in Cebu");
    expect(within(screen.getByTestId("chat-log")).queryByText("Plan 3 days in Cebu")).toBeNull();
    expect(api.sendMessage).toHaveBeenCalledTimes(1);
  });

  it("puts attached images back too when the upload is what the server refused", async () => {
    api.uploadChatImages.mockRejectedValueOnce(refusal({ ...pauseDetails, until: new Date(Date.now() + 1500).toISOString() }));
    const { container } = render(<HomePage user={user} initialTab="command-center" />);

    const picture = new File(["x"], "pic.png", { type: "image/png" });
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [picture] } });
    expect(await screen.findAllByAltText("Attachment preview")).toHaveLength(1);
    sendTyped("Look at this");

    await screen.findByRole("dialog", { name: POPUP });
    expect(api.sendMessage).not.toHaveBeenCalled();

    const box = await screen.findByPlaceholderText(/ask|plan|trip/i, undefined, { timeout: 4000 });
    expect(box.value).toBe("Look at this");
    expect(screen.getAllByAltText("Attachment preview")).toHaveLength(1);
  });

  it("still locks when this device's clock thinks the pause already ended", async () => {
    const skewed = { ...pauseDetails, until: new Date(Date.now() - 10 * 60 * 1000).toISOString() };
    api.sendMessage.mockRejectedValueOnce(refusal(skewed));
    render(<HomePage user={user} initialTab="command-center" />);

    sendTyped("Plan 3 days in Cebu");

    expect(await screen.findByRole("dialog", { name: POPUP })).toBeInTheDocument();
    expect(screen.getByText(/^Agent paused until/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/ask|plan|trip/i)).toBeNull();
  });

  it("keeps showing other send errors the usual way, with no popup", async () => {
    api.sendMessage.mockRejectedValueOnce(new Error("Network down."));
    render(<HomePage user={user} initialTab="command-center" />);

    sendTyped("Plan 3 days in Cebu");

    expect(await screen.findByText("Network down.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: POPUP })).toBeNull();
    expect(composerBox()).toBeInTheDocument();
  });
});
