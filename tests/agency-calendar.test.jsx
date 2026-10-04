import { act, fireEvent, render, screen, within } from "@testing-library/react";
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

/** A day button by its date ("Saturday, October 3"), ignoring ", today" and what is on the day. */
const day = (label) =>
  screen.getByRole("button", {
    name: (name) => name === label || name.startsWith(`${label},`) || name.startsWith(`${label}:`),
  });

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

  it("says what is on each day and labels a trip on its first day", () => {
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    // Kyoto starts in five days; the comment carries no needsReply, so it is quiet.
    expect(day("Thursday, October 8")).toHaveAccessibleName("Thursday, October 8: 1 trip departing soon");
    expect(day("Friday, October 9")).toHaveAccessibleName("Friday, October 9: 1 trip");
    expect(day("Friday, October 2")).toHaveAccessibleName("Friday, October 2: 1 other update");
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

describe("AgencyCalendar across midnight", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
  });

  it("moves the today marker when the local date changes", () => {
    vi.setSystemTime(new Date(2026, 9, 3, 23, 59, 30));
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);
    expect(day("Saturday, October 3")).toHaveAccessibleName("Saturday, October 3, today");

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(day("Saturday, October 3")).toHaveAccessibleName("Saturday, October 3");
    expect(day("Sunday, October 4")).toHaveAccessibleName("Sunday, October 4, today");
    expect(screen.getByRole("heading", { name: "October 2026" })).toBeInTheDocument();
  });

  it("keeps tracking the date after the first rollover", () => {
    vi.setSystemTime(new Date(2026, 9, 3, 23, 59, 30));
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    act(() => {
      vi.advanceTimersByTime(60_000 + 24 * 60 * 60 * 1000);
    });
    expect(day("Monday, October 5")).toHaveAccessibleName("Monday, October 5, today");
  });

  it("catches up when the tab becomes visible again", () => {
    vi.setSystemTime(new Date(2026, 9, 3, 22, 0));
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    // The laptop slept through midnight: no timer fired, but the clock moved on.
    vi.setSystemTime(new Date(2026, 9, 5, 8, 0));
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(day("Monday, October 5")).toHaveAccessibleName("Monday, October 5, today");
  });

  it("stops watching the clock when it unmounts", () => {
    vi.setSystemTime(new Date(2026, 9, 3, 23, 59, 30));
    const { unmount } = render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("AgencyCalendar press feedback and focus", () => {
  it("presses the header buttons in slightly", () => {
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    for (const name of ["Previous month", "Today", "Next month"]) {
      const { className } = screen.getByRole("button", { name });
      expect(className).toContain("active:scale-[0.97]");
      expect(className).toContain("transition-[color,background-color,scale]");
    }
  });

  it("uses the stronger accent for the today outline and the day focus ring", () => {
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    expect(day("Saturday, October 3").className).toContain("outline-secondary-strong");
    expect(day("Saturday, October 3").className).not.toMatch(/outline-secondary(?!-)/);
    expect(day("Friday, October 9").className).toContain("focus-visible:ring-secondary-strong");
    expect(day("Friday, October 9").className).not.toMatch(/focus-visible:ring-secondary(?!-)/);
  });
});

describe("AgencyCalendar Escape", () => {
  it("handles Escape on a day tile without letting it travel further", () => {
    const outside = vi.fn();
    document.addEventListener("keydown", outside);
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    fireEvent.click(day("Thursday, October 8"));
    day("Friday, October 9").focus();
    const notPrevented = fireEvent.keyDown(day("Friday, October 9"), { key: "Escape" });
    document.removeEventListener("keydown", outside);

    expect(notPrevented).toBe(false);
    expect(outside).not.toHaveBeenCalled();
  });
});

describe("AgencyCalendar loading", () => {
  const skeletons = (container) => container.querySelectorAll("[data-skeleton]");

  it("puts a quiet placeholder in each day of the month while the first load is in flight", () => {
    mocks.useCalendarEvents.mockReturnValue(hookResult({ data: null, isLoading: true }));
    const { container } = render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    expect(screen.getByRole("grid")).toHaveAttribute("aria-busy", "true");
    expect(skeletons(container)).toHaveLength(31);
    for (const bar of skeletons(container)) {
      expect(bar).toHaveAttribute("aria-hidden", "true");
      expect(bar.className).toContain("motion-safe:animate-pulse");
    }
    // Nothing extra is announced for a tile.
    expect(day("Saturday, October 3")).toHaveAccessibleName("Saturday, October 3, today");
  });

  it("leaves the days outside the month without a placeholder", () => {
    mocks.useCalendarEvents.mockReturnValue(hookResult({ data: null, isLoading: true }));
    const { container } = render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    const outside = day("Sunday, September 27");
    expect(skeletons(outside)).toHaveLength(0);
    expect(skeletons(container)).toHaveLength(31);
  });

  it("shows no placeholders while refreshing a month that already has data", () => {
    mocks.useCalendarEvents.mockReturnValue(hookResult({ isLoading: true }));
    const { container } = render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    expect(screen.getByRole("grid")).not.toHaveAttribute("aria-busy");
    expect(skeletons(container)).toHaveLength(0);
  });

  it("shows no placeholders once loading has failed", () => {
    mocks.useCalendarEvents.mockReturnValue(hookResult({ data: null, isLoading: false, error: new Error("offline") }));
    const { container } = render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    expect(skeletons(container)).toHaveLength(0);
  });
});

/** A calendar event at 09:00 local on October `dayOfMonth`. */
function ev(id, kind, dayOfMonth, detail = {}) {
  return {
    id,
    kind,
    tripId: "t-lisbon",
    tripTitle: "Lisbon Getaway",
    clientName: "Tanaka",
    occurredAt: new Date(2026, 9, dayOfMonth, 9).toISOString(),
    detail,
  };
}

const ACTION_PAYLOAD = {
  ...PAYLOAD,
  trips: [],
  events: [
    // Monday, October 5: two replies needed, a 2★ rating, a link expiring, a view and a sent link.
    ev("client_commented:a", "client_commented", 5, { excerpt: "One", needsReply: true }),
    ev("client_commented:b", "client_commented", 5, { excerpt: "Two", needsReply: true }),
    ev("proposal_rated:s1", "proposal_rated", 5, { rating: 2 }),
    ev("share_expires:s1", "share_expires", 5),
    ev("client_viewed:s1", "client_viewed", 5, { viewCount: 3 }),
    ev("share_sent:s1", "share_sent", 5),
    // Tuesday, October 6: a link expiring and a view.
    ev("share_expires:s2", "share_expires", 6),
    ev("client_viewed:s2", "client_viewed", 6, { viewCount: 1 }),
    // Wednesday, October 7: quiet activity only.
    ev("client_viewed:s3", "client_viewed", 7, { viewCount: 1 }),
    ev("share_sent:s3", "share_sent", 7),
  ],
};

describe("AgencyCalendar action marks", () => {
  beforeEach(() => {
    mocks.useCalendarEvents.mockReturnValue(hookResult({ data: ACTION_PAYLOAD }));
  });

  const marks = (label) => day(label).querySelector("[data-day-marks]");

  it("says what needs you on a day, most urgent first", () => {
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    expect(day("Monday, October 5")).toHaveAccessibleName(
      "Monday, October 5: 2 comments need a reply, 1 low rating, 1 link expiring, 2 other updates",
    );
  });

  it("makes each tile a size container whose marks wrap under the day number when narrow", () => {
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    expect(day("Monday, October 5").className).toContain("@container");
    expect(marks("Monday, October 5").parentElement.className).toContain("flex-wrap");
    expect(marks("Monday, October 5")).toHaveAttribute("aria-hidden", "true");
  });

  it("always shows the most urgent icon, its count from a 60px tile, and a second icon from 84px", () => {
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    const [first, second] = marks("Monday, October 5").querySelectorAll("[data-action]");
    expect(first.dataset.action).toBe("reply");
    expect(first.className).toContain("inline-flex");
    expect(first.className).not.toContain("hidden");
    expect(first.className).toContain("text-status-danger");
    expect(within(first).getByText("2").className).toContain("hidden @min-[46px]:inline");
    expect(second.dataset.action).toBe("lowRating");
    expect(second.className).toContain("hidden @min-[70px]:inline-flex");
  });

  it("counts the rest as +N: after the first icon from a 60px tile, after the first two kinds from 84px", () => {
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    const [medium, wide] = marks("Monday, October 5").querySelectorAll("[data-more]");
    expect(medium).toHaveTextContent("+2"); // the rating and the link, after the replies
    expect(medium.className).toContain("hidden @min-[46px]:inline @min-[70px]:hidden");
    expect(wide).toHaveTextContent("+1"); // the link, after the replies and the rating
    expect(wide.className).toContain("hidden @min-[70px]:inline");
  });

  it("adds the quiet count beside a single kind of action, on wide tiles only", () => {
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    const tuesday = marks("Tuesday, October 6");
    const icon = tuesday.querySelector("[data-action]");
    expect(icon.dataset.action).toBe("expiring");
    expect(icon.className).toContain("text-status-warning");
    const quiet = tuesday.querySelector("[data-quiet]");
    expect(quiet).toHaveTextContent("·1");
    expect(quiet.className).toContain("hidden @min-[70px]:inline");
    // With two kinds of action there is no room for it.
    expect(marks("Monday, October 5").querySelector("[data-quiet]")).toBeNull();
  });

  it("shows only the quiet count on a day with nothing to act on", () => {
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    const wednesday = marks("Wednesday, October 7");
    expect(wednesday).toHaveTextContent("·2");
    expect(wednesday.className).not.toContain("hidden");
    expect(wednesday.querySelector("[data-action]")).toBeNull();
    expect(day("Wednesday, October 7")).toHaveAccessibleName("Wednesday, October 7: 2 other updates");
  });

  it("marks a trip that departs within the week in green", () => {
    mocks.useCalendarEvents.mockReturnValue(hookResult());
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    const icon = marks("Thursday, October 8").querySelector("[data-action]");
    expect(icon.dataset.action).toBe("departing");
    expect(icon.className).toContain("text-status-success");
  });

  it("explains every mark in the legend", () => {
    render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} />);

    for (const label of ["Trip", "Needs reply", "Low rating", "Link expires", "Departs soon", "Other activity"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.queryByText("Client activity")).not.toBeInTheDocument();
    expect(screen.queryByText("Link expiry")).not.toBeInTheDocument();
  });
});

describe("AgencyCalendar refresh", () => {
  it("reloads the month when refreshKey changes, and not on the first render", () => {
    const refetch = vi.fn();
    mocks.useCalendarEvents.mockReturnValue(hookResult({ refetch }));
    const { rerender } = render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} refreshKey={0} />);
    expect(refetch).not.toHaveBeenCalled();

    rerender(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} refreshKey={1} />);
    expect(refetch).toHaveBeenCalledOnce();

    rerender(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} refreshKey={1} />);
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("does not reload when only the refetch function changes", () => {
    const refetch = vi.fn();
    mocks.useCalendarEvents.mockReturnValue(hookResult({ refetch }));
    const { rerender } = render(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} refreshKey={1} />);

    // The hook returns a new refetch when the month or agency changes; the same refreshKey must not trigger it.
    const nextRefetch = vi.fn();
    mocks.useCalendarEvents.mockReturnValue(hookResult({ refetch: nextRefetch }));
    rerender(<AgencyCalendar agencyId="agency-1" onOpenTrip={vi.fn()} refreshKey={1} />);

    expect(nextRefetch).not.toHaveBeenCalled();
    expect(refetch).not.toHaveBeenCalled();
  });
});
