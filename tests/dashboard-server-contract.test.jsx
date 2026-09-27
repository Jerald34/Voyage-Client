import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  return screen.getByRole("button", { name: new RegExp(`^${label}:`) });
}

function renderOwner(payload) {
  render(
    <OwnerOverview agencyId="agency-fixture" initialData={payload} onOpenTrip={vi.fn()} onNewTrip={vi.fn()} />,
  );
}

beforeEach(() => {
  mocks.fetchApi.mockReset();
  mocks.fetchApi.mockImplementation(() => new Promise(() => {}));
});

describe("Owner dashboard with real server payloads", () => {
  it("shows win rate as a percentage", () => {
    renderOwner(fixtures.ownerBusy);

    expect(within(kpiTile("Win rate")).getByText("66.7")).toBeInTheDocument();
  });

  it("rounds fractional KPI values to one decimal", () => {
    renderOwner(fixtures.ownerBusy);

    expect(within(kpiTile("Time to first share")).getByText("1.7")).toBeInTheDocument();
    expect(within(kpiTile("Median response time")).getByText("2.5")).toBeInTheDocument();
  });

  it("shows a KPI with no signal this period as an em dash, not zero", () => {
    renderOwner(fixtures.ownerBusy);

    const rating = kpiTile("Avg proposal rating");
    expect(within(rating).getByText("—")).toBeInTheDocument();
    expect(within(rating).queryByText("0.0")).not.toBeInTheDocument();
  });

  it("shows every KPI as no data for a brand-new agency", () => {
    renderOwner(fixtures.ownerEmpty);

    for (const label of ["Win rate", "Time to first share", "Median response time", "Avg proposal rating"]) {
      expect(within(kpiTile(label)).getByText("—")).toBeInTheDocument();
    }
  });

  it("treats slower share and response times as regressions", () => {
    renderOwner(fixtures.ownerBusy);

    for (const label of ["Time to first share", "Median response time"]) {
      expect(within(kpiTile(label)).getByText("▲").parentElement.className).toContain("--danger");
    }
    expect(within(kpiTile("Win rate")).getByText("▲").parentElement.className).toContain("--success");
  });
});

describe("Staff dashboard with real server payloads", () => {
  it("labels the status of each recent trip card", () => {
    render(
      <StaffMyWork
        agencyId="agency-fixture"
        initialData={fixtures.staff}
        onOpenTrip={vi.fn()}
        onNewTrip={vi.fn()}
        onOpenItineraries={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /^Palawan Family Trip\s*Approved/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Bali Honeymoon\s*Draft/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Seoul Food Tour\s*Archived/ })).toBeInTheDocument();
  });
});
