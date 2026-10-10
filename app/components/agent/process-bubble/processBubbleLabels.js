// Label helpers for ProcessBubble component.
// See: docs/superpowers/specs/2026-05-23-agent-process-bubble-design.md §3

function humanizeToolName(name) {
  return String(name ?? "")
    .replace(/[_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const TOOL_ACTIVE_LABEL_MAP = {
  plan_itinerary: "Planning itinerary…",
  add_itinerary_item: "Adding itinerary item…",
  update_itinerary_item: "Updating itinerary item…",
  map_pinpoint: "Pinpointing on map…",
  weather_forecast: "Checking the weather…",
  ask_user: "Preparing a question…",
};

/**
 * Returns the active-verb label for a tool name during streaming.
 * Known tools get a dedicated verb form; unknowns get a humanized fallback.
 */
export function toolToActiveLabel(name) {
  const known = TOOL_ACTIVE_LABEL_MAP[name];
  if (known) return known;
  const humanized = humanizeToolName(name);
  return humanized ? humanized + "…" : "Working…";
}

/**
 * Returns the done-state summary string for the process bubble header.
 *
 * Scenarios (in priority order):
 *  1. Any map_pinpoint → "Researched N places · Xs"
 *  2. All add_itinerary_item, n >= 3 → "Built itinerary · Xs"
 *  3. All add_itinerary_item, n < 3 → "Added N items · Xs"
 *  4. Thoughts only (no tool entries) → "Thought for Xs"
 */
export function summarize(timeline, durationMs) {
  const durationStr = (Number(durationMs ?? 0) / 1000).toFixed(1) + "s";

  const toolEntries = Array.isArray(timeline)
    ? timeline.filter((entry) => entry.kind === "tool")
    : [];

  if (toolEntries.length === 0) {
    return `Thought for ${durationStr}`;
  }

  // Matches the server's summary for a run that ended by asking the user.
  if (toolEntries.some((entry) => entry.name === "ask_user")) {
    return `Asked for your input · ${durationStr}`;
  }

  const hasMapPinpoint = toolEntries.some((entry) => entry.name === "map_pinpoint");
  if (hasMapPinpoint) {
    return `Researched ${toolEntries.length} places · ${durationStr}`;
  }

  const allAddItem = toolEntries.every((entry) => entry.name === "add_itinerary_item");
  if (allAddItem) {
    if (toolEntries.length >= 3) {
      return `Built itinerary · ${durationStr}`;
    }
    return `Added ${toolEntries.length} items · ${durationStr}`;
  }

  // Generic fallback for mixed or unknown tools
  return `Worked for ${durationStr}`;
}

/**
 * Returns the active header label during a live streaming run.
 *
 * Priority:
 *  1. Last RUNNING task label (task phases name the run)
 *  2. Last tool label via toolToActiveLabel
 *  3. "Thinking…" fallback
 */
export function activeLabelFor(timeline) {
  const entries = Array.isArray(timeline) ? timeline : [];

  // Last RUNNING task wins.
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.kind === "task" && entry.status === "RUNNING") {
      return entry.label;
    }
  }

  // Fall back to last tool.
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.kind === "tool") {
      return toolToActiveLabel(entry.name);
    }
  }

  return "Thinking…";
}
