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
    expect(within(scroller).getByRole("heading", { name: "Where conversion is leaking" })).toBeInTheDocument();
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
    const firstSection = screen.getByRole("heading", {
      name: role === "STAFF" ? "Clients waiting on you" : "Needs your eyes today",
    });
    expect(notice.compareDocumentPosition(firstSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("does not show the joined notice on a normal visit", () => {
    render(<HomePage user={agencyUser("STAFF")} initialTab="dashboard" />);

    expect(screen.queryByText(JOINED_NOTICE)).not.toBeInTheDocument();
  });
});
