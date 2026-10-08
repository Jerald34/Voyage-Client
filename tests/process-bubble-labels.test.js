import { describe, expect, it } from "vitest";
import { toolToActiveLabel, summarize } from "../app/components/agent/process-bubble/processBubbleLabels.js";

describe("toolToActiveLabel", () => {
  it('maps plan_itinerary to "Planning itinerary…"', () => {
    expect(toolToActiveLabel("plan_itinerary")).toBe("Planning itinerary…");
  });

  it('maps add_itinerary_item to "Adding itinerary item…"', () => {
    expect(toolToActiveLabel("add_itinerary_item")).toBe("Adding itinerary item…");
  });

  it('maps update_itinerary_item to "Updating itinerary item…"', () => {
    expect(toolToActiveLabel("update_itinerary_item")).toBe("Updating itinerary item…");
  });

  it('maps map_pinpoint to "Pinpointing on map…"', () => {
    expect(toolToActiveLabel("map_pinpoint")).toBe("Pinpointing on map…");
  });

  it('maps weather_forecast to "Checking the weather…"', () => {
    expect(toolToActiveLabel("weather_forecast")).toBe("Checking the weather…");
  });

  it("falls back to humanized name + ellipsis for unknown tools", () => {
    expect(toolToActiveLabel("some_unknown_tool")).toBe("Some Unknown Tool…");
  });
});

describe("summarize", () => {
  it("returns 'Built itinerary · Xs' for all add_itinerary_item with n >= 3", () => {
    const timeline = [
      { kind: "tool", id: "1", name: "add_itinerary_item" },
      { kind: "tool", id: "2", name: "add_itinerary_item" },
      { kind: "tool", id: "3", name: "add_itinerary_item" },
    ];
    expect(summarize(timeline, 2300)).toBe("Built itinerary · 2.3s");
  });

  it("returns 'Added N items · Xs' for all add_itinerary_item with n < 3", () => {
    const timeline = [
      { kind: "tool", id: "1", name: "add_itinerary_item" },
      { kind: "tool", id: "2", name: "add_itinerary_item" },
    ];
    expect(summarize(timeline, 1100)).toBe("Added 2 items · 1.1s");
  });

  it("returns 'Researched N places · Xs' when any map_pinpoint is present", () => {
    const timeline = [
      { kind: "tool", id: "1", name: "plan_itinerary" },
      { kind: "tool", id: "2", name: "map_pinpoint" },
      { kind: "tool", id: "3", name: "add_itinerary_item" },
      { kind: "tool", id: "4", name: "add_itinerary_item" },
    ];
    expect(summarize(timeline, 2300)).toBe("Researched 4 places · 2.3s");
  });

  it("returns 'Thought for Xs' when timeline has only thought entries", () => {
    const timeline = [{ kind: "thought", id: "t1", text: "Considering route" }];
    expect(summarize(timeline, 1800)).toBe("Thought for 1.8s");
  });

  it("handles zero durationMs correctly", () => {
    const timeline = [{ kind: "tool", id: "1", name: "add_itinerary_item" }];
    const result = summarize(timeline, 0);
    expect(result).toContain("0.0s");
  });
});

describe("ask_user labels", () => {
  it('shows "Preparing a question…" while ask_user runs', () => {
    expect(toolToActiveLabel("ask_user")).toBe("Preparing a question…");
  });

  it("summarizes a run that asked as asking for input", () => {
    const timeline = [
      { id: "tool-1", kind: "tool", name: "add_itinerary_item" },
      { id: "tool-2", kind: "tool", name: "ask_user" },
    ];

    expect(summarize(timeline, 1400)).toBe("Asked for your input · 1.4s");
  });
});
