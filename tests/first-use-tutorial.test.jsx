import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FirstUseTutorial from "../app/components/trip-dashboard/tutorial/FirstUseTutorial.jsx";

const steps = [
  {
    id: "welcome",
    target: null,
    centered: true,
    title: "Welcome to Voyage, Ana",
    description: "A quick look at where things live.",
    bullets: [],
    chips: ["Dashboard", "Planner"],
    nextLabel: "Start tour",
  },
  {
    id: "needs",
    target: "needs",
    placement: "bottom",
    title: "Start with what needs you",
    description: "Needs you lists the trips waiting on you.",
    bullets: ["Click a row to act on that trip."],
  },
];

// jsdom has no layout: give tour targets a real box and everything else none.
let targetHeight = 80;

beforeEach(() => {
  targetHeight = 80;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function rect() {
    return this.dataset?.tourTarget
      ? { top: 100, left: 100, width: 200, height: targetHeight, right: 300, bottom: 100 + targetHeight, x: 100, y: 100 }
      : { top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0 };
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderTour() {
  return render(
    <>
      <div data-tour-target="needs">Needs you</div>
      <FirstUseTutorial open steps={steps} onClose={vi.fn()} onStepChange={vi.fn()} />
    </>,
  );
}

const spotlight = () => document.querySelector("[data-tour-spotlight]");

describe("FirstUseTutorial welcome card", () => {
  it("shows the welcome card with its section chips and a Start tour button", () => {
    renderTour();

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Welcome to Voyage, Ana")).toBeInTheDocument();
    const chips = within(dialog).getByRole("list", { name: "What the tour covers" });
    expect(within(chips).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Dashboard", "Planner"]);
    expect(within(dialog).getByRole("button", { name: "Start tour" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });

  it("centres the card with CSS, so it needs no measured window size", () => {
    renderTour();
    expect(screen.getByRole("dialog")).toHaveStyle({
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width: "370px",
      maxWidth: "calc(100vw - 32px)",
    });
  });

  it("switches the centred card to the full-width layout when the window turns narrow", async () => {
    let compact = false;
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: compact,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    renderTour();
    expect(screen.getByRole("dialog")).toHaveStyle({ left: "50%", transform: "translate(-50%, -50%)" });

    // A phone rotating (or a window shrinking) fires resize with no step change.
    compact = true;
    fireEvent(window, new Event("resize"));

    await waitFor(() =>
      expect(screen.getByRole("dialog")).toHaveStyle({
        left: "16px",
        right: "16px",
        top: "50%",
        transform: "translateY(-50%)",
      }),
    );
  });

  it("puts focus on Start tour, so Enter begins the tour instead of skipping it", async () => {
    renderTour();
    await waitFor(() => expect(screen.getByRole("button", { name: "Start tour" })).toHaveFocus());
  });

  it("names the dialog after the current step", () => {
    renderTour();
    expect(screen.getByRole("dialog", { name: /Welcome to Voyage, Ana/ })).toBeInTheDocument();
  });

  it("has no spotlight on the welcome card", () => {
    renderTour();
    expect(spotlight()).toHaveAttribute("data-tour-spotlight", "none");
    expect(spotlight()).toHaveStyle({ display: "none" });
  });

  it("spotlights the next step's target, and clears it again on Back", async () => {
    renderTour();

    fireEvent.click(screen.getByRole("button", { name: "Start tour" }));
    await waitFor(() => expect(spotlight()).not.toHaveStyle({ display: "none" }));
    expect(spotlight()).toHaveAttribute("data-tour-spotlight", "needs");

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => expect(spotlight()).toHaveStyle({ display: "none" }));
  });

  it("keeps bullets for normal steps", async () => {
    renderTour();
    fireEvent.click(screen.getByRole("button", { name: "Start tour" }));
    expect(await screen.findByText("Click a row to act on that trip.")).toBeInTheDocument();
  });

  it("re-measures the spotlight when the target resizes after it was first measured", async () => {
    const observers = [];
    class FakeResizeObserver {
      constructor(callback) {
        this.callback = callback;
        this.observed = [];
        this.disconnected = false;
        observers.push(this);
      }
      observe(element) {
        this.observed.push(element);
      }
      unobserve() {}
      disconnect() {
        this.disconnected = true;
      }
    }
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);

    renderTour();
    fireEvent.click(screen.getByRole("button", { name: "Start tour" }));

    const target = document.querySelector('[data-tour-target="needs"]');
    await waitFor(() => expect(observers.some((observer) => observer.observed.includes(target))).toBe(true));
    // 80px target + 8px inset on each side.
    await waitFor(() => expect(spotlight()).toHaveStyle({ height: "96px" }));

    // Let the effect's 90ms settle re-measure run first, so it cannot be what picks up the change below.
    await new Promise((resolve) => setTimeout(resolve, 150));

    // The real content swaps in and the target grows. Nothing but the ResizeObserver notices.
    targetHeight = 160;
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(spotlight()).toHaveStyle({ height: "96px" });

    const observer = observers.find((candidate) => candidate.observed.includes(target));
    observer.callback();
    await waitFor(() => expect(spotlight()).toHaveStyle({ height: "176px" }));

    // Leaving the step stops observing it.
    expect(observer.disconnected).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => expect(observer.disconnected).toBe(true));
  });

  it("starts a reopened tour on the welcome card and never reports the stale step", async () => {
    const onStepChange = vi.fn();
    const ui = (open) => (
      <>
        <div data-tour-target="needs">Needs you</div>
        <FirstUseTutorial open={open} steps={steps} onClose={vi.fn()} onStepChange={onStepChange} />
      </>
    );
    const { rerender } = render(ui(true));

    fireEvent.click(screen.getByRole("button", { name: "Start tour" }));
    expect(await screen.findByText("Start with what needs you")).toBeInTheDocument();
    expect(onStepChange).toHaveBeenLastCalledWith(steps[1]);

    rerender(ui(false));
    const callsBeforeReopen = onStepChange.mock.calls.length;
    rerender(ui(true));

    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Start tour" })).toBeInTheDocument();
    const callsAfterReopen = onStepChange.mock.calls.slice(callsBeforeReopen).map(([step]) => step);
    expect(callsAfterReopen).not.toContain(steps[1]);
    expect(onStepChange).toHaveBeenLastCalledWith(steps[0]);
  });
});
