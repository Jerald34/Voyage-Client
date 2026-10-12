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

  it("centres the card in the window", () => {
    renderTour();
    // jsdom's window is 1024 x 768; the card is 370 wide and estimated 310 tall.
    expect(screen.getByRole("dialog")).toHaveStyle({ left: "327px", top: "229px" });
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

    // The real content swaps in and the target grows; only the ResizeObserver can tell us.
    targetHeight = 160;
    observers.find((observer) => observer.observed.includes(target)).callback();

    await waitFor(() => expect(spotlight()).toHaveStyle({ height: "176px" }));
  });
});
