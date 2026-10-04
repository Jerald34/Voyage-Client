import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useRef, useState } from "react";
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
import StaffMyWork from "../app/agency/[agencyId]/components/dashboard/StaffMyWork.jsx";
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

/**
 * `fallback` is how the slide-over is told where focus goes if its opener has
 * left the page: "present" (a target on the page, handed over as returnFocusRef),
 * "unwired" (a target on the page, but no prop) or "gone" (the prop is passed,
 * but the target is not rendered).
 */
function Harness({ onClose = () => {}, showOpener = true, tripId = "t-1", fallback = "unwired" }) {
  const [open, setOpen] = useState(false);
  const fallbackRef = useRef(null);
  return (
    <>
      {showOpener ? (
        <button type="button" onClick={() => setOpen(true)}>
          Open comments
        </button>
      ) : null}
      {fallback !== "gone" ? (
        <section ref={fallbackRef} tabIndex={-1} aria-label="Needs you today">
          Needs you today
        </section>
      ) : null}
      <TripSlideOver
        isOpen={open}
        onClose={() => {
          setOpen(false);
          onClose();
        }}
        agencyId="agency-1"
        tripId={tripId}
        tripTitle="Kyoto"
        returnFocusRef={fallback === "unwired" ? undefined : fallbackRef}
      />
    </>
  );
}

/** Opens the harness's slide-over from its button and waits for the dialog. */
async function openFromButton() {
  const opener = screen.getByRole("button", { name: "Open comments" });
  opener.focus();
  fireEvent.click(opener);
  await screen.findByRole("dialog");
  return opener;
}

/** One share with one pending comment, so the panel has a Reply button between Close and the footer. */
function serveOneComment() {
  mocks.fetchApi.mockImplementation((path) => {
    if (String(path).includes("/dashboard/calendar")) return Promise.resolve(CALENDAR);
    if (String(path).includes("/dashboard?")) return new Promise(() => {});
    if (String(path).endsWith("/comments")) {
      return Promise.resolve({
        comments: [
          { id: "c-1", content: "Can we swap lunch?", status: "PENDING", authorName: "Ana", createdAt: "2026-10-02T02:00:00.000Z" },
        ],
      });
    }
    return Promise.resolve({ shares: [{ id: "s-1" }] });
  });
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
    const tile = await screen.findByRole("button", { name: /^Thursday, October 8[,:]/ });

    fireEvent.click(tile);
    const popover = screen.getByRole("dialog", { name: "Thursday, October 8" });
    fireEvent.click(within(popover).getByRole("button", { name: "Open trip" }));

    const slideOver = await screen.findByRole("dialog", { name: /Trip comments: Kyoto Autumn Escape/ });
    expect(screen.queryByRole("dialog", { name: "Thursday, October 8" })).not.toBeInTheDocument();
    expect(slideOver).toContainElement(document.activeElement);
    expect(screen.getByRole("button", { name: "Close panel" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
    expect(screen.getByRole("button", { name: /^Thursday, October 8[,:]/ })).toHaveFocus();
    // A hidden element has no accessible name, so find the slide-over by its role alone.
    expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute("inert");
    await act(async () => {});
  });
});

describe("TripSlideOver focus fallback", () => {
  it("lands on the fallback when the opener left the page while the panel was open", async () => {
    const { rerender } = render(<Harness fallback="present" />);
    await openFromButton();

    // A poll removed the row that opened the panel.
    rerender(<Harness fallback="present" showOpener={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));

    expect(screen.getByRole("region", { name: "Needs you today" })).toHaveFocus();
    await waitFor(() => expect(screen.queryByText("Loading comments…")).not.toBeInTheDocument());
  });

  it("lands on the fallback after Escape too", async () => {
    const { rerender } = render(<Harness fallback="present" />);
    await openFromButton();

    rerender(<Harness fallback="present" showOpener={false} />);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.getByRole("region", { name: "Needs you today" })).toHaveFocus();
    await waitFor(() => expect(screen.queryByText("Loading comments…")).not.toBeInTheDocument());
  });

  it("prefers the opener when it is still on the page", async () => {
    render(<Harness fallback="present" />);
    const opener = await openFromButton();

    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));

    expect(opener).toHaveFocus();
    await waitFor(() => expect(screen.queryByText("Loading comments…")).not.toBeInTheDocument());
  });

  it("leaves focus alone when no fallback was given", async () => {
    const { rerender } = render(<Harness fallback="unwired" />);
    await openFromButton();

    rerender(<Harness fallback="unwired" showOpener={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));

    expect(screen.getByRole("region", { name: "Needs you today" })).not.toHaveFocus();
    await waitFor(() => expect(screen.queryByText("Loading comments…")).not.toBeInTheDocument());
  });

  it("copes with a fallback that is not rendered either", async () => {
    const { rerender } = render(<Harness fallback="gone" />);
    await openFromButton();

    rerender(<Harness fallback="gone" showOpener={false} />);

    expect(() => fireEvent.click(screen.getByRole("button", { name: "Close panel" }))).not.toThrow();
    expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute("inert");
    await waitFor(() => expect(screen.queryByText("Loading comments…")).not.toBeInTheDocument());
  });
});

