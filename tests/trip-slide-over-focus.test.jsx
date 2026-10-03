import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import fixtures from "./fixtures/dashboard-payloads.json";

const mocks = vi.hoisted(() => ({ fetchApi: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("../app/components/icons/index.js", () => ({
  ChatIcon: () => null,
  CloseIcon: () => null,
  ReplyIcon: () => null,
}));

vi.mock("../app/lib/api/client.js", () => ({
  API_URL: "/api",
  fetchApi: (...args) => mocks.fetchApi(...args),
}));

import OwnerOverview from "../app/agency/[agencyId]/components/dashboard/OwnerOverview.jsx";
import TripSlideOver from "../app/agency/[agencyId]/components/dashboard/TripSlideOver.jsx";
import { resetCalendarCacheForTests } from "../app/hooks/useCalendarEvents.js";

const CALENDAR = {
  from: "2026-09-27",
  to: "2026-11-07",
  generatedAt: "2026-10-03T02:00:00.000Z",
  tripsWithoutDates: 0,
  events: [],
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
};

beforeEach(() => {
  mocks.fetchApi.mockReset();
  resetCalendarCacheForTests();
  // The dashboard payload stays as given; the calendar and the slide-over's shares load.
  mocks.fetchApi.mockImplementation((path) => {
    if (String(path).includes("/dashboard/calendar")) return Promise.resolve(CALENDAR);
    if (String(path).includes("/dashboard?")) return new Promise(() => {});
    return Promise.resolve({ shares: [], comments: [] });
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function Harness({ onClose = () => {}, showOpener = true }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {showOpener ? (
        <button type="button" onClick={() => setOpen(true)}>
          Open comments
        </button>
      ) : null}
      <TripSlideOver
        isOpen={open}
        onClose={() => {
          setOpen(false);
          onClose();
        }}
        agencyId="agency-1"
        tripId="t-1"
        tripTitle="Kyoto"
      />
    </>
  );
}

/** The slide-over's dialog, found even while it is hidden. */
const panel = (container) => container.querySelector("aside");

describe("TripSlideOver focus", () => {
  it("is unreachable while closed", () => {
    const { container } = render(<Harness />);

    expect(panel(container)).toHaveAttribute("inert");
    expect(panel(container)).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("moves focus into the panel when it opens and is reachable then", async () => {
    const { container } = render(<Harness />);

    screen.getByRole("button", { name: "Open comments" }).focus();
    fireEvent.click(screen.getByRole("button", { name: "Open comments" }));

    expect(await screen.findByRole("dialog", { name: "Trip comments: Kyoto" })).toBeInTheDocument();
    expect(panel(container)).not.toHaveAttribute("inert");
    expect(panel(container)).not.toHaveAttribute("aria-hidden");
    expect(screen.getByRole("button", { name: "Close panel" })).toHaveFocus();
    await waitFor(() => expect(screen.queryByText("Loading comments…")).not.toBeInTheDocument());
  });

  it("gives focus back to what opened it when it closes", async () => {
    const { container } = render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open comments" });

    opener.focus();
    fireEvent.click(opener);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));

    expect(opener).toHaveFocus();
    expect(panel(container)).toHaveAttribute("inert");
    await waitFor(() => expect(screen.queryByText("Loading comments…")).not.toBeInTheDocument());
  });

  it("gives focus back after Escape too", async () => {
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open comments" });

    opener.focus();
    fireEvent.click(opener);
    await screen.findByRole("dialog");
    fireEvent.keyDown(document, { key: "Escape" });

    expect(opener).toHaveFocus();
    await waitFor(() => expect(screen.queryByText("Loading comments…")).not.toBeInTheDocument());
  });

  it("does not try to focus an opener that has left the page", async () => {
    const { rerender } = render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open comments" });
    const focus = vi.spyOn(opener, "focus");

    opener.focus();
    focus.mockClear();
    fireEvent.click(opener);
    await screen.findByRole("dialog");
    rerender(<Harness showOpener={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));

    expect(focus).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText("Loading comments…")).not.toBeInTheDocument());
  });
});

describe("Calendar action hands focus to the slide-over and back", () => {
  it("opens the slide-over with focus inside, then returns focus to the day tile", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 3, 10));
    render(
      <OwnerOverview agencyId="agency-1" initialData={fixtures.ownerBusy} onOpenTrip={vi.fn()} onNewTrip={vi.fn()} />,
    );
    const tile = await screen.findByRole("button", { name: /^Thursday, October 8,/ });

    fireEvent.click(tile);
    const popover = screen.getByRole("dialog", { name: "Thursday, October 8" });
    fireEvent.click(within(popover).getByRole("button", { name: "Open trip" }));

    const slideOver = await screen.findByRole("dialog", { name: /Trip comments: Kyoto Autumn Escape/ });
    expect(screen.queryByRole("dialog", { name: "Thursday, October 8" })).not.toBeInTheDocument();
    expect(slideOver).toContainElement(document.activeElement);
    expect(screen.getByRole("button", { name: "Close panel" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
    expect(screen.getByRole("button", { name: /^Thursday, October 8,/ })).toHaveFocus();
    // A hidden element has no accessible name, so find the slide-over by its role alone.
    expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute("inert");
    await act(async () => {});
  });
});
