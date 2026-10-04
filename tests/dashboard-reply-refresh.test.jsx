import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import fixtures from "./fixtures/dashboard-payloads.json";

const mocks = vi.hoisted(() => ({ fetchApi: vi.fn(), push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: vi.fn() }),
}));

vi.mock("../app/components/icons/index.js", () => ({
  ChatIcon: () => null,
  CloseIcon: () => null,
  ReplyIcon: () => null,
}));

vi.mock("../app/lib/api/client.js", () => ({
  API_URL: "/api",
  fetchApi: (...args) => mocks.fetchApi(...args),
}));

import OwnerOverview from "../app/agency/[agencyId]/components/dashboard/OwnerOverview.jsx";
import StaffMyWork from "../app/agency/[agencyId]/components/dashboard/StaffMyWork.jsx";
import { resetCalendarCacheForTests } from "../app/hooks/useCalendarEvents.js";

const EMPTY_CALENDAR = {
  from: "2026-09-27",
  to: "2026-11-07",
  generatedAt: "2026-10-03T02:00:00.000Z",
  tripsWithoutDates: 0,
  trips: [],
  events: [],
};

const PENDING_COMMENT = {
  id: "comment-1",
  content: "Can we swap the day 2 lunch spot?",
  status: "PENDING",
  authorName: "Maria",
  createdAt: "2026-09-26T22:00:00.000Z",
};

const isCalendar = (path) => String(path).includes("/dashboard/calendar");
const isDashboard = (path) => /\/dashboard\?/.test(String(path));
const calendarCalls = () => mocks.fetchApi.mock.calls.filter(([path]) => isCalendar(path));
const dashboardCalls = () => mocks.fetchApi.mock.calls.filter(([path]) => isDashboard(path));

function serve(payload) {
  mocks.fetchApi.mockImplementation((path) => {
    const url = String(path);
    if (isCalendar(url)) return Promise.resolve(EMPTY_CALENDAR);
    if (isDashboard(url)) return Promise.resolve(payload);
    if (url.includes("/shares?tripId=")) return Promise.resolve({ shares: [{ id: "share-1" }] });
    if (url.endsWith("/shares/share-1/comments")) return Promise.resolve({ comments: [PENDING_COMMENT] });
    if (url.endsWith("/comments/comment-1/reply")) return Promise.resolve({ comment: { ...PENDING_COMMENT, status: "ADDRESSED" } });
    return new Promise(() => {});
  });
}

const DASHBOARDS = [
  { name: "owner", payload: fixtures.ownerBusy, ui: (props) => <OwnerOverview agencyId="agency-1" {...props} /> },
  { name: "staff", payload: fixtures.staff, ui: (props) => <StaffMyWork agencyId="agency-1" {...props} /> },
];

beforeEach(() => {
  mocks.fetchApi.mockReset();
  mocks.push.mockReset();
  resetCalendarCacheForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each(DASHBOARDS)("$name dashboard after a reply from the trip panel", ({ ui, payload }) => {
  it("reloads the to-do list and the calendar straight away", async () => {
    serve(payload);
    render(ui({ initialData: payload }));
    await waitFor(() => expect(calendarCalls().length).toBeGreaterThan(0));

    const needsYou = screen.getByRole("region", { name: "Needs you today" });
    fireEvent.click(within(needsYou).getAllByRole("button", { name: "Reply" })[0]);
    const panel = await screen.findByRole("dialog", { name: /^Trip comments:/ });
    fireEvent.click(await within(panel).findByRole("button", { name: "Reply" }));
    fireEvent.change(within(panel).getByPlaceholderText("Write a reply…"), { target: { value: "Yes, we can." } });

    const dashboardBefore = dashboardCalls().length;
    const calendarBefore = calendarCalls().length;
    fireEvent.click(within(panel).getByRole("button", { name: "Send Reply" }));

    await waitFor(() => expect(dashboardCalls().length).toBe(dashboardBefore + 1));
    await waitFor(() => expect(calendarCalls().length).toBe(calendarBefore + 1));
  });
});

describe.each(DASHBOARDS)("$name dashboard Recently viewed rows", ({ ui, payload }) => {
  it("open the trip panel with the client's name, not the Command Center", async () => {
    serve(payload);
    render(ui({ initialData: payload }));

    const viewed = screen.getByRole("region", { name: "Recently viewed" });
    fireEvent.click(within(viewed).getByRole("button", { name: /^Kyoto Autumn Escape, Maria Santos/ }));

    const panel = await screen.findByRole("dialog", { name: /^Trip comments: Kyoto Autumn Escape/ });
    expect(within(panel).getByText("Maria Santos")).toBeVisible();
    // Let the panel finish loading, so nothing updates after the test ends.
    expect(await within(panel).findByText(PENDING_COMMENT.content)).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });
});

describe("StaffMyWork recently viewed", () => {
  const renderStaff = (payload) => {
    serve(payload);
    render(<StaffMyWork agencyId="agency-1" initialData={payload} />);
  };

  it("lists recently viewed itineraries above the recent trips", () => {
    renderStaff(fixtures.staff);

    const viewed = screen.getByRole("region", { name: "Recently viewed" });
    const recentTrips = screen.getByRole("heading", { name: "Recent trips" });
    expect(viewed.compareDocumentPosition(recentTrips) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("leaves the card out for a server that doesn't send recent views", () => {
    const older = { ...fixtures.staff };
    delete older.recentViews;
    renderStaff(older);

    expect(screen.queryByRole("region", { name: "Recently viewed" })).not.toBeInTheDocument();
    // The rest of the column is unaffected.
    expect(screen.getByRole("heading", { name: "Recent trips" })).toBeInTheDocument();
  });
});
