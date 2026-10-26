import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../app/lib/api/admin.js", () => ({ fetchUsageRuns: vi.fn(), fetchUsageRun: vi.fn() }));

import { fetchUsageRun, fetchUsageRuns } from "../app/lib/api/admin.js";
import UsageDrillIn from "../app/components/admin/usage/UsageDrillIn.jsx";

const row = { id: "u1", label: "Jerald", drillable: true, roleTag: "OWNER", agencyName: "Hops Travel", runCount: 2, failedRunCount: 1, totalTokens: 3000, costUsd: 0.04 };
const runs = [
  { id: "r2", createdAt: "2026-10-22T09:00:00.000Z", status: "FAILED", threadTitle: "Zambales 2-day", userLabel: "Jerald", agencyName: "Hops Travel", modelNames: ["gemini-3.5-flash-lite"], totalTokens: 2000, costUsd: 0.03, costComplete: false, callCount: 4 },
  { id: "r1", createdAt: "2026-10-21T09:00:00.000Z", status: "COMPLETED", threadTitle: "Baguio", userLabel: "Jerald", agencyName: "Hops Travel", modelNames: ["gemini-3.5-flash-lite"], totalTokens: 1000, costUsd: 0.01, costComplete: true, callCount: 2 },
];
const call = { callIndex: 0, phase: "loop", modelName: "gemini-3.5-flash-lite", promptTokens: 900, cachedTokens: 400, outputTokens: 50, thoughtsTokens: 20, totalTokens: 970, costUsd: 0.0005 };

beforeEach(() => {
  vi.clearAllMocks();
  fetchUsageRuns.mockResolvedValue({ runs });
  fetchUsageRun.mockResolvedValue({ run: runs[0], calls: [call] });
});

