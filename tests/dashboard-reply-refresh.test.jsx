import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import fixtures from "./fixtures/dashboard-payloads.json";

const mocks = vi.hoisted(() => ({ fetchApi: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
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
