import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useCalendarEvents: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("../app/hooks/useCalendarEvents.js", () => ({
  useCalendarEvents: (...args) => mocks.useCalendarEvents(...args),
  default: (...args) => mocks.useCalendarEvents(...args),
}));

vi.mock("../app/components/icons/index.js", () => ({
  ChatIcon: () => null,
  CloseIcon: () => null,
  ReplyIcon: () => null,
}));

vi.mock("../app/lib/api/client.js", () => ({
  API_URL: "/api",
  fetchApi: () => new Promise(() => {}),
}));

import AgencyDashboardClient from "../app/agency/[agencyId]/components/dashboard/AgencyDashboardClient.jsx";
import AgencyCalendar from "../app/agency/[agencyId]/components/dashboard/widgets/AgencyCalendar.jsx";
import DashboardGreeting from "../app/agency/[agencyId]/components/dashboard/widgets/DashboardGreeting.jsx";
import fixtures from "./fixtures/dashboard-payloads.json";

const CALENDAR = {
  from: "2026-09-27",
  to: "2026-11-07",
  generatedAt: "2026-10-03T02:00:00.000Z",
  tripsWithoutDates: 0,
  trips: [],
  events: [],
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  mocks.useCalendarEvents.mockReset();
  mocks.useCalendarEvents.mockReturnValue({ data: CALENDAR, error: null, isLoading: false, refetch: vi.fn() });
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

/** Server-render `element` at `serverTime`, then hydrate it in the browser at `clientTime`. */
async function hydrateAcrossClocks(element, serverTime, clientTime) {
  vi.setSystemTime(serverTime);
  const html = renderToString(element);
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);

  vi.setSystemTime(clientTime);
  // hydrateRoot is React's own API, not Testing Library's, so declare the act environment.
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const problems = [];
  const consoleError = vi.spyOn(console, "error").mockImplementation((...args) => problems.push(args.map(String).join(" ")));
  await act(async () => {
    hydrateRoot(container, element, { onRecoverableError: (error) => problems.push(String(error?.message ?? error)) });
  });
  return { container, html, problems, consoleError };
}

describe("DashboardGreeting hydration", () => {
  it("renders a greeting with no time of day on the server", () => {
    vi.setSystemTime(new Date(2026, 9, 3, 8));
    const html = renderToString(<DashboardGreeting name="Maria Santos" count={null} onNewTrip={() => {}} />);

    expect(html).toContain("Welcome back, Maria");
    expect(html).not.toMatch(/Good (morning|afternoon|evening)/);
  });

  it("hydrates without a mismatch when the browser's hour differs from the server's", async () => {
    const { container, problems } = await hydrateAcrossClocks(
      <DashboardGreeting name="Maria Santos" count={null} onNewTrip={() => {}} />,
      new Date(2026, 9, 3, 8),
      new Date(2026, 9, 3, 20),
    );

    expect(problems).toEqual([]);
    expect(container.querySelector("h1")).toHaveTextContent("Good evening, Maria");
  });

  it("greets by the browser's clock when it is rendered in the browser", () => {
    vi.setSystemTime(new Date(2026, 9, 3, 8));
    render(<DashboardGreeting name="Maria" count={null} onNewTrip={() => {}} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Good morning, Maria");
  });
});

describe("AgencyCalendar hydration", () => {
  it("renders a neutral placeholder on the server, with no month or today marker", () => {
    vi.setSystemTime(new Date(2026, 9, 31, 22));
    const html = renderToString(<AgencyCalendar agencyId="agency-1" onOpenTrip={() => {}} />);

    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain("October");
    expect(html).not.toContain("today");
    expect(html).not.toContain("role=\"grid\"");
  });

  it("hydrates without a mismatch when the browser is already in the next month", async () => {
    const { container, problems } = await hydrateAcrossClocks(
      <AgencyCalendar agencyId="agency-1" onOpenTrip={() => {}} />,
      new Date(2026, 9, 31, 22),
      new Date(2026, 10, 1, 8),
    );

    expect(problems).toEqual([]);
    expect(container.querySelector("h2")).toHaveTextContent("November 2026");
    expect(container.querySelector('[aria-label="Sunday, November 1, today"]')).not.toBeNull();
  });
});

describe("Agency dashboard route", () => {
  it("greets the signed-in user by name", () => {
    vi.setSystemTime(new Date(2026, 9, 3, 8));
    localStorage.setItem(
      "voyage-user",
      JSON.stringify({ id: "u1", displayName: "Maria Santos", memberships: [{ agencyId: "agency-1", role: "OWNER" }] }),
    );
    render(<AgencyDashboardClient agencyId="agency-1" initialData={fixtures.ownerBusy} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Good morning, Maria");
  });

  it("greets without a name when nobody is stored", () => {
    vi.setSystemTime(new Date(2026, 9, 3, 8));
    render(<AgencyDashboardClient agencyId="agency-1" initialData={fixtures.ownerBusy} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Good morning$/);
  });

  it("greets a staff member by name too", () => {
    vi.setSystemTime(new Date(2026, 9, 3, 8));
    localStorage.setItem("voyage-user", JSON.stringify({ id: "u2", displayName: "Jun Reyes" }));
    render(<AgencyDashboardClient agencyId="agency-1" initialData={fixtures.staff} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Good morning, Jun");
  });
});
