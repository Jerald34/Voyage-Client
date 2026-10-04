import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardGreeting, {
  greetingFor,
  needsYouSummary,
} from "../app/agency/[agencyId]/components/dashboard/widgets/DashboardGreeting.jsx";

const MORNING = new Date(2026, 9, 3, 8);

describe("DashboardGreeting", () => {
  it("greets by time of day", () => {
    expect(greetingFor(new Date(2026, 9, 3, 8))).toBe("Good morning");
    expect(greetingFor(new Date(2026, 9, 3, 13))).toBe("Good afternoon");
    expect(greetingFor(new Date(2026, 9, 3, 19))).toBe("Good evening");
    expect(greetingFor(new Date(2026, 9, 3, 2))).toBe("Good evening");
  });

  it("summarises what needs attention", () => {
    expect(needsYouSummary(0)).toBe("Nothing needs you right now");
    expect(needsYouSummary(1)).toBe("1 thing needs you today");
    expect(needsYouSummary(3)).toBe("3 things need you today");
    expect(needsYouSummary(null)).toBeNull();
  });

  it("uses the first name in the page heading", () => {
    render(<DashboardGreeting name="Maria Santos" count={3} onNewTrip={() => {}} now={MORNING} />);
    expect(screen.getByRole("heading", { level: 1, name: "Good morning, Maria" })).toBeInTheDocument();
    expect(screen.getByText("3 things need you today")).toBeInTheDocument();
  });

  it("greets without a name when there is none", () => {
    render(<DashboardGreeting count={0} onNewTrip={() => {}} now={MORNING} />);
    expect(screen.getByRole("heading", { level: 1, name: "Good morning" })).toBeInTheDocument();
  });

  it("leaves the summary out until the count is known", () => {
    render(<DashboardGreeting name="Maria" count={null} onNewTrip={() => {}} now={MORNING} />);
    expect(screen.queryByText(/need/)).not.toBeInTheDocument();
  });

  it("presses in slightly under the finger", () => {
    render(<DashboardGreeting name="Maria" count={0} onNewTrip={() => {}} now={MORNING} />);
    const { className } = screen.getByRole("button", { name: "New trip" });
    expect(className).toContain("active:scale-[0.97]");
    expect(className).toContain("transition-[opacity,scale]");
    expect(className).not.toContain("transition-opacity");
  });

  it("starts a new trip", () => {
    const onNewTrip = vi.fn();
    render(<DashboardGreeting name="Maria" count={0} onNewTrip={onNewTrip} now={MORNING} />);
    fireEvent.click(screen.getByRole("button", { name: "New trip" }));
    expect(onNewTrip).toHaveBeenCalledOnce();
  });
});
