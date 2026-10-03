import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CalendarDayPopover from "../app/agency/[agencyId]/components/dashboard/widgets/CalendarDayPopover.jsx";
import { buildCalendarDays } from "../app/lib/calendarDays.js";

const TODAY = new Date(2026, 9, 3, 10, 0);
const OCT = new Date(2026, 9, 1);

const kyoto = {
  tripId: "t-kyoto",
  tripTitle: "Kyoto Autumn Escape",
  clientName: "Reyes",
  placeLabel: "Kyoto",
  startDate: "2026-10-08",
  endDate: "2026-10-14",
  status: "APPROVED_INTERNAL",
  travelerCount: 2,
};
const osaka = { ...kyoto, tripId: "t-osaka", tripTitle: "Osaka Food Tour", clientName: "Tanaka", placeLabel: "Osaka" };

function cellFor(trips, key) {
  const payload = { from: "2026-09-27", to: "2026-11-07", generatedAt: "", tripsWithoutDates: 0, trips, events: [] };
  return buildCalendarDays(payload, OCT, TODAY).find((cell) => cell.key === key);
}

function rect({ left = 0, top = 0, width = 0, height = 0 }) {
  return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON() {} };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CalendarDayPopover", () => {
  it("only moves focus in once the popover is visible", () => {
    const seen = [];
    const realFocus = HTMLElement.prototype.focus;
    vi.spyOn(HTMLElement.prototype, "focus").mockImplementation(function focus(...args) {
      const dialog = this.closest?.('[role="dialog"]');
      seen.push({ label: this.getAttribute("aria-label") ?? this.textContent, visibility: dialog?.style.visibility });
      return realFocus.apply(this, args);
    });

    const anchor = document.createElement("button");
    const container = document.createElement("div");
    render(
      <CalendarDayPopover
        cell={cellFor([kyoto], "2026-10-08")}
        todayKey="2026-10-03"
        anchorEl={anchor}
        containerEl={container}
        onClose={vi.fn()}
        onAction={vi.fn()}
      />,
    );

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((call) => call.visibility === "visible")).toBe(true);
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Open trip" })).toHaveFocus();
  });

  it("focuses the first action again when it switches to another day", () => {
    const props = { todayKey: "2026-10-03", anchorEl: null, containerEl: null, onClose: vi.fn(), onAction: vi.fn() };
    const { rerender } = render(<CalendarDayPopover {...props} cell={cellFor([kyoto], "2026-10-08")} />);

    screen.getByRole("dialog").ownerDocument.body.focus();
    rerender(<CalendarDayPopover {...props} cell={cellFor([kyoto], "2026-10-09")} />);

    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Open trip" })).toHaveFocus();
  });

  it("focuses the close button on an empty day", () => {
    render(
      <CalendarDayPopover
        cell={cellFor([], "2026-10-08")}
        todayKey="2026-10-03"
        anchorEl={null}
        containerEl={null}
        onClose={vi.fn()}
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("focuses the first action in the inline variant", () => {
    render(
      <CalendarDayPopover
        inline
        cell={cellFor([kyoto], "2026-10-08")}
        todayKey="2026-10-03"
        anchorEl={null}
        containerEl={null}
        onClose={vi.fn()}
        onAction={vi.fn()}
      />,
    );
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Open trip" })).toHaveFocus();
  });
});
