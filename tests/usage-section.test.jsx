import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../app/components/icons/index.js", () => ({ CloseIcon: () => null }));
vi.mock("../app/lib/api/admin.js", () => ({
  fetchUsage: vi.fn(),
  fetchUsageRuns: vi.fn().mockResolvedValue({ runs: [] }),
  fetchUsageRun: vi.fn(),
}));

import { fetchUsage, fetchUsageRuns } from "../app/lib/api/admin.js";
import UsageSection from "../app/components/admin/usage/UsageSection.jsx";

// The chart keeps its own (screen-reader-only) data table, so the breakdown is found by name.
const BREAKDOWN = { name: /^Usage by/ };
const findBreakdown = () => screen.findByRole("table", BREAKDOWN);

const ANA = "11111111-1111-4111-8111-111111111111";

const response = (over = {}) => ({
  range: "this_month",
  groupBy: "user",
  from: "2026-10-01T00:00:00.000Z",
  totals: { costUsd: 0.75, runCount: 2, failedRunCount: 1, avgCostPerRun: 0.375, avgTokensPerRun: 140, cacheHitRate: 0.2, totalTokens: 280 },
  previous: { costUsd: 0.5, runCount: 1, totalTokens: 140 },
  projectedMonthEndCostUsd: 0.95,
  series: [{ bucket: "2026-10-01", costUsd: 0.75, totalTokens: 280, runCount: 2, failedRunCount: 1 }],
  rows: [{ id: ANA, label: "Ana", drillable: true, roleTag: "STAFF", agencyName: "Alpha", runCount: 2, failedRunCount: 1, totalTokens: 280, costUsd: 0.75 }],
  unpricedModels: [],
  meteredSince: "2026-06-02T00:00:00.000Z",
  ...over,
});

const chatRows = [{ id: "t1", label: "Baguio trip", drillable: true, agencyName: "Alpha", runCount: 1, failedRunCount: 0, totalTokens: 100, costUsd: 0.1 }];

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchUsage.mockResolvedValue(response());
  fetchUsageRuns.mockResolvedValue({ runs: [] });
});

