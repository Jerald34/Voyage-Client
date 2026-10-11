import { describe, expect, it } from "vitest";
import {
  activeLabelFor,
  isTrackingTool,
  modernizeSummaryLabel,
  summarize,
  toolToActiveLabel,
  toolToDoneLabel,
} from "../app/components/agent/process-bubble/processBubbleLabels.js";

const AGENT_TOOLS = [
  "plan_itinerary", "create_itinerary", "update_itinerary", "delete_itinerary",
  "add_itinerary_day", "update_itinerary_day", "remove_itinerary_day",
  "add_itinerary_item", "update_itinerary_item", "remove_itinerary_item", "move_itinerary_item",
  "search_google_places", "search_nearby_google_places", "get_google_place_details", "get_google_place_photos",
  "place_insights", "map_pinpoint", "estimate_route", "route_logistics", "weather_forecast", "web_search", "ask_user",
];

describe("toolToActiveLabel", () => {
  it.each([
    ["plan_itinerary", "Planning the days…"],
    ["add_itinerary_item", "Adding a stop…"],
    ["update_itinerary_item", "Updating a stop…"],
    ["move_itinerary_item", "Moving a stop…"],
    ["remove_itinerary_day", "Removing a day…"],
    ["search_google_places", "Searching for places…"],
    ["search_nearby_google_places", "Finding places nearby…"],
    ["get_google_place_details", "Looking up place details…"],
    ["get_google_place_photos", "Getting photos…"],
    ["estimate_route", "Checking travel time…"],
    ["map_pinpoint", "Pinning it on the map…"],
    ["weather_forecast", "Checking the weather…"],
    ["web_search", "Searching the web…"],
    ["ask_user", "Preparing a question…"],
  ])("labels %s as %s", (name, label) => {
    expect(toolToActiveLabel(name)).toBe(label);
  });

  it("gives every agent tool a written label, never its raw name", () => {
    for (const name of AGENT_TOOLS) {
      expect(toolToActiveLabel(name)).not.toBe("Working on it…");
      expect(toolToActiveLabel(name)).not.toMatch(/_/);
    }
  });

  it('says "Working on it…" for a tool it does not know', () => {
    expect(toolToActiveLabel("some_unknown_tool")).toBe("Working on it…");
  });
});

describe("toolToDoneLabel", () => {
  it("uses the past tense for the step list", () => {
    expect(toolToDoneLabel("add_itinerary_item")).toBe("Added a stop");
    expect(toolToDoneLabel("search_google_places")).toBe("Searched for places");
    expect(toolToDoneLabel("ask_user")).toBe("Asked a question");
    expect(toolToDoneLabel("some_unknown_tool")).toBe("Finished a step");
  });
});

describe("isTrackingTool", () => {
  it("knows the agent's progress-tracking tools", () => {
    for (const name of ["add_agent_task", "update_agent_task", "list_agent_tasks", "record_agent_task"]) {
      expect(isTrackingTool(name)).toBe(true);
    }
    expect(isTrackingTool("add_itinerary_item")).toBe(false);
  });
});

