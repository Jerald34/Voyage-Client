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
import DashboardStaleBanner from "../app/agency/[agencyId]/components/dashboard/widgets/DashboardStaleBanner.jsx";
import { resetCalendarCacheForTests } from "../app/hooks/useCalendarEvents.js";

const EMPTY_CALENDAR = {
  from: "2026-09-27",
  to: "2026-11-07",
  generatedAt: "2026-10-03T02:00:00.000Z",
  tripsWithoutDates: 0,
  trips: [],
  events: [],
};

const isCalendar = (path) => String(path).includes("/dashboard/calendar");
const dashboardCalls = () => mocks.fetchApi.mock.calls.filter(([path]) => !isCalendar(path));
const calendarCalls = () => mocks.fetchApi.mock.calls.filter(([path]) => isCalendar(path));

/** The dashboard request fails; the calendar request succeeds. */
function failDashboard() {
  mocks.fetchApi.mockImplementation((path) =>
    isCalendar(path) ? Promise.resolve(EMPTY_CALENDAR) : Promise.reject(new Error("offline")),
  );
}

/** The dashboard request never answers; the calendar request succeeds. */
function stallDashboard() {
  mocks.fetchApi.mockImplementation((path) =>
    isCalendar(path) ? Promise.resolve(EMPTY_CALENDAR) : new Promise(() => {}),
  );
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

describe.each(DASHBOARDS)("$name dashboard loads its calendar on its own", ({ ui, payload }) => {
  it("shows the calendar and asks for it while the dashboard payload is still loading", async () => {
    stallDashboard();
    render(ui({ initialData: null }));

    expect(screen.getByRole("grid")).toBeInTheDocument();
    await waitFor(() => expect(calendarCalls()).toHaveLength(1));
    expect(dashboardCalls()).toHaveLength(1);
    // Only the parts that need the payload wait for it.
    expect(screen.queryByText("All caught up.")).not.toBeInTheDocument();
    expect(screen.queryByText("Ready when you are.")).not.toBeInTheDocument();
    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
  });

  it("keeps the calendar and says the dashboard failed, instead of an endless skeleton or empty states", async () => {
    failDashboard();
    render(ui({ initialData: null }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("We couldn’t load your dashboard.");
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.queryByText("All caught up.")).not.toBeInTheDocument();
    expect(screen.queryByText("Ready when you are.")).not.toBeInTheDocument();
    expect(screen.queryByRole("status", { name: /loading/i })).not.toBeInTheDocument();
  });

  it("asks the dashboard again when Retry is pressed", async () => {
    failDashboard();
    render(ui({ initialData: null }));

    const alert = await screen.findByRole("alert");
    const before = dashboardCalls().length;
    fireEvent.click(within(alert).getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(dashboardCalls().length).toBe(before + 1));
  });

  it("replaces the failure with the dashboard once Retry works", async () => {
    failDashboard();
    render(ui({ initialData: null }));
    const alert = await screen.findByRole("alert");

    mocks.fetchApi.mockImplementation((path) => Promise.resolve(isCalendar(path) ? EMPTY_CALENDAR : payload));
    fireEvent.click(within(alert).getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(screen.getByRole("region", { name: "Needs you today" })).toBeInTheDocument();
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("shows a quiet notice, not an alert, when a refresh fails with data on screen", async () => {
    failDashboard();
    render(ui({ initialData: payload }));

    const notice = await screen.findByRole("status");
    expect(notice).toHaveTextContent("We couldn’t refresh");
    expect(within(notice).getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Needs you today" })).toBeInTheDocument();
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });
});

describe("DashboardStaleBanner", () => {
  it("is an alert when nothing has loaded", () => {
    render(<DashboardStaleBanner hasData={false} onRetry={() => {}} />);

    expect(screen.getByRole("alert")).toHaveTextContent("We couldn’t load your dashboard.");
  });

  it("is a status when old data is still showing", () => {
    render(<DashboardStaleBanner hasData onRetry={() => {}} />);

    expect(screen.getByRole("status")).toHaveTextContent("We couldn’t refresh");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("retries, and gives its button press feedback, a touch target and a focus ring", () => {
    const onRetry = vi.fn();
    render(<DashboardStaleBanner hasData={false} onRetry={onRetry} />);

    const button = screen.getByRole("button", { name: "Retry" });
    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledOnce();
    expect(button.className).toContain("transition-[color,background-color,scale]");
    expect(button.className).toContain("active:scale-[0.97]");
    expect(button.className).toContain("pointer-coarse:min-h-11");
    expect(button.className).toContain("focus-visible:ring-2");
  });

  it("does not let a failed retry escape as an unhandled rejection", async () => {
    const onRetry = vi.fn(() => Promise.reject(new Error("still offline")));
    render(<DashboardStaleBanner hasData={false} onRetry={onRetry} />);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await Promise.resolve();
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
