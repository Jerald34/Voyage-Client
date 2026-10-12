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

const statValue = (label) => within(screen.getByText(label).parentElement);

describe("PlanUsageCard", () => {
  it("says the agency is on the free pilot and ties each usage number to its label", async () => {
    api.fetchPlanUsage.mockResolvedValue(usage());
    render(<PlanUsageCard agencyId="agency-1" />);

    expect(await screen.findByText("Itineraries created")).toBeInTheDocument();
    expect(screen.getByText(/free during the pilot/i)).toBeInTheDocument();
    expect(statValue("Itineraries created").getByText("18")).toBeInTheDocument();
    expect(statValue("Messages to the agent").getByText("85")).toBeInTheDocument();
    expect(statValue("Team members").getByText("3")).toBeInTheDocument();
    expect(api.fetchPlanUsage).toHaveBeenCalledWith("agency-1");
  });

  it("shows a loading message while the usage is on its way", () => {
    api.fetchPlanUsage.mockReturnValue(new Promise(() => {}));
    render(<PlanUsageCard agencyId="agency-1" />);

    expect(screen.getByText("Loading this month's usage…")).toBeInTheDocument();
  });

  it("names the month from the period start, in Manila time", async () => {
    api.fetchPlanUsage.mockResolvedValue(usage());
    render(<PlanUsageCard agencyId="agency-1" />);

    expect(await screen.findByText("So far this month (October).")).toBeInTheDocument();
  });

  it("falls back to a plain period when the start date is missing or invalid", async () => {
    api.fetchPlanUsage.mockResolvedValue(usage({ periodStart: "not a date" }));
    const { unmount } = render(<PlanUsageCard agencyId="agency-1" />);
    expect(await screen.findByText("So far this month.")).toBeInTheDocument();
    unmount();

    api.fetchPlanUsage.mockResolvedValue(usage({ periodStart: undefined }));
    render(<PlanUsageCard agencyId="agency-1" />);
    expect(await screen.findByText("So far this month.")).toBeInTheDocument();
  });

  it("names the cheapest plan that covers this month and marks only that plan", async () => {
    api.fetchPlanUsage.mockResolvedValue(usage());
    render(<PlanUsageCard agencyId="agency-1" />);

    expect(await screen.findByText("At this month's usage, Pro (₱6,990 a month) covers you.")).toBeInTheDocument();
    const plans = screen.getByRole("list", { name: "Plans" });
    expect(within(plans).getAllByRole("listitem")).toHaveLength(3);
    const pro = within(plans).getByText(/Pro/).closest("li");
    const starter = within(plans).getByText(/Starter/).closest("li");
    const agency = within(plans).getByText(/Agency/).closest("li");
    expect(pro).toHaveAttribute("aria-current", "true");
    expect(starter).not.toHaveAttribute("aria-current");
    expect(agency).not.toHaveAttribute("aria-current");
  });

  it("shows 'Fits this month' once, inside the fitting plan's card", async () => {
    api.fetchPlanUsage.mockResolvedValue(usage());
    render(<PlanUsageCard agencyId="agency-1" />);

    const label = await screen.findByText("Fits this month");
    expect(screen.getAllByText("Fits this month")).toHaveLength(1);
    const plans = screen.getByRole("list", { name: "Plans" });
    expect(label.closest("li")).toBe(within(plans).getByText(/Pro/).closest("li"));
  });

  it("points heavy usage to Report a problem and marks no plan", async () => {
    api.fetchPlanUsage.mockResolvedValue(usage({ itinerariesCreated: 140 }));
    render(<PlanUsageCard agencyId="agency-1" />);

    expect(await screen.findByText(/above every plan/i)).toBeInTheDocument();
    expect(screen.getByText(/Report a problem under Need help\?/)).toBeInTheDocument();
    const plans = screen.getByRole("list", { name: "Plans" });
    within(plans).getAllByRole("listitem").forEach((item) => {
      expect(item).not.toHaveAttribute("aria-current");
    });
    expect(screen.queryByText("Fits this month")).not.toBeInTheDocument();
  });

  it("says so when usage can't load", async () => {
    api.fetchPlanUsage.mockRejectedValue(new Error("offline"));
    render(<PlanUsageCard agencyId="agency-1" />);

    expect(await screen.findByText("Couldn't load this month's usage. Try again later.")).toBeInTheDocument();
  });
});