describe("activeLabelFor", () => {
  it("says it is reading the request before anything has happened", () => {
    expect(activeLabelFor([])).toBe("Reading your request…");
  });

  it("names the latest tool", () => {
    const timeline = [
      { id: "1", kind: "tool", name: "search_google_places" },
      { id: "2", kind: "tool", name: "add_itinerary_item" },
    ];
    expect(activeLabelFor(timeline)).toBe("Adding a stop…");
  });

  it("says it is choosing the next step when the latest entry is a thought", () => {
    const timeline = [
      { id: "1", kind: "tool", name: "search_google_places" },
      { id: "t1", kind: "thought", text: "Burnham Park first" },
    ];
    expect(activeLabelFor(timeline)).toBe("Choosing the next step…");
  });

  it("says it is writing once reply text streams in", () => {
    const timeline = [{ id: "1", kind: "tool", name: "add_itinerary_item" }];
    expect(activeLabelFor(timeline, { writingReply: true })).toBe("Writing the reply…");
  });

  it("lets a running task's own label win over everything", () => {
    const timeline = [
      { id: "1", kind: "tool", name: "add_itinerary_item" },
      { id: "k1", kind: "task", status: "RUNNING", label: "Researching cafés" },
    ];
    expect(activeLabelFor(timeline, { writingReply: true })).toBe("Researching cafés");
  });

  it("ignores a running task with no label and falls through to the next rule", () => {
    const timeline = [
      { id: "1", kind: "tool", name: "search_google_places" },
      { id: "k1", kind: "task", status: "RUNNING", label: "" },
      { id: "k2", kind: "task", status: "RUNNING" },
      { id: "k3", kind: "task", status: "RUNNING", label: "   " },
    ];
    expect(activeLabelFor(timeline)).toBe("Searching for places…");
    expect(activeLabelFor(timeline, { writingReply: true })).toBe("Writing the reply…");
  });

  it("skips progress-tracking tools", () => {
    const timeline = [
      { id: "1", kind: "tool", name: "search_google_places" },
      { id: "2", kind: "tool", name: "record_agent_task" },
    ];
    expect(activeLabelFor(timeline)).toBe("Searching for places…");
    expect(activeLabelFor([{ id: "1", kind: "tool", name: "add_agent_task" }])).toBe("Reading your request…");
  });
});

describe("summarize", () => {
  const tools = (...names) => names.map((name, index) => ({ kind: "tool", id: String(index), name }));

  it("returns 'Built itinerary · Xs' for three or more stops added", () => {
    expect(summarize(tools("add_itinerary_item", "add_itinerary_item", "add_itinerary_item"), 2300)).toBe("Built itinerary · 2.3s");
  });

  it("counts stops, singular and plural", () => {
    expect(summarize(tools("add_itinerary_item", "add_itinerary_item"), 1100)).toBe("Added 2 stops · 1.1s");
    expect(summarize(tools("add_itinerary_item"), 900)).toBe("Added 1 stop · 0.9s");
  });

  it("returns 'Researched N places · Xs' when any map_pinpoint is present", () => {
    expect(summarize(tools("plan_itinerary", "map_pinpoint", "add_itinerary_item", "add_itinerary_item"), 2300)).toBe("Researched 4 places · 2.3s");
  });

  it("returns 'Replied in Xs' when the run only reasoned", () => {
    expect(summarize([{ kind: "thought", id: "t1", text: "Considering route" }], 1800)).toBe("Replied in 1.8s");
  });

  it("returns 'Finished in Xs' for a mix of other tools", () => {
    expect(summarize(tools("web_search", "estimate_route"), 3000)).toBe("Finished in 3.0s");
  });

  it("does not count progress-tracking tools", () => {
    expect(summarize(tools("record_agent_task"), 1200)).toBe("Replied in 1.2s");
    expect(summarize(tools("record_agent_task", "add_itinerary_item"), 1200)).toBe("Added 1 stop · 1.2s");
  });

  it("summarizes a run that asked as asking for input", () => {
    expect(summarize(tools("add_itinerary_item", "ask_user"), 1400)).toBe("Asked for your input · 1.4s");
  });

  it("handles zero durationMs", () => {
    expect(summarize(tools("add_itinerary_item"), 0)).toContain("0.0s");
  });
});

describe("modernizeSummaryLabel", () => {
  it("rewrites summaries saved before the new wording", () => {
    expect(modernizeSummaryLabel("Thought for 1.2s")).toBe("Replied in 1.2s");
    expect(modernizeSummaryLabel("Worked for 4.0s")).toBe("Finished in 4.0s");
    expect(modernizeSummaryLabel("Added 2 items · 1.1s")).toBe("Added 2 stops · 1.1s");
    expect(modernizeSummaryLabel("Added 1 items · 1.1s")).toBe("Added 1 stop · 1.1s");
  });

  it("leaves current wording and non-strings alone", () => {
    expect(modernizeSummaryLabel("Built itinerary · 2.3s")).toBe("Built itinerary · 2.3s");
    expect(modernizeSummaryLabel(undefined)).toBeUndefined();
  });
});
