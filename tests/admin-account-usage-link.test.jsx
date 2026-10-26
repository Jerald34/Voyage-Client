import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// icons/index.js is JSX-in-.js and can't be parsed by Vite — mock it (established convention).
vi.mock("../app/components/icons/index.js", () => ({
  SearchIcon: (p) => <svg {...p} />,
  UserIcon: (p) => <svg {...p} />,
  SortIcon: ({ active, direction, ...p }) => <svg {...p} />,
  CloseIcon: (p) => <svg {...p} />,
}));
vi.mock("../app/lib/api/index.js", () => ({
  fetchAllAccounts: vi.fn(),
  fetchAccountDetail: vi.fn(),
  adminDisableUser: vi.fn(),
  adminEnableUser: vi.fn(),
  adminSignOutUser: vi.fn(),
  adminDeleteUser: vi.fn(),
}));
vi.mock("../app/lib/api/admin.js", () => ({
  fetchUsage: vi.fn(),
  fetchUsageRuns: vi.fn(),
  fetchUsageRun: vi.fn(),
}));
// The other two tabs are not part of this path.
vi.mock("../app/components/admin/AdminAgenciesPage.jsx", () => ({ default: () => <div>Agencies</div> }));
vi.mock("../app/components/admin/reports/ReportsSection.jsx", () => ({ default: () => <div>Reports inbox</div> }));

import { fetchAccountDetail, fetchAllAccounts } from "../app/lib/api/index.js";
import { fetchUsage, fetchUsageRuns } from "../app/lib/api/admin.js";
import AdminPage from "../app/components/admin/AdminPage.jsx";

const ANA = "u2";

const summary = {
  id: ANA,
  email: "ana@alpha.com",
  displayName: "Ana Reyes",
  role: "USER",
  status: "ACTIVE",
  accountType: "AGENCY_USER",
  emailVerified: true,
  createdAt: "2026-04-10T12:00:00.000Z",
  signInMethods: ["PASSWORD"],
  memberships: [],
};

const usageResponse = {
  range: "this_month",
  groupBy: "user",
  from: "2026-10-01T00:00:00.000Z",
  totals: { costUsd: 1.4, runCount: 71, failedRunCount: 0, avgCostPerRun: 0.02, avgTokensPerRun: 140, cacheHitRate: 0.2, totalTokens: 9940 },
  previous: { costUsd: 0, runCount: 0, totalTokens: 0 },
  projectedMonthEndCostUsd: 1.9,
  series: [{ bucket: "2026-10-01", costUsd: 1.4, totalTokens: 9940, runCount: 71, failedRunCount: 0 }],
  rows: [{ id: ANA, label: "Ana Reyes", drillable: true, roleTag: "OWNER", agencyName: "Alpha", runCount: 71, failedRunCount: 0, totalTokens: 9940, costUsd: 1.4 }],
  unpricedModels: [],
  meteredSince: "2026-06-02T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchAllAccounts.mockResolvedValue({ users: [summary] });
  fetchAccountDetail.mockResolvedValue({
    user: { ...summary, emailVerifiedAt: "2026-04-11T12:00:00.000Z", updatedAt: "2026-06-01T12:00:00.000Z", activity: {}, auditEvents: [], ownedAgencies: [], usageThisMonth: { costUsd: 1.4, runCount: 71 } },
  });
  fetchUsage.mockResolvedValue(usageResponse);
  fetchUsageRuns.mockResolvedValue({ runs: [] });
});

describe("Accounts -> Usage link, end to end", () => {
  it("View in Usage lands on that person's drill-in, and the tab starts plain next time", async () => {
    render(<AdminPage />);
    fireEvent.click(screen.getByRole("tab", { name: "Accounts" }));
    fireEvent.click(await screen.findByTestId(`account-row-${ANA}`));
    expect(await screen.findByText("$1.40 · 71 runs")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View in Usage" }));

    // Usage opens with Ana's drill-in already showing, asking for her runs this month.
    expect(await screen.findByRole("dialog", { name: "Ana Reyes" })).toBeInTheDocument();
    await waitFor(() => expect(fetchUsageRuns).toHaveBeenCalledWith({ range: "this_month", userId: ANA }));
    expect(screen.getByRole("tab", { name: "Usage" })).toHaveAttribute("aria-selected", "true");
    // The breakdown behind the pane is the real table (the chart keeps its own hidden one).
    expect(within(await screen.findByRole("table", { name: /^Usage by/ })).getByText("Ana Reyes")).toBeInTheDocument();

    // Leaving by hand and coming back opens Usage plain, without her drill-in.
    fireEvent.click(screen.getByRole("tab", { name: "Reports" }));
    fireEvent.click(screen.getByRole("tab", { name: "Usage" }));
    await screen.findByRole("table", { name: /^Usage by/ });
    expect(screen.queryByRole("dialog", { name: "Ana Reyes" })).not.toBeInTheDocument();
  });
});
