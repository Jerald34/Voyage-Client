import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UsageBarChart from "../app/components/admin/usage/UsageBarChart.jsx";

const series = [
  { bucket: "2026-10-01", costUsd: 0, totalTokens: 0, runCount: 0, failedRunCount: 0 },
  { bucket: "2026-10-02", costUsd: 0.5, totalTokens: 1000, runCount: 4, failedRunCount: 1 },
  { bucket: "2026-10-03", costUsd: 0.25, totalTokens: 500, runCount: 2, failedRunCount: 0 },
];

describe("UsageBarChart", () => {
  it("draws one labelled bar per day, including empty days", () => {
    render(<UsageBarChart series={series} metric="costUsd" />);
    expect(screen.getAllByRole("img")).toHaveLength(3);
    expect(screen.getByRole("img", { name: "Oct 1: $0.00" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Oct 2: $0.500" })).toBeInTheDocument();
  });

  it("labels first, middle and last dates", () => {
    render(<UsageBarChart series={series} metric="totalTokens" />);
    expect(screen.getByText("Oct 1")).toBeInTheDocument();
    expect(screen.getByText("Oct 2")).toBeInTheDocument();
    expect(screen.getByText("Oct 3")).toBeInTheDocument();
  });

  it("names failed runs in the Runs view", () => {
    render(<UsageBarChart series={series} metric="runCount" />);
    expect(screen.getByRole("img", { name: "Oct 2: 4 runs, 1 failed" })).toBeInTheDocument();
  });

  it("explains an empty range", () => {
    render(<UsageBarChart series={[]} metric="costUsd" />);
    expect(screen.getByText("No usage in this range.")).toBeInTheDocument();
  });

  it("groups the bars under a label that names what the chart shows", () => {
    const { rerender } = render(<UsageBarChart series={series} metric="costUsd" />);
    expect(screen.getByRole("group", { name: "Cost per day" })).toBeInTheDocument();
    rerender(<UsageBarChart series={series} metric="totalTokens" />);
    expect(screen.getByRole("group", { name: "Tokens per day" })).toBeInTheDocument();
    rerender(<UsageBarChart series={series} metric="runCount" />);
    expect(screen.getByRole("group", { name: "Runs per day" })).toBeInTheDocument();
  });

  it("makes every bar reachable from the keyboard", () => {
    render(<UsageBarChart series={series} metric="costUsd" />);
    for (const bar of screen.getAllByRole("img")) expect(bar).toHaveAttribute("tabindex", "0");
  });
});
