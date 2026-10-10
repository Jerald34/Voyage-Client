import { describe, expect, it, vi } from "vitest";

vi.mock("../app/components/icons/index.js", () => ({
  PlaneIcon: () => <span>plane</span>,
  HotelIcon: () => <span>hotel</span>,
  ForkKnifeIcon: () => <span>fork</span>,
  CarIcon: () => <span>car</span>,
  MapPinIcon: () => <span>pin</span>,
}));

import { render, screen } from "@testing-library/react";
import { formatDateRange, formatTimeRange, itemTypeIcon } from "../app/itinerary/view/[token]/components/stopDisplay.jsx";

describe("stop display helpers", () => {
  it("formats a time range the way the share page shows it", () => {
    expect(formatTimeRange("09:00", "10:30")).toBe("9:00 AM – 10:30 AM");
    expect(formatTimeRange("13:30", null)).toBe("1:30 PM");
    expect(formatTimeRange(null, "12:00")).toBe("Until 12:00 PM");
    expect(formatTimeRange(null, null)).toBe("");
  });

  it("formats the trip date range the way the share page header and PDF show it", () => {
    // Date-only strings parse as UTC midnight, so build the expectation with the same
    // locale call rather than hard-coding days that shift with the test machine's timezone.
    const short = { month: "short", day: "numeric" };
    const startStr = new Date("2026-10-09").toLocaleDateString("en-US", short);
    const endStr = new Date("2026-10-10").toLocaleDateString("en-US", { ...short, year: "numeric" });
    expect(formatDateRange("2026-10-09", "2026-10-10")).toBe(`${startStr} – ${endStr}`);
    expect(formatDateRange("2026-10-09", "2026-10-10")).toMatch(/^[A-Z][a-z]{2} \d{1,2} – [A-Z][a-z]{2} \d{1,2}, 2026$/);
    expect(formatDateRange("2026-10-09", null)).toBe(startStr);
    expect(formatDateRange("", "2026-10-10")).toBe("");
    expect(formatDateRange(null, null)).toBe("");
  });

  it("picks an icon by stop type, falling back to a map pin", () => {
    render(<>{itemTypeIcon("FLIGHT")}{itemTypeIcon("dining")}{itemTypeIcon("MEAL")}</>);
    expect(screen.getByText("plane")).toBeInTheDocument();
    expect(screen.getByText("fork")).toBeInTheDocument();
    expect(screen.getByText("pin")).toBeInTheDocument();
  });
});