describe("UsageSection", () => {
  it("loads this month by user and shows cards, chart and table", async () => {
    render(<UsageSection />);
    // Table and phone cards both render under jsdom, so look inside the table.
    expect(within(await screen.findByRole("table", { name: "Usage by user" })).getByText("Staff · Alpha")).toBeInTheDocument();
    expect(fetchUsage).toHaveBeenCalledWith({ range: "this_month", groupBy: "user" });
    expect(screen.getByText("Spend")).toBeInTheDocument();
  });

  it("refetches when the range or grouping changes", async () => {
    render(<UsageSection />);
    await findBreakdown();
    fireEvent.click(screen.getByRole("radio", { name: "7 days" }));
    await waitFor(() => expect(fetchUsage).toHaveBeenLastCalledWith({ range: "7d", groupBy: "user" }));
    fireEvent.click(screen.getByRole("radio", { name: "Chats" }));
    await waitFor(() => expect(fetchUsage).toHaveBeenLastCalledWith({ range: "7d", groupBy: "chat" }));
  });

  it("switches what the chart shows without refetching", async () => {
    render(<UsageSection />);
    await findBreakdown();
    expect(screen.getByRole("img", { name: /^Cost per day/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Tokens" }));
    expect(screen.getByRole("img", { name: /^Tokens per day/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Runs" }));
    expect(screen.getByRole("img", { name: /^Runs per day/ })).toBeInTheDocument();
    expect(fetchUsage).toHaveBeenCalledTimes(1);
  });

  it("warns when some runs used unpriced models", async () => {
    fetchUsage.mockResolvedValue(response({ unpricedModels: ["gemini-x"] }));
    render(<UsageSection />);
    expect(await screen.findByText(/Cost is incomplete/)).toHaveTextContent("gemini-x");
  });

  it("says when the range starts before usage was recorded", async () => {
    fetchUsage.mockResolvedValue(response({ from: "2026-05-01T00:00:00.000Z" }));
    render(<UsageSection />);
    expect(await screen.findByText(/Usage is recorded from Jun 2, 2026/)).toBeInTheDocument();
  });

  it("does not say that when the whole range is after metering began", async () => {
    render(<UsageSection />);
    await findBreakdown();
    expect(screen.queryByText(/Usage is recorded from/)).not.toBeInTheDocument();
  });

  it("opens the drill-in for a clicked row", async () => {
    render(<UsageSection />);
    fireEvent.click(within(await findBreakdown()).getByRole("button", { name: /Ana/ }));
    await waitFor(() => expect(fetchUsageRuns).toHaveBeenCalledWith({ range: "this_month", userId: ANA }));
    expect(screen.getByRole("dialog", { name: "Ana" })).toBeInTheDocument();
  });

  it("opens straight to a user when asked to (from the account panel)", async () => {
    render(<UsageSection initialSelection={{ id: ANA, label: "Ana" }} />);
    await waitFor(() => expect(fetchUsageRuns).toHaveBeenCalled());
    expect(screen.getByRole("dialog", { name: "Ana" })).toBeInTheDocument();
  });

  it("closes the drill-in when the grouping changes", async () => {
    render(<UsageSection />);
    fireEvent.click(within(await findBreakdown()).getByRole("button", { name: /Ana/ }));
    expect(await screen.findByRole("dialog", { name: "Ana" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Chats" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("passes the row, grouping and a reload callback to the row-actions slot", async () => {
    const renderRowActions = vi.fn(() => <button type="button">Pause agent</button>);
    render(<UsageSection renderRowActions={renderRowActions} />);
    fireEvent.click(within(await findBreakdown()).getByRole("button", { name: /Ana/ }));
    expect(await screen.findByRole("button", { name: "Pause agent" })).toBeInTheDocument();
    const [row, groupBy, reload] = renderRowActions.mock.calls.at(-1);
    expect(row.id).toBe(ANA);
    expect(groupBy).toBe("user");
    expect(typeof reload).toBe("function");
  });

  describe("loading, errors and stale data", () => {
    it("announces loading and the finished load in a persistent status region", async () => {
      const first = deferred();
      fetchUsage.mockReturnValueOnce(first.promise);
      render(<UsageSection />);
      const status = screen.getByRole("status");
      expect(status).toHaveTextContent("Loading usage for this month, by users");
      await act(async () => first.resolve(response()));
      await findBreakdown();
      expect(screen.getByRole("status")).toBe(status);
      expect(status).toHaveTextContent("Usage loaded: this month, by users");
    });

    it("shows a failed load as an alert with a way to try again", async () => {
      fetchUsage.mockRejectedValueOnce(new Error("Usage is unavailable")).mockResolvedValueOnce(response());
      render(<UsageSection />);
      expect(await screen.findByRole("alert")).toHaveTextContent("Usage is unavailable");
      expect(screen.queryByRole("table", BREAKDOWN)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(await findBreakdown()).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("keeps the previous grouping's rows out of the table while the new grouping loads", async () => {
      render(<UsageSection />);
      await findBreakdown();
      const second = deferred();
      fetchUsage.mockReturnValueOnce(second.promise);
      fireEvent.click(screen.getByRole("radio", { name: "Chats" }));

      // The user rows are not shown under the Chats heading (a click on one would drill in with the wrong filter).
      expect(screen.queryByRole("table", BREAKDOWN)).not.toBeInTheDocument();
      expect(screen.getByText("Loading breakdown…")).toBeInTheDocument();
      // The cards and chart do not depend on the grouping, so they stay put.
      expect(screen.getByText("Spend")).toBeInTheDocument();

      await act(async () => second.resolve(response({ groupBy: "chat", rows: chatRows })));
      const table = await screen.findByRole("table", { name: "Usage by chat" });
      expect(within(table).getByText("Baguio trip")).toBeInTheDocument();
    });

    it("ignores an older response that arrives after a newer one", async () => {
      render(<UsageSection />);
      await findBreakdown();
      const slow = deferred();
      const fast = deferred();
      fetchUsage.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise);
      fireEvent.click(screen.getByRole("radio", { name: "7 days" }));
      fireEvent.click(screen.getByRole("radio", { name: "30 days" }));
      await act(async () => fast.resolve(response({ totals: { ...response().totals, costUsd: 3 } })));
      await act(async () => slow.resolve(response({ totals: { ...response().totals, costUsd: 9 } })));
      expect(screen.getByText("$3.00")).toBeInTheDocument();
      expect(screen.queryByText("$9.00")).not.toBeInTheDocument();
    });

    it("keeps the open row's numbers in step with a reload, and zeroes them when the row has no usage in the new range", async () => {
      render(<UsageSection />);
      fireEvent.click(within(await findBreakdown()).getByRole("button", { name: /Ana/ }));
      const dialog = await screen.findByRole("dialog", { name: "Ana" });
      expect(within(dialog).getByText("$0.750")).toBeInTheDocument();

      fetchUsage.mockResolvedValueOnce(response({ rows: [] }));
      fireEvent.click(screen.getByRole("radio", { name: "7 days" }));
      await waitFor(() => expect(within(screen.getByRole("dialog", { name: "Ana" })).getByText("$0.00")).toBeInTheDocument());
    });
  });

  describe("keyboard focus", () => {
    it("moves focus into the drill-in when a row opens it, and back to that row when it closes", async () => {
      render(<UsageSection />);
      const rowButton = within(await findBreakdown()).getByRole("button", { name: /Ana/ });
      rowButton.focus();
      fireEvent.click(rowButton);

      const dialog = await screen.findByRole("dialog", { name: "Ana" });
      expect(dialog).toHaveFocus();

      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(rowButton).toHaveFocus();
    });

    it("restores focus when the drill-in is closed with its close button", async () => {
      render(<UsageSection />);
      const rowButton = within(await findBreakdown()).getByRole("button", { name: /Ana/ });
      rowButton.focus();
      fireEvent.click(rowButton);
      await screen.findByRole("dialog", { name: "Ana" });
      fireEvent.click(screen.getByRole("button", { name: /close details/i }));
      expect(rowButton).toHaveFocus();
    });

    it("hands focus to the new drill-in when another row is chosen while one is open", async () => {
      const second = { ...response().rows[0], id: "22222222-2222-4222-8222-222222222222", label: "Ben" };
      fetchUsage.mockResolvedValue(response({ rows: [...response().rows, second] }));
      render(<UsageSection />);
      const table = await findBreakdown();
      fireEvent.click(within(table).getByRole("button", { name: /Ana/ }));
      await screen.findByRole("dialog", { name: "Ana" });

      const ben = within(table).getByRole("button", { name: /Ben/ });
      ben.focus();
      fireEvent.click(ben);
      expect(await screen.findByRole("dialog", { name: "Ben" })).toHaveFocus();
    });

    it("every control is a real button or radio (no click-only elements in the toolbar)", async () => {
      render(<UsageSection />);
      await findBreakdown();
      for (const name of ["This month", "Last month", "7 days", "30 days", "Cost", "Tokens", "Runs", "Users", "Agencies", "Chats"]) {
        expect(screen.getByRole("radio", { name }).tagName).toBe("BUTTON");
      }
      expect(screen.getByRole("radiogroup", { name: "Date range" })).toBeInTheDocument();
      expect(screen.getByRole("radiogroup", { name: "Chart shows" })).toBeInTheDocument();
      expect(screen.getByRole("radiogroup", { name: "Group by" })).toBeInTheDocument();
    });
  });
});
