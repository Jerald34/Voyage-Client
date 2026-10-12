import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ fetchPlanUsage: vi.fn() }));
vi.mock("../app/lib/api/agency.js", () => api);

import PlanUsageCard from "../app/components/settings/PlanUsageCard.jsx";

const usage = (overrides = {}) => ({
  usage: {
    periodStart: "2026-09-30T16:00:00.000Z",
    periodEnd: "2026-10-31T16:00:00.000Z",
    itinerariesCreated: 18,
    agentRequests: 85,
    activeMembers: 3,
    ...overrides,
  },
});

beforeEach(() => {
  api.fetchPlanUsage.mockReset();
});

describe("PlanUsageCard", () => {
  it("says the agency is on the free pilot and shows this month's usage", async () => {
    api.fetchPlanUsage.mockResolvedValue(usage());
    render(<PlanUsageCard agencyId="agency-1" />);

    expect(await screen.findByText("18")).toBeInTheDocument();
    expect(screen.getByText(/free during the pilot/i)).toBeInTheDocument();
    expect(screen.getByText("Itineraries created")).toBeInTheDocument();
    expect(screen.getByText("85")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(api.fetchPlanUsage).toHaveBeenCalledWith("agency-1");
  });

  it("names the cheapest plan that covers this month", async () => {
    api.fetchPlanUsage.mockResolvedValue(usage());
    render(<PlanUsageCard agencyId="agency-1" />);

    expect(await screen.findByText("At this month's usage, Pro (₱6,990 a month) covers you.")).toBeInTheDocument();
    const plans = screen.getByRole("list", { name: "Plans" });
    expect(within(plans).getAllByRole("listitem")).toHaveLength(3);
    expect(within(plans).getByText(/Pro/).closest("li")).toHaveAttribute("aria-current", "true");
  });

  it("points heavy usage to a custom plan", async () => {
    api.fetchPlanUsage.mockResolvedValue(usage({ itinerariesCreated: 140 }));
    render(<PlanUsageCard agencyId="agency-1" />);

    expect(await screen.findByText(/above every plan/i)).toBeInTheDocument();
  });

  it("says so when usage can't load", async () => {
    api.fetchPlanUsage.mockRejectedValue(new Error("offline"));
    render(<PlanUsageCard agencyId="agency-1" />);

    expect(await screen.findByText("Couldn't load this month's usage. Try again later.")).toBeInTheDocument();
  });
});
