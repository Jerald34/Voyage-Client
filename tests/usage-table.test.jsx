import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UsageTable from "../app/components/admin/usage/UsageTable.jsx";

const rows = [
  { id: "u1", label: "Jerald", drillable: true, roleTag: "OWNER", agencyName: "Hops Travel", runCount: 120, failedRunCount: 3, totalTokens: 900000, costUsd: 2.91 },
  { id: "u2", label: "Ana", drillable: true, roleTag: "PERSONAL", agencyName: null, runCount: 22, failedRunCount: 0, totalTokens: 100000, costUsd: 0.51 },
  { id: "none", label: "Unknown user", drillable: false, roleTag: null, agencyName: null, runCount: 1, failedRunCount: 0, totalTokens: 10, costUsd: 0 },
];

describe("UsageTable", () => {
  it("shows each user's tag and sorts by cost", () => {
    render(<UsageTable rows={rows} groupBy="user" onSelect={vi.fn()} />);
    const table = screen.getByRole("table");
    const bodyRows = within(table).getAllByRole("row").slice(1);
    expect(within(bodyRows[0]).getByText("Jerald")).toBeInTheDocument();
    expect(within(bodyRows[0]).getByText("Owner · Hops Travel")).toBeInTheDocument();
    expect(within(bodyRows[1]).getByText("Personal")).toBeInTheDocument();
  });

  it("opens a drillable row and leaves the others plain", () => {
    const onSelect = vi.fn();
    render(<UsageTable rows={rows} groupBy="user" onSelect={onSelect} />);
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: /Jerald/ }));
    expect(onSelect).toHaveBeenCalledWith(rows[0]);
    expect(within(screen.getByRole("table")).queryByRole("button", { name: /Unknown user/ })).not.toBeInTheDocument();
  });

  it("re-sorts when a column header is clicked", () => {
    render(<UsageTable rows={rows} groupBy="user" onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole("columnheader", { name: /^name/i }));
    const first = within(screen.getByRole("table")).getAllByRole("row")[1];
    expect(within(first).getByText("Ana")).toBeInTheDocument();
  });

  it("explains an empty table", () => {
    render(<UsageTable rows={[]} groupBy="chat" onSelect={vi.fn()} />);
    expect(screen.getByText("No usage to show for this range.")).toBeInTheDocument();
  });

  it("sorts from a keyboard-reachable button inside each column header", () => {
    render(<UsageTable rows={rows} groupBy="user" onSelect={vi.fn()} />);
    const table = screen.getByRole("table");
    const header = within(table).getByRole("columnheader", { name: /^name/i });
    expect(header).toHaveAttribute("aria-sort", "none");
    fireEvent.click(within(header).getByRole("button", { name: /^name/i }));
    expect(header).toHaveAttribute("aria-sort", "ascending");
    const first = within(table).getAllByRole("row")[1];
    expect(within(first).getByText("Ana")).toBeInTheDocument();
    fireEvent.click(within(header).getByRole("button", { name: /^name/i }));
    expect(header).toHaveAttribute("aria-sort", "descending");
  });

  it("marks the selected row's button as current", () => {
    render(<UsageTable rows={rows} groupBy="user" onSelect={vi.fn()} selectedId="u2" />);
    const table = screen.getByRole("table");
    expect(within(table).getByRole("button", { name: /Ana/ })).toHaveAttribute("aria-current", "true");
    expect(within(table).getByRole("button", { name: /Jerald/ })).not.toHaveAttribute("aria-current");
  });

  it("shows the agency under a chat's title", () => {
    const chats = [{ id: "t1", label: "Cebu trip", drillable: true, roleTag: null, agencyName: "Hops Travel", runCount: 3, failedRunCount: 0, totalTokens: 50, costUsd: 0.1 }];
    render(<UsageTable rows={chats} groupBy="chat" onSelect={vi.fn()} />);
    expect(within(screen.getByRole("table")).getByText("Hops Travel")).toBeInTheDocument();
  });

  it("names the table after its grouping so it can be told apart from the chart's data table", () => {
    const { rerender } = render(<UsageTable rows={rows} groupBy="user" onSelect={vi.fn()} />);
    expect(screen.getByRole("table", { name: "Usage by user" })).toBeInTheDocument();
    rerender(<UsageTable rows={rows} groupBy="agency" onSelect={vi.fn()} />);
    expect(screen.getByRole("table", { name: "Usage by agency" })).toBeInTheDocument();
    rerender(<UsageTable rows={rows} groupBy="chat" onSelect={vi.fn()} />);
    expect(screen.getByRole("table", { name: "Usage by chat" })).toBeInTheDocument();
  });
});
