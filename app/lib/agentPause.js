/**
 * Client-side reading of `user.agentPause` and AGENT_PAUSED API errors:
 * { pausedAt, until (ISO, or null = until an admin lifts it), reason }.
 */

/** The pause if it is still in force, else null (a timed pause past its end is over). */
export function activePause(pause, now = Date.now()) {
  if (!pause) return null;
  if (pause.until && Date.parse(pause.until) <= now) return null;
  return pause;
}

// Local time, so a user in Manila reads their own clock rather than the server's.
const fmtWhen = (iso) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function relative(ms) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `in ${days} days`;
}

/** "until Oct 26, 3:40 PM (in 23 hours)" or "until an administrator lifts it". */
export function describeUntil(pause, now = Date.now()) {
  if (!pause?.until) return "until an administrator lifts it";
  return `until ${fmtWhen(pause.until)} (${relative(Date.parse(pause.until) - now)})`;
}

/** Short label for the composer strip and the Team badge. */
export function shortUntil(pause) {
  if (!pause?.until) return "Agent paused";
  return `Agent paused until ${fmtWhen(pause.until)}`;
}

/** The pause carried by an AGENT_PAUSED API error (`error.details` is the response's `error` object), else null. */
export function pauseFromError(error) {
  if (error?.code !== "AGENT_PAUSED") return null;
  const d = error.details || {};
  return { until: d.until ?? null, reason: d.reason ?? "", pausedAt: d.pausedAt ?? null };
}

/** Identity of a pause, so the popup shows once per pause rather than once per render. */
export const pauseKey = (pause) => (pause ? `${pause.pausedAt}|${pause.until}` : "");
