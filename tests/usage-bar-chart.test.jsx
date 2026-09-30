import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UsageBarChart from "../app/components/admin/usage/UsageBarChart.jsx";

describe("UsageBarChart", () => {
  it("shows an empty state with no data", () => {
    render(<UsageBarChart series={[]} metric="totalTokens" />);
    expect(screen.getByText(/no usage/i)).toBeInTheDocument();
  });
  it("renders a bar per bucket with an accessible label", () => {
    render(<UsageBarChart series={[{ bucket: "2026-06-01", totalTokens: 100 }, { bucket: "2026-06-02", totalTokens: 50 }]} metric="totalTokens" />);
    expect(screen.getAllByRole("img", { name: /2026-06-0/ })).toHaveLength(2);
  });
  it("shows a tooltip with the value when a bar is focused", () => {
    render(<UsageBarChart series={[{ bucket: "2026-06-01", totalTokens: 100 }, { bucket: "2026-06-02", totalTokens: 50 }]} metric="totalTokens" />);
    fireEvent.mouseEnter(screen.getAllByRole("img", { name: /2026-06-0/ })[0]);
    expect(screen.getByText("100")).toBeInTheDocument();
  });
});
