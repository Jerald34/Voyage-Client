import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UsageStatCards from "../app/components/admin/usage/UsageStatCards.jsx";

const totals = { totalTokens: 1234, costUsd: 0.123, runCount: 7, cachedTokens: 200 };
const series = [
  { bucket: "2026-06-01", totalTokens: 100 },
  { bucket: "2026-06-02", totalTokens: 300 },
];

describe("UsageStatCards", () => {
  it("renders all four metrics with formatted values", () => {
    render(<UsageStatCards totals={totals} series={series} />);
    expect(screen.getByText(/total tokens/i)).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("$0.123")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("renders a sparkline for the total tokens card", () => {
    render(<UsageStatCards totals={totals} series={series} />);
    expect(screen.getByTestId("usage-sparkline")).toBeInTheDocument();
  });

  it("does not crash without a series", () => {
    render(<UsageStatCards totals={totals} />);
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });
});
