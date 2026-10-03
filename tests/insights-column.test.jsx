import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import fixtures from "./fixtures/dashboard-payloads.json";
import InsightsColumn from "../app/agency/[agencyId]/components/dashboard/widgets/InsightsColumn.jsx";

function renderColumn(data, props = {}) {
  render(
    <InsightsColumn data={data} period={data.period} onPeriodChange={vi.fn()} agencyId="agency-1" {...props} />,
  );
  return screen.getByRole("complementary", { name: "Insights" });
}

describe("InsightsColumn", () => {
  it("shows the four KPIs, trip progress and reviews", () => {
    const column = renderColumn(fixtures.ownerBusy);

    for (const label of ["Win rate", "Time to share", "Time to reply", "Client rating"]) {
      expect(within(column).getByRole("group", { name: new RegExp(`^${label}:`) })).toBeInTheDocument();
    }
    expect(within(column).getByRole("region", { name: "Trip progress" })).toBeInTheDocument();
    expect(within(column).getByRole("region", { name: "Latest reviews" })).toBeInTheDocument();
  });

  it("names the period the numbers cover", () => {
    renderColumn(fixtures.ownerBusyWeek);
    expect(screen.getByText("Last 7 days, compared with the 7 days before")).toBeInTheDocument();
  });

  it("changes the period", () => {
    const onPeriodChange = vi.fn();
    renderColumn(fixtures.ownerBusy, { onPeriodChange });
    fireEvent.click(screen.getByRole("radio", { name: "7d" }));
    expect(onPeriodChange).toHaveBeenCalledWith("7d");
  });

  it("says how many shared itineraries the rating is based on", () => {
    renderColumn(fixtures.ownerBusy);
    expect(screen.getByText("0 of 3 rated")).toBeInTheDocument();
  });
});
