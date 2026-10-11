// Label helpers for ProcessBubble component.
// See: docs/superpowers/specs/2026-05-23-agent-process-bubble-design.md §3
// Wording (capstone panel item 24, 2026-10-11): always say what the agent is doing.
// The server mirrors summarize() in Voyage-Server/src/modules/agent/agentService.ts.

// [label while it runs, past-tense row in the step list]
const TOOL_LABELS = {
  plan_itinerary: ["Planning the days…", "Planned the days"],
  create_itinerary: ["Creating the itinerary…", "Created the itinerary"],
  update_itinerary: ["Updating the itinerary…", "Updated the itinerary"],
  delete_itinerary: ["Deleting the itinerary…", "Deleted the itinerary"],
  add_itinerary_day: ["Adding a day…", "Added a day"],
  update_itinerary_day: ["Updating a day…", "Updated a day"],
  remove_itinerary_day: ["Removing a day…", "Removed a day"],
  add_itinerary_item: ["Adding a stop…", "Added a stop"],
  update_itinerary_item: ["Updating a stop…", "Updated a stop"],
  remove_itinerary_item: ["Removing a stop…", "Removed a stop"],
  move_itinerary_item: ["Moving a stop…", "Moved a stop"],
  search_google_places: ["Searching for places…", "Searched for places"],
  search_nearby_google_places: ["Finding places nearby…", "Found places nearby"],
  get_google_place_details: ["Looking up place details…", "Looked up place details"],
  get_google_place_photos: ["Getting photos…", "Got photos"],
  place_insights: ["Reading up on a place…", "Read up on a place"],
  map_pinpoint: ["Pinning it on the map…", "Pinned it on the map"],
  estimate_route: ["Checking travel time…", "Checked travel time"],
  route_logistics: ["Working out the route…", "Worked out the route"],
  weather_forecast: ["Checking the weather…", "Checked the weather"],
  web_search: ["Searching the web…", "Searched the web"],
  ask_user: ["Preparing a question…", "Asked a question"],
};

const UNKNOWN_TOOL_LABELS = ["Working on it…", "Finished a step"];

// The agent's bookkeeping tools. The task rows already show their effect, so they
// never name the live label, never get a row and never count in a summary.
const TRACKING_TOOL_NAMES = new Set(["add_agent_task", "update_agent_task", "list_agent_tasks", "record_agent_task"]);

const READING_LABEL = "Reading your request…";
const CHOOSING_LABEL = "Choosing the next step…";
const WRITING_LABEL = "Writing the reply…";

export function isTrackingTool(name) {
  return TRACKING_TOOL_NAMES.has(name);
}

/** The label shown while a tool runs. Unknown tools never show their raw name. */
export function toolToActiveLabel(name) {
  return (TOOL_LABELS[name] ?? UNKNOWN_TOOL_LABELS)[0];
}

/** The past-tense row for a tool in the step list. */
export function toolToDoneLabel(name) {
  return (TOOL_LABELS[name] ?? UNKNOWN_TOOL_LABELS)[1];
}

function countStops(count) {
  return `${count} ${count === 1 ? "stop" : "stops"}`;
}

/**
 * Returns the done-state summary string for the process bubble header.
 *
 * Scenarios (in priority order), progress-tracking tools not counted:
 *  1. No tools → "Replied in Xs"
 *  2. Any ask_user → "Asked for your input · Xs"
 *  3. Any map_pinpoint → "Researched N places · Xs"
 *  4. All add_itinerary_item, n >= 3 → "Built itinerary · Xs"
 *  5. All add_itinerary_item, n < 3 → "Added N stop(s) · Xs"
 *  6. Anything else → "Finished in Xs"
 */
export function summarize(timeline, durationMs) {
  const durationStr = (Number(durationMs ?? 0) / 1000).toFixed(1) + "s";

  const toolEntries = Array.isArray(timeline)
    ? timeline.filter((entry) => entry.kind === "tool" && !isTrackingTool(entry.name))
    : [];

  if (toolEntries.length === 0) {
    return `Replied in ${durationStr}`;
  }

  // Matches the server's summary for a run that ended by asking the user.
  if (toolEntries.some((entry) => entry.name === "ask_user")) {
    return `Asked for your input · ${durationStr}`;
  }

  if (toolEntries.some((entry) => entry.name === "map_pinpoint")) {
    return `Researched ${toolEntries.length} places · ${durationStr}`;
  }

  if (toolEntries.every((entry) => entry.name === "add_itinerary_item")) {
    if (toolEntries.length >= 3) {
      return `Built itinerary · ${durationStr}`;
    }
    return `Added ${countStops(toolEntries.length)} · ${durationStr}`;
  }

  return `Finished in ${durationStr}`;
}

/**
 * Returns the active header label during a live streaming run.
 *
 * Priority:
 *  1. Last RUNNING task label (task phases name the run)
 *  2. "Writing the reply…" while reply text streams (writingReply)
 *  3. The latest entry: a tool names itself, a thought means "Choosing the next step…"
 *  4. "Reading your request…" before anything has happened
 */
export function activeLabelFor(timeline, { writingReply = false } = {}) {
  const entries = Array.isArray(timeline) ? timeline : [];

  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.kind === "task" && entry.status === "RUNNING") {
      return entry.label;
    }
  }

  if (writingReply) return WRITING_LABEL;

  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.kind === "thought") return CHOOSING_LABEL;
    if (entry.kind === "tool" && !isTrackingTool(entry.name)) return toolToActiveLabel(entry.name);
  }

  return READING_LABEL;
}

/** Saved runs from before 2026-10-11 carry the old summaries; show them in the new wording. */
export function modernizeSummaryLabel(label) {
  if (typeof label !== "string") return label;
  return label
    .replace(/^Thought for /, "Replied in ")
    .replace(/^Worked for /, "Finished in ")
    .replace(/^Added (\d+) items? · /, (_match, count) => `Added ${countStops(Number(count))} · `);
}
