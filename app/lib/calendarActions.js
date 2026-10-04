/**
 * Which calendar items need the agent, and how urgently. Day tiles draw these
 * as coloured icons and their labels name them; everything else on a day is
 * quiet activity, summed as "·N". Rules: Voyage-Server spec
 * docs/superpowers/specs/2026-10-04-calendar-action-icons-recently-viewed-design.md §3.
 */

/** Most urgent first: a tile with more kinds than it can show keeps the earlier ones. */
export const ACTION_ORDER = ["reply", "lowRating", "expiring", "departing"];

/** Ratings at or below this many stars are low (the "Needs you today" threshold). */
export const LOW_RATING_MAX = 3;

/** A trip departs soon when its first day is today or up to this many days out. */
export const DEPARTING_WINDOW_DAYS = 7;

/**
 * The action an event asks for on its day, or null when it is quiet activity.
 * @param {{ kind: string, detail?: object }} event
 * @param {{ isPast: boolean }} cell  the day the event falls on
 */
export function eventAction(event, cell) {
  switch (event.kind) {
    case "client_commented":
      // An older server doesn't send needsReply: treat it as answered, never a false alarm.
      return event.detail?.needsReply === true ? "reply" : null;
    case "proposal_rated":
    case "review_submitted":
      return Number.isFinite(event.detail?.rating) && event.detail.rating <= LOW_RATING_MAX ? "lowRating" : null;
    case "share_expires":
      return cell.isPast ? null : "expiring";
    default:
      return null;
  }
}

/**
 * "departing" on a trip's first day when that day is today or within the
 * next DEPARTING_WINDOW_DAYS days; null otherwise.
 * @param {{ isStart: boolean }} span
 * @param {{ daysFromToday: number }} cell
 */
export function spanAction(span, cell) {
  return span.isStart && cell.daysFromToday >= 0 && cell.daysFromToday <= DEPARTING_WINDOW_DAYS ? "departing" : null;
}

/**
 * What a day holds, for its tile and its label.
 * `actions` lists only the kinds present, in ACTION_ORDER.
 * @returns {{ actions: Array<{ kind: string, count: number }>, actionCount: number, otherTripCount: number, quietCount: number }}
 */
export function summarizeDay(cell) {
  const counts = Object.fromEntries(ACTION_ORDER.map((kind) => [kind, 0]));
  let otherTripCount = 0;
  let quietCount = 0;
  for (const span of cell.spans) {
    const action = spanAction(span, cell);
    if (action) counts[action] += 1;
    else otherTripCount += 1;
  }
  for (const event of cell.events) {
    const action = eventAction(event, cell);
    if (action) counts[action] += 1;
    else quietCount += 1;
  }
  const actions = ACTION_ORDER.filter((kind) => counts[kind] > 0).map((kind) => ({ kind, count: counts[kind] }));
  const actionCount = actions.reduce((sum, action) => sum + action.count, 0);
  return { actions, actionCount, otherTripCount, quietCount };
}

const plural = (count, one, many) => (count === 1 ? one : many.replace("{n}", String(count)));

const PHRASES = {
  reply: (n) => plural(n, "1 comment needs a reply", "{n} comments need a reply"),
  lowRating: (n) => plural(n, "1 low rating", "{n} low ratings"),
  expiring: (n) => plural(n, "1 link expiring", "{n} links expiring"),
  departing: (n) => plural(n, "1 trip departing soon", "{n} trips departing soon"),
};

/**
 * "1 comment needs a reply, 1 link expiring, 2 other updates": what is on a
 * day in priority order, then other trips, then quiet activity. Empty when
 * nothing is on the day.
 */
export function daySummaryText({ actions, otherTripCount, quietCount }) {
  const parts = actions.map(({ kind, count }) => PHRASES[kind](count));
  if (otherTripCount > 0) parts.push(plural(otherTripCount, "1 trip", "{n} trips"));
  if (quietCount > 0) parts.push(plural(quietCount, "1 other update", "{n} other updates"));
  return parts.join(", ");
}