describe("UsageDrillIn", () => {
  it("loads the row's runs for the range using the right filter", async () => {
    render(<UsageDrillIn row={row} groupBy="user" range="7d" />);
    expect(await screen.findByText("Zambales 2-day")).toBeInTheDocument();
    expect(fetchUsageRuns).toHaveBeenCalledWith({ range: "7d", userId: "u1" });
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Cost incomplete")).toBeInTheDocument();
  });

  it("flags the header cost as incomplete when any of the row's runs has an unpriced call", async () => {
    render(<UsageDrillIn row={row} groupBy="user" range="7d" />);
    await screen.findByText("Zambales 2-day");
    const cost = screen.getByText("Cost", { selector: "dt" }).parentElement;
    expect(within(cost).getByText("Incomplete")).toBeInTheDocument();
  });

  it("does not flag the header cost when every run was fully priced", async () => {
    fetchUsageRuns.mockResolvedValue({ runs: [runs[1]] });
    render(<UsageDrillIn row={row} groupBy="user" range="7d" />);
    await screen.findByText("Baguio");
    const cost = screen.getByText("Cost", { selector: "dt" }).parentElement;
    expect(within(cost).queryByText("Incomplete")).not.toBeInTheDocument();
  });

  it("hides the header figures, and says it is busy, while they belong to another range", async () => {
    render(<UsageDrillIn row={row} groupBy="user" range="7d" figuresPending />);
    await screen.findByText("Zambales 2-day");
    const dl = screen.getByText("Cost", { selector: "dt" }).closest("dl");
    expect(dl).toHaveAttribute("aria-busy", "true");
    expect(within(dl).queryByText("$0.040")).not.toBeInTheDocument();
    expect(within(dl).queryByText("3,000")).not.toBeInTheDocument();
    expect(within(dl).queryByText("Incomplete")).not.toBeInTheDocument();
    expect(within(dl).getAllByText("—")).toHaveLength(3);
  });

  it("expands a run into its model calls", async () => {
    render(<UsageDrillIn row={row} groupBy="user" range="this_month" />);
    fireEvent.click(await screen.findByRole("button", { name: /Zambales 2-day/ }));
    expect(await screen.findByText("970")).toBeInTheDocument();
    expect(fetchUsageRun).toHaveBeenCalledWith("r2");
  });

  it("uses threadId for a chat row", async () => {
    render(<UsageDrillIn row={{ ...row, id: "t1" }} groupBy="chat" range="30d" />);
    await screen.findByText("Baguio");
    expect(fetchUsageRuns).toHaveBeenCalledWith({ range: "30d", threadId: "t1" });
  });

  it("uses agencyId for an agency row", async () => {
    render(<UsageDrillIn row={{ ...row, id: "a1" }} groupBy="agency" range="30d" />);
    await screen.findByText("Baguio");
    expect(fetchUsageRuns).toHaveBeenCalledWith({ range: "30d", agencyId: "a1" });
  });

  it("shows an empty state when the range has no runs", async () => {
    fetchUsageRuns.mockResolvedValue({ runs: [] });
    render(<UsageDrillIn row={row} groupBy="user" range="7d" />);
    expect(await screen.findByText("No runs in this range.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("No runs found");
  });

  describe("keyboard and screen reader behaviour", () => {
    it("announces loading, then how many runs loaded, in one persistent status region", async () => {
      render(<UsageDrillIn row={row} groupBy="user" range="7d" />);
      const status = screen.getByRole("status");
      expect(status).toHaveTextContent("Loading runs for Jerald");
      await screen.findByText("Zambales 2-day");
      expect(screen.getByRole("status")).toBe(status);
      expect(status).toHaveTextContent("2 runs loaded");
    });

    it("announces a failed run load as an alert and lets you try again", async () => {
      fetchUsageRuns.mockRejectedValueOnce(new Error("Usage is unavailable")).mockResolvedValueOnce({ runs });
      render(<UsageDrillIn row={row} groupBy="user" range="7d" />);
      expect(await screen.findByRole("alert")).toHaveTextContent("Usage is unavailable");
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(await screen.findByText("Zambales 2-day")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(fetchUsageRuns).toHaveBeenCalledTimes(2);
    });

    it("run rows are real buttons that say whether they are expanded and what they control", async () => {
      render(<UsageDrillIn row={row} groupBy="user" range="7d" />);
      const toggle = await screen.findByRole("button", { name: /Zambales 2-day/ });
      expect(toggle.tagName).toBe("BUTTON");
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(toggle).not.toHaveAttribute("aria-controls");

      fireEvent.click(toggle);
      await screen.findByText("970");
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      const panel = document.getElementById(toggle.getAttribute("aria-controls"));
      expect(panel).not.toBeNull();
      expect(within(panel).getByRole("table", { name: /Model calls/ })).toBeInTheDocument();
    });

    it("keeps focus on the toggle when a run opens and closes, and collapses the calls", async () => {
      render(<UsageDrillIn row={row} groupBy="user" range="7d" />);
      const toggle = await screen.findByRole("button", { name: /Zambales 2-day/ });
      toggle.focus();
      fireEvent.click(toggle);
      await screen.findByText("970");
      expect(toggle).toHaveFocus();

      fireEvent.click(toggle);
      expect(screen.queryByText("970")).not.toBeInTheDocument();
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(toggle).toHaveFocus();
    });

    it("only one run is open at a time", async () => {
      render(<UsageDrillIn row={row} groupBy="user" range="7d" />);
      const first = await screen.findByRole("button", { name: /Zambales 2-day/ });
      const second = screen.getByRole("button", { name: /Baguio/ });
      fireEvent.click(first);
      await screen.findByText("970");
      fireEvent.click(second);
      expect(first).toHaveAttribute("aria-expanded", "false");
      expect(second).toHaveAttribute("aria-expanded", "true");
      await waitFor(() => expect(fetchUsageRun).toHaveBeenLastCalledWith("r1"));
    });

    it("announces the call load, and an error loading calls as an alert with a retry", async () => {
      fetchUsageRun.mockRejectedValueOnce(new Error("Run not found")).mockResolvedValueOnce({ run: runs[0], calls: [call] });
      render(<UsageDrillIn row={row} groupBy="user" range="7d" />);
      fireEvent.click(await screen.findByRole("button", { name: /Zambales 2-day/ }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Run not found");
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(await screen.findByText("970")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("1 model call loaded");
    });

    it("says when a run has no per-call detail", async () => {
      fetchUsageRun.mockResolvedValue({ run: runs[1], calls: [] });
      render(<UsageDrillIn row={row} groupBy="user" range="7d" />);
      fireEvent.click(await screen.findByRole("button", { name: /Baguio/ }));
      expect(await screen.findByText("No per-call detail was recorded for this run.")).toBeInTheDocument();
    });
  });

  describe("call table", () => {
    it("names the model for each call and flags unpriced calls", async () => {
      fetchUsageRun.mockResolvedValue({
        run: runs[0],
        calls: [call, { ...call, callIndex: 1, phase: "synthesis", modelName: "gemini-x", costUsd: null }],
      });
      render(<UsageDrillIn row={row} groupBy="user" range="7d" />);
      fireEvent.click(await screen.findByRole("button", { name: /Zambales 2-day/ }));
      const table = await screen.findByRole("table", { name: /Model calls/ });
      expect(within(table).getByText("gemini-3.5-flash-lite")).toBeInTheDocument();
      expect(within(table).getByText("gemini-x")).toBeInTheDocument();
      expect(within(table).getByText("Final answer")).toBeInTheDocument();
      expect(within(table).getByText("Unpriced")).toBeInTheDocument();
      expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["#", "Step", "Prompt", "Cached", "Output", "Thinking", "Total", "Cost"]);
    });
  });

  it("renders a row-actions slot", async () => {
    render(<UsageDrillIn row={row} groupBy="user" range="7d" actions={<button type="button">Pause agent</button>} />);
    expect(await screen.findByRole("button", { name: "Pause agent" })).toBeInTheDocument();
  });

  it("starts over when the selected row changes", async () => {
    const { rerender } = render(<UsageDrillIn row={row} groupBy="user" range="7d" />);
    fireEvent.click(await screen.findByRole("button", { name: /Zambales 2-day/ }));
    await screen.findByText("970");
    rerender(<UsageDrillIn row={{ ...row, id: "u2", label: "Ana" }} groupBy="user" range="7d" />);
    await waitFor(() => expect(fetchUsageRuns).toHaveBeenLastCalledWith({ range: "7d", userId: "u2" }));
    expect(screen.queryByText("970")).not.toBeInTheDocument();
  });
});
