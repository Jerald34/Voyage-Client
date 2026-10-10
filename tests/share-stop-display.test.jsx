import { describe, expect, it, vi } from "vitest";

vi.mock("../app/components/icons/index.js", () => ({
  PlaneIcon: () => <span>plane</span>,
  HotelIcon: () => <span>hotel</span>,
  ForkKnifeIcon: () => <span>fork</span>,
  CarIcon: () => <span>car</span>,
  MapPinIcon: () => <span>pin</span>,
}));

import { render, screen } from "@testing-library/react";
import { formatTimeRange, itemTypeIcon } from "../app/itinerary/view/[token]/components/stopDisplay.jsx";

describe("stop display helpers", () => {
  it("formats a time range the way the share page shows it", () => {
    expect(formatTimeRange("09:00", "10:30")).toBe("9:00 AM – 10:30 AM");
    expect(formatTimeRange("13:30", null)).toBe("1:30 PM");
    expect(formatTimeRange(null, "12:00")).toBe("Until 12:00 PM");
    expect(formatTimeRange(null, null)).toBe("");
  });

  it("picks an icon by stop type, falling back to a map pin", () => {
    render(<>{itemTypeIcon("FLIGHT")}{itemTypeIcon("dining")}{itemTypeIcon("MEAL")}</>);
    expect(screen.getByText("plane")).toBeInTheDocument();
    expect(screen.getByText("fork")).toBeInTheDocument();
    expect(screen.getByText("pin")).toBeInTheDocument();
  });
});
