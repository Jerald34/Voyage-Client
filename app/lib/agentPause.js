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

/**
 * "until Oct 26, 3:40 PM (in 23 hours)" or "until an administrator lifts it". An end this device's
 * clock has already passed (the server still enforces it, so the clock is ahead) never reads as a future time.
 */
export function describeUntil(pause, now = Date.now()) {
  if (!pause?.until) return "until an administrator lifts it";
  const ms = Date.parse(pause.until) - now;
  return `until ${fmtWhen(pause.until)} (${ms <= 0 ? "any moment now" : relative(ms)})`;
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

/**
 * How long a pause the server has just enforced stays in force on screen even though this device's clock
 * says it already ended. The server answered AGENT_PAUSED, so it is the authority: the remaining wait is
 * at most the clock difference, which is small in practice. After the hold the user may try again, and the
 * server's next refusal brings the popup and the lock back.
 */
export const SERVER_PAUSE_HOLD_MS = 60 * 1000;

/** When (ms since epoch) a pause learned from an AGENT_PAUSED refusal at `learnedAt` stops showing; null = never. */
export function learnedPauseEnd(pause, learnedAt) {
  if (!pause?.until) return null;
  const until = Date.parse(pause.until);
  return until > learnedAt ? until : learnedAt + SERVER_PAUSE_HOLD_MS;
}

/** The pause learned from an AGENT_PAUSED refusal while it is still shown, else null. */
export function activeLearnedPause(pause, learnedAt, now = Date.now()) {
  if (!pause) return null;
  const end = learnedPauseEnd(pause, learnedAt);
  return end === null || end > now ? pause : null;
}

/** Identity of a pause, so the popup shows once per pause rather than once per render. */
export const pauseKey = (pause) => (pause ? `${pause.pausedAt}|${pause.until}` : "");
