import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useCalendarEvents: vi.fn() }));

vi.mock("../app/hooks/useCalendarEvents.js", () => ({
  useCalendarEvents: (...args) => mocks.useCalendarEvents(...args),
  default: (...args) => mocks.useCalendarEvents(...args),
}));

import AgencyCalendar from "../app/agency/[agencyId]/components/dashboard/widgets/AgencyCalendar.jsx";

const PAYLOAD = {
  from: "2026-09-27",
  to: "2026-11-07",
  generatedAt: "2026-10-03T02:00:00.000Z",
  tripsWithoutDates: 2,
  trips: [
    {
      tripId: "t-kyoto",
      tripTitle: "Kyoto Autumn Escape",
      clientName: "Reyes",
      placeLabel: "Kyoto",
      startDate: "2026-10-08",
      endDate: "2026-10-14",
      status: "APPROVED_INTERNAL",
      travelerCount: 2,
    },
  ],
  events: [
    {
      id: "client_commented:c1",
      kind: "client_commented",
      tripId: "t-lisbon",
      tripTitle: "Lisbon Getaway",
      clientName: "Tanaka",
      occurredAt: new Date(2026, 9, 2, 10).toISOString(),
      detail: { excerpt: "Can we swap lunch?" },
    },
  ],
};

function hookResult(overrides = {}) {
  return { data: PAYLOAD, error: null, isLoading: false, refetch: vi.fn(), from: "2026-09-27", to: "2026-11-07", ...overrides };
}

/** A day button by its date ("Saturday, October 3"), ignoring the count suffix. */
const day = (label) =>
  screen.getByRole("button", { name: (name) => name === label || name.startsWith(`${label},`) });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 3, 10));
  mocks.useCalendarEvents.mockReset();
  mocks.useCalendarEvents.mockReturnValue(hookResult());
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AgencyCalendar", () => {
  it("shows the current month with today marked and focusable", () => {
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "October 2026" })).toBeInTheDocument();
    expect(day("Saturday, October 3")).toHaveAccessibleName("Saturday, October 3, today");
    expect(day("Saturday, October 3")).toHaveAttribute("tabindex", "0");
    expect(day("Friday, October 9")).toHaveAttribute("tabindex", "-1");
  });

  it("counts what is on each day and labels a trip on its first day", () => {
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    expect(day("Thursday, October 8")).toHaveAccessibleName("Thursday, October 8, 1 item");
    expect(day("Friday, October 2")).toHaveAccessibleName("Friday, October 2, 1 item");
    expect(within(day("Thursday, October 8")).getByText("Kyoto")).toBeInTheDocument();
  });

  it("opens a day's details and acts on them", () => {
    const onOpenTrip = vi.fn();
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={onOpenTrip} />);

    fireEvent.click(day("Thursday, October 8"));
    const dialog = screen.getByRole("dialog", { name: "Thursday, October 8" });
    expect(dialog).toHaveTextContent("Reyes · Kyoto departs");
    expect(dialog).toHaveTextContent("6 nights · 2 travelers");
    expect(within(dialog).getByRole("button", { name: "Open trip" })).toHaveFocus();

    fireEvent.click(within(dialog).getByRole("button", { name: "Open trip" }));
    expect(onOpenTrip).toHaveBeenCalledWith("t-kyoto", "Kyoto Autumn Escape", "Reyes");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("offers to reply to a client comment", () => {
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    fireEvent.click(day("Friday, October 2"));
    const dialog = screen.getByRole("dialog", { name: "Friday, October 2" });
    expect(dialog).toHaveTextContent("Tanaka commented");
    expect(dialog).toHaveTextContent("“Can we swap lunch?”");
    expect(within(dialog).getByRole("button", { name: "Reply" })).toBeInTheDocument();
  });

  it("closes on Escape and puts focus back on the day", () => {
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    fireEvent.click(day("Thursday, October 8"));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(day("Thursday, October 8")).toHaveFocus();
  });

  it("closes on Escape pressed from a day tile and keeps focus there", () => {
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    fireEvent.click(day("Thursday, October 8"));
    day("Friday, October 9").focus();
    fireEvent.keyDown(day("Friday, October 9"), { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(day("Friday, October 9")).toHaveFocus();
  });

  it("toggles a day closed when it is clicked again", () => {
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    fireEvent.click(day("Thursday, October 8"));
    fireEvent.click(day("Thursday, October 8"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("moves between days with the arrow keys", () => {
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    day("Saturday, October 3").focus();
    fireEvent.keyDown(day("Saturday, October 3"), { key: "ArrowDown" });
    expect(day("Saturday, October 10")).toHaveFocus();

    fireEvent.keyDown(day("Saturday, October 10"), { key: "ArrowLeft" });
    expect(day("Friday, October 9")).toHaveFocus();

    fireEvent.keyDown(day("Friday, October 9"), { key: "Home" });
    expect(day("Sunday, October 4")).toHaveFocus();
  });

  it("changes month with the buttons and PageDown", () => {
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("heading", { name: "November 2026" })).toBeInTheDocument();
    expect(mocks.useCalendarEvents).toHaveBeenLastCalledWith({ agencyId: "agency-1", month: new Date(2026, 10, 1) });

    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByRole("heading", { name: "October 2026" })).toBeInTheDocument();

    day("Saturday, October 3").focus();
    fireEvent.keyDown(day("Saturday, October 3"), { key: "PageDown" });
    expect(screen.getByRole("heading", { name: "November 2026" })).toBeInTheDocument();
    expect(day("Tuesday, November 3")).toHaveFocus();
  });

  it("says how many trips have no dates", () => {
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);
    expect(screen.getByText("2 trips don't have travel dates yet")).toBeInTheDocument();
  });

  it("offers a retry when the calendar fails to load", () => {
    const refetch = vi.fn();
    mocks.useCalendarEvents.mockReturnValue(hookResult({ error: new Error("offline"), refetch }));
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
