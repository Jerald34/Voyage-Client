import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import KpiTile from "../app/agency/[agencyId]/components/dashboard/widgets/KpiTile.jsx";

describe("KpiTile", () => {
  it("renders the label, value and unit", () => {
    render(<KpiTile label="Win rate" value={42.1} unit="%" deltaVsPrior={0} />);
    expect(screen.getByText("Win rate")).toBeInTheDocument();
    expect(screen.getByText("42.1")).toBeInTheDocument();
    expect(screen.getByText("%")).toBeInTheDocument();
  });

  it("is a static group, not a button", () => {
    render(<KpiTile label="Win rate" value={42} unit="%" deltaVsPrior={3} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: /^Win rate:/ })).toBeInTheDocument();
  });

  it("writes a rise in percentage points as an improvement", () => {
    render(<KpiTile label="Win rate" value={42} unit="%" deltaVsPrior={3.2} />);
    expect(screen.getByText("+3.2 pts").className).toContain("--success");
  });

  it("writes a fall as a regression", () => {
    render(<KpiTile label="Win rate" value={42} unit="%" deltaVsPrior={-2} />);
    expect(screen.getByText("−2.0 pts").className).toContain("--danger");
  });

  it("says slower or faster for times where lower is better", () => {
    const { unmount } = render(<KpiTile label="Time to reply" value={2.5} unit="h" deltaVsPrior={1.2} lowerIsBetter />);
    expect(screen.getByText("1.2h slower").className).toContain("--danger");
    unmount();
    render(<KpiTile label="Time to share" value={1.7} unit="days" deltaVsPrior={-0.4} lowerIsBetter />);
    expect(screen.getByText("0.4d faster").className).toContain("--success");
  });

  it("says when nothing changed", () => {
    render(<KpiTile label="Win rate" value={42} unit="%" deltaVsPrior={0} />);
    expect(screen.getByText("No change")).toBeInTheDocument();
  });

  it("names the value and direction for screen readers", () => {
    render(<KpiTile label="Win rate" value={42.1} unit="%" deltaVsPrior={3.2} />);
    const label = screen.getByRole("group").getAttribute("aria-label");
    expect(label).toMatch(/Win rate/);
    expect(label).toMatch(/42\.1/);
    expect(label).toMatch(/up/i);
  });

  it("respects a custom formatValue", () => {
    render(<KpiTile label="Time" value={1234} deltaVsPrior={0} formatValue={(v) => `${v.toLocaleString()}!`} />);
    expect(screen.getByText("1,234!")).toBeInTheDocument();
  });

  it("shows an em dash instead of a zero when the period has no data", () => {
    render(<KpiTile label="Client rating" value={null} unit="★" deltaVsPrior={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("No data yet")).toBeInTheDocument();
    expect(screen.queryByText("★")).not.toBeInTheDocument();
    expect(screen.getByRole("group").getAttribute("aria-label")).toMatch(/no data/i);
  });

  it("says there is no prior data when only the delta is missing", () => {
    render(<KpiTile label="Win rate" value={100} unit="%" deltaVsPrior={null} />);
    expect(screen.getByText("No prior data")).toBeInTheDocument();
  });

  it("renders the subtitle when provided", () => {
    render(<KpiTile label="Client rating" value={4.2} deltaVsPrior={0} subtitle="32 of 80 rated" />);
    expect(screen.getByText("32 of 80 rated")).toBeInTheDocument();
  });

  it("announces what the number measures", () => {
    render(
      <KpiTile
        label="Win rate"
        value={42}
        unit="%"
        deltaVsPrior={3}
        description="Approved trips out of all approved and archived trips"
      />,
    );
    expect(screen.getByRole("group")).toHaveAccessibleDescription("Approved trips out of all approved and archived trips");
  });
});
