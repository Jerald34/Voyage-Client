import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UsageBarChart from "../app/components/admin/usage/UsageBarChart.jsx";

const series = [
  { bucket: "2026-10-01", costUsd: 0, totalTokens: 0, runCount: 0, failedRunCount: 0 },
  { bucket: "2026-10-02", costUsd: 0.5, totalTokens: 1000, runCount: 4, failedRunCount: 1 },
  { bucket: "2026-10-03", costUsd: 0.25, totalTokens: 500, runCount: 2, failedRunCount: 0 },
];

/** The mouse tooltips: one SVG <title> per day. */
const tooltips = (container) => Array.from(container.querySelectorAll("svg title")).map((t) => t.textContent);

describe("UsageBarChart", () => {
  it("keeps a hover tooltip on every day, including empty days", () => {
    const { container } = render(<UsageBarChart series={series} metric="costUsd" />);
    expect(tooltips(container)).toEqual(["Oct 1: $0.00", "Oct 2: $0.500", "Oct 3: $0.250"]);
  });

  it("labels first, middle and last dates", () => {
    render(<UsageBarChart series={series} metric="totalTokens" />);
    // The hidden table repeats the dates as row headers, so look at the visible axis spans.
    expect(screen.getByText("Oct 1", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Oct 2", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Oct 3", { selector: "span" })).toBeInTheDocument();
  });

  it("names failed runs in the Runs tooltips", () => {
    const { container } = render(<UsageBarChart series={series} metric="runCount" />);
    expect(tooltips(container)).toContain("Oct 2: 4 runs, 1 failed");
  });

  it("explains an empty range", () => {
    render(<UsageBarChart series={[]} metric="costUsd" />);
    expect(screen.getByText("No usage in this range.")).toBeInTheDocument();
  });

  it("summarises the chart for screen readers: metric, range, total and peak day", () => {
    const { rerender } = render(<UsageBarChart series={series} metric="costUsd" />);
    expect(screen.getByRole("img", { name: "Cost per day, Oct 1 to Oct 3. Total $0.750. Peak $0.500 on Oct 2." })).toBeInTheDocument();
    rerender(<UsageBarChart series={series} metric="totalTokens" />);
    expect(screen.getByRole("img", { name: "Tokens per day, Oct 1 to Oct 3. Total 1,500. Peak 1,000 on Oct 2." })).toBeInTheDocument();
    rerender(<UsageBarChart series={series} metric="runCount" />);
    expect(screen.getByRole("img", { name: "Runs per day, Oct 1 to Oct 3. Total 6, 1 failed. Peak 4 on Oct 2." })).toBeInTheDocument();
  });

  it("says so when no day in the range has any usage", () => {
    const quiet = series.map((d) => ({ ...d, costUsd: 0, totalTokens: 0, runCount: 0, failedRunCount: 0 }));
    render(<UsageBarChart series={quiet} metric="costUsd" />);
    expect(screen.getByRole("img", { name: "Cost per day, Oct 1 to Oct 3. No usage on any day." })).toBeInTheDocument();
  });

  it("gives screen-reader users the numbers in a hidden table", () => {
    render(<UsageBarChart series={series} metric="costUsd" />);
    const table = screen.getByRole("table", { name: "Cost per day" });
    expect(table).toHaveClass("sr-only");
    expect(within(table).getAllByRole("row")).toHaveLength(4); // header + 3 days
    expect(within(table).getByRole("columnheader", { name: "Date" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Cost" })).toBeInTheDocument();
    expect(within(table).queryByRole("columnheader", { name: "Failed runs" })).not.toBeInTheDocument();
    const day = within(table).getByRole("row", { name: /Oct 2/ });
    expect(within(day).getByRole("cell", { name: "$0.500" })).toBeInTheDocument();
  });

  it("includes failed runs in the hidden table for the Runs view", () => {
    render(<UsageBarChart series={series} metric="runCount" />);
    const table = screen.getByRole("table", { name: "Runs per day" });
    expect(within(table).getByRole("columnheader", { name: "Runs" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Failed runs" })).toBeInTheDocument();
    const day = within(table).getByRole("row", { name: /Oct 2/ });
    expect(within(day).getByRole("rowheader", { name: "Oct 2" })).toBeInTheDocument();
    expect(within(day).getAllByRole("cell").map((c) => c.textContent)).toEqual(["4", "1"]);
  });

  it("does not make the individual bars keyboard tab stops", () => {
    const { container } = render(<UsageBarChart series={series} metric="costUsd" />);
    expect(container.querySelectorAll("[tabindex]")).toHaveLength(0);
    expect(container.querySelector("svg")).not.toHaveAttribute("tabindex");
  });
});
