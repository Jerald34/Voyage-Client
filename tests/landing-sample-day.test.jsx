// tests/landing-sample-day.test.jsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

vi.mock("../app/components/icons/index.js", async () => (await import("./helpers/iconsMock.js")).default);

import { SampleDayHeader, SampleDayView } from "../app/components/landing/SampleDay.jsx";

// A non-compact ShareStopCard has its own <ul aria-label="Accessibility"> of <li> badges, so
// "the day's stops" means the list's direct <li> children, not every listitem in the subtree.
function dayStops(dayNumber) {
  const list = screen.getByRole("list", { name: `Day ${dayNumber} stops` });
  return within(list).getAllByRole("listitem").filter((li) => li.parentElement === list);
}

describe("SampleDayView", () => {
  it("renders day 2's real stops in order with their numbers, times and weather", () => {
    render(<SampleDayView dayNumber={2} />);

    const stops = dayStops(2);
    expect(stops).toHaveLength(4);
    expect(within(stops[0]).getByText("Mines View Park", { selector: "h3" })).toBeInTheDocument();
    expect(within(stops[0]).getByText("9:00 AM – 10:00 AM")).toBeInTheDocument();
    expect(within(stops[0]).getByText("Likely dry")).toBeInTheDocument();
    expect(within(stops[3]).getByText("SM City Baguio", { selector: "h3" })).toBeInTheDocument();
    expect(within(stops[3]).getByText("Rain likely")).toBeInTheDocument();
    expect(within(stops[3]).getByText("Enjoy some indoor shopping or catch a movie at the mall.")).toBeInTheDocument();
  });

  it("drops notes in compact mode", () => {
    render(<SampleDayView dayNumber={2} compact />);

    expect(screen.queryByText("Enjoy some indoor shopping or catch a movie at the mall.")).not.toBeInTheDocument();
  });

  it("shows day 1 without weather", () => {
    render(<SampleDayView dayNumber={1} />);

    expect(dayStops(1)).toHaveLength(5);
    expect(screen.queryByText(/Likely dry|Rain likely/)).not.toBeInTheDocument();
  });
});

describe("SampleDayHeader", () => {
  it("names the day and shows its compact forecast", () => {
    render(<SampleDayHeader dayNumber={2} />);

    expect(screen.getByText("Day 2 · Views & Shopping")).toBeInTheDocument();
    expect(screen.getByText("16–26°C · PM rain")).toBeInTheDocument();
  });
});
