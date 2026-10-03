import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Real payloads produced by the server's dashboard service — regenerate with
// Voyage-Server/scripts/export-dashboard-fixtures.ts, never edit by hand.
import fixtures from "./fixtures/dashboard-payloads.json";

const mocks = vi.hoisted(() => ({
  fetchApi: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("../app/components/icons/index.js", () => ({
  ChatIcon: () => null,
  CloseIcon: () => null,
  ReplyIcon: () => null,
}));

// Every API module goes through fetchApi. Leave requests pending so the
// dashboards keep rendering the server payload they were given.
vi.mock("../app/lib/api/client.js", () => ({
  API_URL: "/api",
  fetchApi: (...args) => mocks.fetchApi(...args),
}));

import OwnerOverview from "../app/agency/[agencyId]/components/dashboard/OwnerOverview.jsx";
import StaffMyWork from "../app/agency/[agencyId]/components/dashboard/StaffMyWork.jsx";

function kpiTile(label) {
  return screen.getByRole("group", { name: new RegExp(`^${label}:`) });
}

/** The "Needs you today" list, expanded so every row is on screen. */
function needsYouList() {
  const list = screen.getByRole("region", { name: "Needs you today" });
  const showAll = within(list).queryByRole("button", { name: /^Show all/ });
  if (showAll) fireEvent.click(showAll);
  return list;
}

function renderOwner(payload) {
  render(
    <OwnerOverview agencyId="agency-fixture" initialData={payload} onOpenTrip={vi.fn()} onNewTrip={vi.fn()} />,
  );
}

function renderStaff() {
  render(
    <StaffMyWork
      agencyId="agency-fixture"
      initialData={fixtures.staff}
      onOpenTrip={vi.fn()}
      onNewTrip={vi.fn()}
      onOpenItineraries={vi.fn()}
    />,
  );
}

/** React reports clashing list keys through console.error. */
function captureKeyWarnings() {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  return () => error.mock.calls.flat().map(String).filter((message) => message.includes("same key"));
}

beforeEach(() => {
  mocks.fetchApi.mockReset();
  mocks.fetchApi.mockImplementation(() => new Promise(() => {}));
  // Relative times ("Waiting 6h") count from when the server built the payloads.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(fixtures.ownerBusy.generatedAt));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Owner dashboard with real server payloads", () => {
  it("shows win rate as a percentage", () => {
    renderOwner(fixtures.ownerBusy);

    expect(within(kpiTile("Win rate")).getByText("66.7")).toBeInTheDocument();
  });

  it("rounds fractional KPI values to one decimal", () => {
    renderOwner(fixtures.ownerBusy);

    expect(within(kpiTile("Time to share")).getByText("1.7")).toBeInTheDocument();
    expect(within(kpiTile("Time to reply")).getByText("2.5")).toBeInTheDocument();
  });

  it("shows a KPI with no signal this period as an em dash, not zero", () => {
    renderOwner(fixtures.ownerBusy);

    const rating = kpiTile("Client rating");
    expect(within(rating).getByText("—")).toBeInTheDocument();
    expect(within(rating).queryByText("0.0")).not.toBeInTheDocument();
  });

  it("shows every KPI as no data for a brand-new agency", () => {
    renderOwner(fixtures.ownerEmpty);

    for (const label of ["Win rate", "Time to share", "Time to reply", "Client rating"]) {
      expect(within(kpiTile(label)).getByText("—")).toBeInTheDocument();
    }
  });

  it("treats slower share and response times as regressions", () => {
    renderOwner(fixtures.ownerBusy);

    expect(within(kpiTile("Time to share")).getByText("0.8d slower").className).toContain("--danger");
    expect(within(kpiTile("Time to reply")).getByText("1.2h slower").className).toContain("--danger");
    expect(within(kpiTile("Win rate")).getByText("+16.7 pts").className).toContain("--success");
  });
});

describe("Owner dashboard in plain words", () => {
  it("explains what each number measures", () => {
    renderOwner(fixtures.ownerBusy);

    expect(kpiTile("Win rate")).toHaveAccessibleDescription("Approved trips out of all approved and archived trips");
    expect(kpiTile("Time to share")).toHaveAccessibleDescription(
      "Average days from a new trip to sharing its first itinerary",
    );
    expect(kpiTile("Time to reply")).toHaveAccessibleDescription(
      "Typical time your team takes to answer a client comment",
    );
    expect(kpiTile("Client rating")).toHaveAccessibleDescription("Average stars clients gave your shared itineraries");
  });

  it("says how many shared itineraries the client rating is based on", () => {
    renderOwner(fixtures.ownerBusy);

    expect(within(kpiTile("Client rating")).getByText("0 of 3 rated")).toBeInTheDocument();
  });

  it("names the period the numbers cover and what they are compared with", () => {
    renderOwner(fixtures.ownerBusyWeek);

    const insights = screen.getByRole("complementary", { name: "Insights" });
    expect(within(insights).getByText("Last 7 days, compared with the 7 days before")).toBeInTheDocument();
  });

  it("describes trip progress without funnel jargon", () => {
    renderOwner(fixtures.ownerBusy);

    const progress = screen.getByRole("region", { name: "Trip progress" });
    expect(within(progress).getByText("Last 30 days: 6 trips created, 2 approved.")).toBeInTheDocument();
    expect(within(progress).getByRole("button", { name: /^Shared with client: 3\./ })).toBeInTheDocument();
    expect(within(progress).getByRole("button", { name: /^Viewed by client: 3\./ })).toBeInTheDocument();
    expect(within(progress).getByText("Biggest drop: drafted to shared (50%)")).toBeInTheDocument();
  });

  it("greets the viewer and says how much needs them today", () => {
    renderOwner(fixtures.ownerBusy);

    expect(screen.getByRole("heading", { level: 1, name: /^Good (morning|afternoon|evening)$/ })).toBeInTheDocument();
    expect(screen.getByText("7 things need you today")).toBeInTheDocument();
  });

  it("says the to-do list is clear without placeholder counts", () => {
    renderOwner(fixtures.ownerEmpty);

    expect(screen.getByText("All caught up.")).toBeInTheDocument();
    expect(screen.getByText("Nothing needs your attention right now.")).toBeInTheDocument();
    expect(screen.queryByText(/N active shares/)).not.toBeInTheDocument();
  });

  it("shows this month's calendar beside the to-do list", () => {
    renderOwner(fixtures.ownerBusy);

    expect(screen.getByRole("heading", { name: "September 2026" })).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "September 2026" })).toBeInTheDocument();
  });
});

