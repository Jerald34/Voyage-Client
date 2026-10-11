import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProcessBubble from "../app/components/agent/process-bubble/ProcessBubble.jsx";
import { activeLabelFor } from "../app/components/agent/process-bubble/processBubbleLabels.js";

// Helper: render ProcessBubble with required defaults.
function renderBubble(props = {}) {
  return render(
    <ProcessBubble
      status="done"
      activeLabel="Worked for 1.0s"
      timeline={[]}
      durationMs={1000}
      defaultOpen={true}
      msgId="msg-test"
      {...props}
    />,
  );
}

describe("ProcessBubble — task row rendering", () => {
  it("PENDING task row: dot has no dotBreathing, label has no line-through", () => {
    const timeline = [
      { id: "task-1", kind: "task", status: "PENDING", label: "Research places" },
    ];
    renderBubble({ status: "done", activeLabel: "Worked for 1.0s", timeline });

    const taskRow = document.querySelector(".pb-task");
    expect(taskRow).toBeTruthy();

    // Check dot does NOT have dotBreathing class
    const dot = taskRow.querySelector("span[aria-hidden='true']");
    expect(dot).toBeTruthy();
    expect(dot.className).not.toContain("dotBreathing");

    // PENDING dot should have border classes
    expect(dot.className).toContain("border");
    expect(dot.className).toContain("border-text-soft");

    // Label should have no line-through
    const label = taskRow.querySelector("span:not([aria-hidden])");
    expect(label.className).not.toContain("line-through");
    expect(label.textContent).toBe("Research places");
  });

  it("RUNNING task row: dot has dotBreathing class", () => {
    const timeline = [
      { id: "task-2", kind: "task", status: "RUNNING", label: "Planning itinerary" },
    ];
    renderBubble({ status: "live", activeLabel: "Planning itinerary", timeline });

    const taskRow = document.querySelector(".pb-task");
    expect(taskRow).toBeTruthy();

    const dot = taskRow.querySelector("span[aria-hidden='true']");
    expect(dot).toBeTruthy();
    // dotBreathing is a CSS module class, so it's in the className string
    expect(dot.className).toContain("dotBreathing");
    expect(dot.className).toContain("bg-secondary");

    // Label should not have line-through
    const label = taskRow.querySelector("span:not([aria-hidden])");
    expect(label.className).not.toContain("line-through");
  });

  it("COMPLETED task row: label has line-through and opacity-60", () => {
    const timeline = [
      { id: "task-3", kind: "task", status: "COMPLETED", label: "Researched attractions" },
    ];
    renderBubble({ status: "done", activeLabel: "Worked for 1.0s", timeline });

    const taskRow = document.querySelector(".pb-task");
    expect(taskRow).toBeTruthy();

    // Dot should be solid (bg-secondary), no breathing
    const dot = taskRow.querySelector("span[aria-hidden='true']");
    expect(dot.className).toContain("bg-secondary");
    expect(dot.className).not.toContain("dotBreathing");

    // Label should have line-through and opacity-60
    const label = taskRow.querySelector("span:not([aria-hidden])");
    expect(label.className).toContain("line-through");
    expect(label.className).toContain("opacity-60");
    expect(label.textContent).toBe("Researched attractions");
  });

  it("FAILED task row: dot has rose-600/70 class, no dotBreathing", () => {
    const timeline = [
      { id: "task-4", kind: "task", status: "FAILED", label: "Failed validation" },
    ];
    renderBubble({ status: "done", activeLabel: "Worked for 1.0s", timeline });

    const taskRow = document.querySelector(".pb-task");
    expect(taskRow).toBeTruthy();

    const dot = taskRow.querySelector("span[aria-hidden='true']");
    expect(dot).toBeTruthy();
    expect(dot.className).toContain("bg-rose-600/70");
    expect(dot.className).not.toContain("dotBreathing");

    // Label should have no line-through
    const label = taskRow.querySelector("span:not([aria-hidden])");
    expect(label.className).not.toContain("line-through");
  });

  it("activeLabelFor returns RUNNING task label when present", () => {
    const timeline = [
      { id: "t1", kind: "thought", text: "Considering..." },
      { id: "t2", kind: "task", status: "PENDING", label: "Phase 1" },
      { id: "t3", kind: "task", status: "RUNNING", label: "Phase 2" },
      { id: "t4", kind: "task", status: "COMPLETED", label: "Phase 3" },
    ];

    const result = activeLabelFor(timeline);
    expect(result).toBe("Phase 2");
  });

  it("activeLabelFor falls back to tool label when no RUNNING task", () => {
    const timeline = [
      { id: "t1", kind: "tool", name: "add_itinerary_item" },
      { id: "t2", kind: "task", status: "COMPLETED", label: "Phase 1" },
    ];

    const result = activeLabelFor(timeline);
    expect(result).toBe("Adding a stop…");
  });

  it("activeLabelFor says it is choosing the next step when only thoughts are present", () => {
    const timeline = [
      { id: "t1", kind: "thought", text: "Considering options" },
    ];

    const result = activeLabelFor(timeline);
    expect(result).toBe("Choosing the next step…");
  });
});