describe("TripSlideOver focus containment", () => {
  const closeButton = () => screen.getByRole("button", { name: "Close panel" });
  const footerButton = () => screen.getByRole("button", { name: /Open in Command Center/ });

  async function openAndSettle(ui = <Harness />) {
    const view = render(ui);
    const opener = await openFromButton();
    await waitFor(() => expect(screen.queryByText("Loading comments…")).not.toBeInTheDocument());
    return { ...view, opener };
  }

  it("wraps Tab from the last focusable element to the first", async () => {
    await openAndSettle();

    footerButton().focus();
    const notPrevented = fireEvent.keyDown(footerButton(), { key: "Tab" });

    expect(notPrevented).toBe(false);
    expect(closeButton()).toHaveFocus();
  });

  it("wraps Shift+Tab from the first focusable element to the last", async () => {
    await openAndSettle();

    expect(closeButton()).toHaveFocus();
    const notPrevented = fireEvent.keyDown(closeButton(), { key: "Tab", shiftKey: true });

    expect(notPrevented).toBe(false);
    expect(footerButton()).toHaveFocus();
  });

  it("leaves Tab alone between the ends, so the browser moves through the panel", async () => {
    serveOneComment();
    render(<Harness />);
    await openFromButton();
    const reply = await screen.findByRole("button", { name: "Reply" });

    reply.focus();

    expect(fireEvent.keyDown(reply, { key: "Tab" })).toBe(true);
    expect(fireEvent.keyDown(reply, { key: "Tab", shiftKey: true })).toBe(true);
    expect(reply).toHaveFocus();
  });

  it("skips disabled, hidden and inert controls when finding the ends", async () => {
    await openAndSettle();

    const dialog = screen.getByRole("dialog");
    for (const attributes of [{ disabled: "" }, { hidden: "" }, { inert: "" }, { style: "display: none" }]) {
      const stray = document.createElement("button");
      for (const [name, value] of Object.entries(attributes)) stray.setAttribute(name, value);
      dialog.append(stray);
    }
    // After the footer button the DOM now ends in four controls that cannot take focus.
    footerButton().focus();
    fireEvent.keyDown(footerButton(), { key: "Tab" });

    expect(closeButton()).toHaveFocus();
    fireEvent.keyDown(closeButton(), { key: "Tab", shiftKey: true });
    expect(footerButton()).toHaveFocus();
  });

  it("pulls focus back in when Tab is pressed with focus outside the panel", async () => {
    await openAndSettle();

    document.activeElement.blur();
    expect(document.body).toHaveFocus();
    expect(fireEvent.keyDown(document.body, { key: "Tab" })).toBe(false);
    expect(closeButton()).toHaveFocus();

    document.activeElement.blur();
    expect(fireEvent.keyDown(document.body, { key: "Tab", shiftKey: true })).toBe(false);
    expect(footerButton()).toHaveFocus();
  });

  it("does not trap Tab while the panel is closed", () => {
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open comments" });
    opener.focus();

    expect(fireEvent.keyDown(opener, { key: "Tab" })).toBe(true);
    expect(opener).toHaveFocus();
  });

  it("keeps the original opener and moves focus inside when the trip changes while open", async () => {
    const { rerender, opener } = await openAndSettle(<Harness tripId="t-1" />);

    // Focus was somewhere in the panel, then another row opened a different trip.
    footerButton().focus();
    rerender(<Harness tripId="t-2" />);

    expect(screen.getByRole("dialog")).toContainElement(document.activeElement);
    expect(closeButton()).toHaveFocus();
    await waitFor(() => expect(screen.queryByText("Loading comments…")).not.toBeInTheDocument());

    fireEvent.click(closeButton());
    expect(opener).toHaveFocus();
  });

  it("pulls focus back into the panel when the trip changes while focus is outside it", async () => {
    const { rerender } = await openAndSettle(<Harness tripId="t-1" />);

    document.activeElement.blur();
    rerender(<Harness tripId="t-2" />);

    expect(closeButton()).toHaveFocus();
    await waitFor(() => expect(screen.queryByText("Loading comments…")).not.toBeInTheDocument());
  });
});

describe("Dashboards give the slide-over a stable place to return focus", () => {
  /** The first dashboard fetch is held so the test decides when a poll lands. */
  function holdDashboardFetch() {
    let respond;
    const pending = new Promise((resolve) => {
      respond = resolve;
    });
    mocks.fetchApi.mockImplementation((path) => {
      if (String(path).includes("/dashboard/calendar")) return Promise.resolve(CALENDAR);
      if (String(path).includes("/dashboard?")) return pending;
      return Promise.resolve({ shares: [], comments: [] });
    });
    return respond;
  }

  const withoutComments = (payload) => ({ ...payload, worklist: { ...payload.worklist, unreadComments: [] } });

  it.each([
    ["owner", fixtures.ownerBusy, (props) => <OwnerOverview {...props} />],
    ["staff", fixtures.staff, (props) => <StaffMyWork {...props} onOpenItineraries={vi.fn()} />],
  ])("%s: returns to Needs you today when a poll removed the row that opened it", async (_, payload, ui) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 3, 10));
    const respond = holdDashboardFetch();
    render(ui({ agencyId: "agency-1", initialData: payload, onOpenTrip: vi.fn(), onNewTrip: vi.fn() }));

    const list = screen.getByRole("region", { name: "Needs you today" });
    const reply = within(list).getAllByRole("button", { name: "Reply" })[0];
    reply.focus();
    fireEvent.click(reply);
    await screen.findByRole("dialog", { name: /Trip comments: Kyoto Autumn Escape/ });

    await act(async () => {
      respond(withoutComments(payload));
    });
    expect(reply).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
    expect(screen.getByRole("region", { name: "Needs you today" })).toHaveFocus();
    await act(async () => {});
  });
});