describe("Owner to-do list says why each trip is on it", () => {
  it("lists the low rating first and the stale draft last", () => {
    renderOwner(fixtures.ownerBusy);

    const rows = within(needsYouList()).getAllByRole("listitem");
    expect(rows).toHaveLength(7);
    expect(rows[0]).toHaveTextContent("Rated 2 out of 5");
    expect(rows[rows.length - 1]).toHaveTextContent("Last edited 9d ago");
  });

  it("quotes each unread client comment and how long it has waited", () => {
    renderOwner(fixtures.ownerBusy);

    const list = needsYouList();
    expect(within(list).getByText("“Is the ryokan wheelchair accessible? My father uses one.”")).toBeInTheDocument();
    expect(within(list).getByText("Waiting 1d")).toBeInTheDocument();
    expect(within(list).getByText("“Can we swap the day 2 lunch spot?”")).toBeInTheDocument();
    expect(within(list).getByText("Waiting 6h")).toBeInTheDocument();
  });

  it("shows how often a client viewed a proposal nobody has followed up", () => {
    renderOwner(fixtures.ownerBusy);

    const list = needsYouList();
    expect(within(list).getByText("Viewed 4 times")).toBeInTheDocument();
    expect(within(list).getByText("Last viewed 5h ago")).toBeInTheDocument();
    expect(within(list).getByText("Viewed 2 times")).toBeInTheDocument();
    expect(within(list).getByText("Last viewed 6d ago")).toBeInTheDocument();
  });

  it("shows how long a stuck draft has gone untouched", () => {
    renderOwner(fixtures.ownerBusy);

    const list = needsYouList();
    expect(within(list).getByText("Batanes Road Trip")).toBeInTheDocument();
    expect(within(list).getByText("Last edited 9d ago")).toBeInTheDocument();
  });

  it("shows when an expiring itinerary link runs out", () => {
    renderOwner(fixtures.ownerBusy);

    expect(within(needsYouList()).getByText("Link expires in 20h")).toBeInTheDocument();
  });

  it("shows the low rating a client gave and when", () => {
    renderOwner(fixtures.ownerBusy);

    const list = needsYouList();
    expect(within(list).getByText("Rated 2 out of 5")).toBeInTheDocument();
    expect(within(list).getByText("6d ago")).toBeInTheDocument();
  });

  it("lists two comments on the same trip as separate rows", () => {
    const keyWarnings = captureKeyWarnings();

    renderOwner(fixtures.ownerBusy);

    expect(keyWarnings()).toEqual([]);
  });
});

describe("Staff dashboard with real server payloads", () => {
  it("labels the status of each recent trip card", () => {
    renderStaff();

    expect(screen.getByRole("button", { name: /^Palawan Family Trip\s*Approved/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Bali Honeymoon\s*Draft/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Seoul Food Tour\s*Archived/ })).toBeInTheDocument();
  });

  it("says why each client is waiting", () => {
    renderStaff();

    const worklist = screen.getByRole("region", { name: "Clients waiting on you" });
    expect(within(worklist).getByText("“Can we swap the day 2 lunch spot?”")).toBeInTheDocument();
    for (const text of ["Waiting 1d", "Waiting 6h", "Last edited 4d ago", "Link expires in 20h", "Starts in 3 days"]) {
      expect(within(worklist).getByText(text)).toBeInTheDocument();
    }
  });

  it("lists two comments on the same trip as separate rows", () => {
    const keyWarnings = captureKeyWarnings();

    renderStaff();

    expect(keyWarnings()).toEqual([]);
  });

  it("has no period switcher, since nothing on My work depends on the period", () => {
    renderStaff();

    expect(screen.queryByRole("radiogroup", { name: "Time period" })).not.toBeInTheDocument();
  });

  it("counts trips in plain words", () => {
    renderStaff();

    const counts = screen.getByRole("group", { name: "Your trips by status" });
    expect(within(counts).getByRole("button", { name: /Traveling now/ })).toBeInTheDocument();
  });
});
