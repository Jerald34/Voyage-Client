import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UsageStatCards from "../app/components/admin/usage/UsageStatCards.jsx";

const totals = { costUsd: 4.82, runCount: 213, failedRunCount: 9, avgCostPerRun: 0.0226, avgTokensPerRun: 18400, cacheHitRate: 0.45 };

describe("UsageStatCards", () => {
  it("shows spend with change and projection, runs with failure share, average and cache hit", () => {
    render(<UsageStatCards totals={totals} previous={{ costUsd: 3.49 }} projectedMonthEndCostUsd={7.1} series={[]} />);

    expect(screen.getByText("$4.82")).toBeInTheDocument();
    expect(screen.getByText("Up 38% vs previous period")).toBeInTheDocument();
    expect(screen.getByText("About $7.10 by month end")).toBeInTheDocument();
    expect(screen.getByText("213")).toBeInTheDocument();
    expect(screen.getByText("4% failed")).toBeInTheDocument();
    expect(screen.getByText("$0.023")).toBeInTheDocument();
    expect(screen.getByText("18,400 tokens")).toBeInTheDocument();
    expect(screen.getByText("45%")).toBeInTheDocument();
  });

  it("says when there's nothing to compare with and hides the projection", () => {
    render(<UsageStatCards totals={{ ...totals, failedRunCount: 0 }} previous={{ costUsd: 0 }} projectedMonthEndCostUsd={null} series={[]} />);
    expect(screen.getByText("No spend in the previous period")).toBeInTheDocument();
    expect(screen.queryByText(/by month end/)).not.toBeInTheDocument();
    expect(screen.getByText("No failed runs")).toBeInTheDocument();
  });
});
