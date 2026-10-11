import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProcessBubble from "../app/components/agent/process-bubble/ProcessBubble.jsx";

// One visible step, so the bubble has a step list to toggle.
const ONE_STEP = [{ id: "s1", kind: "tool", name: "search_google_places" }];

// Helper: render ProcessBubble with required defaults.
function renderBubble(props = {}) {
  return render(
    <ProcessBubble
      status="done"
      activeLabel="Researched 4 places · 2.3s"
      timeline={ONE_STEP}
      durationMs={2300}
      defaultOpen={false}
      msgId="msg-test"
      {...props}
    />,
  );
}

describe("ProcessBubble — state: live-thinking", () => {
  it("shows the reading label and breathing dot while live with no tools", () => {
    renderBubble({ status: "live", activeLabel: "Reading your request…", timeline: ONE_STEP });

    expect(screen.getByText("Reading your request…")).toBeInTheDocument();

    // Button should be collapsed by default
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-expanded", "false");

    // Dot should have the breathing class (rendered via CSS module — non-scoped classNameStrategy)
    const dot = document.querySelector(".pb-dot");
    expect(dot).not.toBeNull();
    // dotBreathing class is applied when live
    expect(dot.className).toContain("dotBreathing");
  });
});

describe("ProcessBubble — state: live-tool", () => {
  it("shows the tool label and expands to show tool rows on click", () => {
    const timeline = [{ id: "t1", kind: "tool", name: "add_itinerary_item" }];
    renderBubble({
      status: "live",
      activeLabel: "Adding a stop…",
      timeline,
    });

    expect(screen.getByText("Adding a stop…")).toBeInTheDocument();

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-expanded", "false");

    // Expand
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");

    // Tool row content: the past-tense label
    expect(screen.getByText("Added a stop")).toBeInTheDocument();
  });
});

describe("ProcessBubble — state: done", () => {
  it("shows the summary label and the dot does NOT have breathing class", () => {
    const timeline = [{ id: "t1", kind: "tool", name: "add_itinerary_item" }];
    renderBubble({
      status: "done",
      activeLabel: "Built itinerary · 2.3s",
      timeline,
    });

    expect(screen.getByText("Built itinerary · 2.3s")).toBeInTheDocument();

    const dot = document.querySelector(".pb-dot");
    expect(dot).not.toBeNull();
    // dotBreathing class should NOT be present when done
    expect(dot.className).not.toContain("dotBreathing");
  });
});

describe("ProcessBubble — keyboard expand/collapse", () => {
  it("toggles open on click (Enter/Space handled natively by button)", () => {
    renderBubble({ status: "done", activeLabel: "Built itinerary · 2.3s", defaultOpen: false });

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-expanded", "false");

    // Click to expand
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");

    // Click again to collapse
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
  });
});

describe("ProcessBubble — ARIA attributes", () => {
  it("has the correct aria roles and attributes", () => {
    renderBubble({ msgId: "msg-test" });

    // Section has aria-label="Agent process"
    const section = screen.getByRole("region", { name: "Agent process" });
    expect(section).toBeInTheDocument();

    // Button has aria-controls pointing to timeline div
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-controls", "process-timeline-msg-test");

    // The label span has aria-live and aria-atomic
    const label = document.querySelector('[aria-live="polite"]');
    expect(label).not.toBeNull();
    expect(label).toHaveAttribute("aria-atomic", "true");
  });

  it("exposes the timeline region with correct role and label when open", () => {
    renderBubble({ msgId: "msg-test", defaultOpen: true });

    const region = screen.getByRole("region", { name: "Process timeline" });
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute("id", "process-timeline-msg-test");
  });
});

describe("ProcessBubble — task rows", () => {
  it("two tasks with the same label are NOT coalesced", () => {
    const timeline = [
      { id: "t1", kind: "task", status: "COMPLETED", label: "Research" },
      { id: "t2", kind: "task", status: "COMPLETED", label: "Research" },
    ];
    renderBubble({ status: "done", activeLabel: "Worked for 1.0s", timeline, defaultOpen: true });

    const rows = document.querySelectorAll(".pb-task");
    expect(rows.length).toBe(2);
  });
});

describe("ProcessBubble — reduced-motion", () => {
  beforeEach(() => {
    // Override matchMedia to report reduced-motion preference
    window.matchMedia = (query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  });

  it("renders without throwing under prefers-reduced-motion", () => {
    expect(() =>
      renderBubble({ status: "live", activeLabel: "Reading your request…", timeline: ONE_STEP }),
    ).not.toThrow();

    expect(screen.getByText("Reading your request…")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});

describe("ProcessBubble — wording", () => {
  it("hides the agent's progress-tracking tools from the step list", () => {
    const timeline = [
      { id: "t1", kind: "tool", name: "record_agent_task" },
      { id: "t2", kind: "tool", name: "search_google_places" },
    ];
    renderBubble({ status: "done", activeLabel: "Finished in 1.0s", timeline, defaultOpen: true });

    expect(screen.getByText("Searched for places")).toBeInTheDocument();
    expect(screen.queryByText(/record agent task/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Finished a step")).not.toBeInTheDocument();
  });

  it("shows a saved run's old summary in the new wording", () => {
    renderBubble({ status: "done", activeLabel: "Thought for 1.2s", timeline: ONE_STEP });

    expect(screen.getByText("Replied in 1.2s")).toBeInTheDocument();
  });

  it("does not reword a live label", () => {
    renderBubble({ status: "live", activeLabel: "Thought for 1.2s", timeline: ONE_STEP });

    expect(screen.getByText("Thought for 1.2s")).toBeInTheDocument();
  });

  it("shows only the header, with no toggle, when every step is a progress-tracking tool", () => {
    const timeline = [
      { id: "t1", kind: "tool", name: "record_agent_task" },
      { id: "t2", kind: "tool", name: "update_agent_task" },
    ];
    renderBubble({ status: "done", activeLabel: "Replied in 1.0s", timeline });

    expect(screen.getByText("Replied in 1.0s")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("groups repeated steps by their visible label, even across a hidden tracking tool", () => {
    const timeline = [
      { id: "t1", kind: "tool", name: "add_itinerary_item" },
      { id: "t2", kind: "tool", name: "update_agent_task" },
      { id: "t3", kind: "tool", name: "add_itinerary_item" },
      { id: "t4", kind: "tool", name: "add_itinerary_item" },
    ];
    renderBubble({ status: "done", activeLabel: "Built itinerary · 1.0s", timeline, defaultOpen: true });

    expect(screen.getAllByText("Added a stop")).toHaveLength(1);
    expect(screen.getByLabelText("3 times")).toBeInTheDocument();
  });

  it("groups adjacent unknown tools into one generic row", () => {
    const timeline = [
      { id: "t1", kind: "tool", name: "mystery_a" },
      { id: "t2", kind: "tool", name: "mystery_b" },
    ];
    renderBubble({ status: "done", activeLabel: "Finished in 1.0s", timeline, defaultOpen: true });

    expect(screen.getAllByText("Finished a step")).toHaveLength(1);
    expect(screen.getByLabelText("2 times")).toBeInTheDocument();
  });
});
