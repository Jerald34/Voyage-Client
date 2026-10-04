import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import fixtures from "./fixtures/dashboard-payloads.json";

// icons/index.js is JSX in a .js file, which Vite cannot parse — stub every export.
vi.mock("../app/components/icons/index.js", () => {
  const names = [
    "SearchIcon", "CloseIcon", "CheckIcon", "ReplyIcon", "ChatIcon", "MapPinIcon", "ArrowLeftIcon",
    "TrashIcon", "DownloadIcon", "ShareIcon", "SettingsIcon", "UserIcon", "MailIcon", "LockIcon",
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

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

vi.mock("../app/hooks/useAuth.js", () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

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

// Serve the dashboards real server payloads without polling.
vi.mock("../app/hooks/useDashboardPoll.js", () => {
  const useDashboardPoll = ({ view }) => ({
    data: view === "staff" ? fixtures.staff : fixtures.ownerBusy,
    isStale: false,
    isFetching: false,
    error: null,
    refetch: () => {},
  });
  return { default: useDashboardPoll, useDashboardPoll };
});

// Every other request stays pending so nothing updates state after render.
vi.mock("../app/lib/api/client.js", () => ({
  API_URL: "/api",
  fetchApi: () => new Promise(() => {}),
}));

import HomePage from "../app/components/trip-dashboard/HomePage.jsx";

const JOINED_NOTICE = "You joined this agency. Your workspace access is ready.";

function agencyUser(role) {
  return {
    id: `user-${role.toLowerCase()}`,
    displayName: "Mara",
    accountType: "AGENCY_USER",
    memberships: [
      {
        agencyId: "agency-fixture",
        role,
        status: "ACTIVE",
        agency: { id: "agency-fixture", name: "Voyage Test Agency", status: "VERIFIED" },
      },
    ],
  };
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("voyage-tour-completed-v2", "true");
});

describe("HomePage Dashboard tab", () => {
  it("gives the dashboard its own scroll container so it can scroll on phones", () => {
    render(<HomePage user={agencyUser("OWNER")} initialTab="dashboard" />);

    const scroller = screen.getByTestId("dashboard-scroll");
    expect(scroller).toHaveClass("min-h-0", "overflow-y-auto");
    expect(
      within(scroller).getByRole("heading", { level: 1, name: /^Good (morning|afternoon|evening), Mara$/ }),
    ).toBeInTheDocument();
  });

  it("shows no Command Center header content on the Dashboard", () => {
    render(<HomePage user={agencyUser("OWNER")} initialTab="dashboard" />);

    expect(screen.queryByRole("button", { name: "New Itinerary" })).not.toBeInTheDocument();
    // The label is split across nested spans, so match the button by its accessible name.
    expect(screen.queryByRole("button", { name: "Save to Client" })).not.toBeInTheDocument();
  });

  it("always renders the compact header on the Dashboard and hides it on desktop with CSS", () => {
    render(<HomePage user={agencyUser("OWNER")} initialTab="dashboard" />);

    // Rendered unconditionally, so phones get the menu button on first paint
    // instead of after a JS media-query check. jsdom applies no CSS, so assert
    // the class that hides it at >= 900px.
    const menuButton = screen.getByRole("button", { name: "Toggle menu" });
    expect(menuButton.closest("header")).toHaveClass("min-[900px]:hidden");
  });

  it("does not hide the full header on the Command Center", () => {
    render(<HomePage user={agencyUser("OWNER")} initialTab="command-center" />);

    const menuButton = screen.getByRole("button", { name: "Toggle menu" });
    expect(menuButton.closest("header")).not.toHaveClass("min-[900px]:hidden");
  });

  it("keeps the Command Center header on the Command Center tab", () => {
    render(<HomePage user={agencyUser("OWNER")} initialTab="command-center" />);

    expect(screen.getByRole("button", { name: "New Itinerary" })).toBeInTheDocument();
  });

  it("falls back to the Command Center when the user has no agency workspace", () => {
    const { container } = render(
      <HomePage user={{ id: "user-new", displayName: "New", memberships: [] }} initialTab="dashboard" />,
    );

    expect(container.querySelector('[data-tour-target="workspace"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Command Center" })).toHaveAttribute("aria-current", "page");
  });

  it.each(["OWNER", "STAFF"])("greets a newly joined %s member at the top of the dashboard", (role) => {
    render(<HomePage user={agencyUser(role)} initialTab="dashboard" showJoinedNotice />);

    // Above the first dashboard section, not buried in the Team section at the bottom.
    const notice = screen.getByText(JOINED_NOTICE);
    const firstSection = screen.getByRole("heading", { name: "Needs you today" });
    expect(notice.compareDocumentPosition(firstSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("does not show the joined notice on a normal visit", () => {
    render(<HomePage user={agencyUser("STAFF")} initialTab="dashboard" />);

    expect(screen.queryByText(JOINED_NOTICE)).not.toBeInTheDocument();
  });
});
