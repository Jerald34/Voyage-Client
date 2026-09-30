import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UsageTable from "../app/components/admin/usage/UsageTable.jsx";

const rows = [
  { id: "u1", label: "Ana", totalTokens: 200, promptTokens: 150, outputTokens: 50, costUsd: 0.005, runCount: 2 },
  { id: "u2", label: "Bob", totalTokens: 90, promptTokens: 70, outputTokens: 20, costUsd: 0.002, runCount: 1 },
];

describe("UsageTable", () => {
  it("renders a row per entity with formatted cost", () => {
    render(<UsageTable rows={rows} />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("Ana")).toBeInTheDocument();
    expect(within(table).getByText("$0.005")).toBeInTheDocument();
  });
  it("sorts by a column when its header is clicked", () => {
    render(<UsageTable rows={rows} />);
    fireEvent.click(screen.getByRole("columnheader", { name: /cost/i }));
    const firstDataRow = within(screen.getByRole("table")).getAllByRole("row")[1];
    expect(firstDataRow).toHaveTextContent("Ana");
  });
});
