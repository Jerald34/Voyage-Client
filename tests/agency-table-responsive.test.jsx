import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// icons/index.js is JSX-in-.js and can't be parsed by Vite — mock it (established convention)
vi.mock("../app/components/icons/index.js", () => ({
  SortIcon: (props) => <svg data-testid="sort-icon" {...props} />,
}));

import AgencyTable from "../app/components/admin/AgencyTable.jsx";

const agencies = [
  { id: "a1", name: "Alpha Travel", status: "PENDING_REVIEW", submittedAt: "2026-05-01", ownerUser: { displayName: "Ana", email: "ana@x.com" } },
];

function renderTable(onRowClick = vi.fn()) {
  render(
    <AgencyTable agencies={agencies} sorted={agencies} sortField="name" sortDir="asc"
      onSort={() => {}} selectedAgencyId={null} onRowClick={onRowClick} />
  );
  return onRowClick;
}

describe("AgencyTable responsive", () => {
  it("renders a desktop table and a mobile card list", () => {
    renderTable();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByTestId("agency-card-a1")).toBeInTheDocument();
  });

  it("fires onRowClick when a mobile card is activated", () => {
    const onRowClick = renderTable();
    fireEvent.click(screen.getByTestId("agency-card-a1"));
    expect(onRowClick).toHaveBeenCalledWith("a1");
  });
});
