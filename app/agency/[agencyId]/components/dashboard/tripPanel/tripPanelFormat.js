import { formatShortDate, formatTripDates } from "@/app/lib/formatters.js";
import { timeAgo } from "@/app/lib/relativeTime.js";

/**
 * Plain-language text for the dashboard trip panel. Pure: every time-based
 * helper takes `now` (epoch ms) so tests and renders agree.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
/** A link this close to expiring is flagged. */
export const EXPIRING_SOON_MS = 3 * DAY;

/** Compact span such as "45m", "20h" or "2d". */
function span(ms) {
  if (ms < HOUR) return `${Math.max(1, Math.floor(ms / MINUTE))}m`;
  if (ms < DAY) return `${Math.floor(ms / HOUR)}h`;
  return `${Math.floor(ms / DAY)}d`;
}

/** "Maria Santos · Nov 3, 2026 - Nov 8, 2026 · 4 travelers"; null when there is nothing to say. */
export function describeTripLine(trip, fallbackClientName = null) {
  if (!trip) return fallbackClientName;
  const travelers = trip.travelerCount
    ? `${trip.travelerCount} ${trip.travelerCount === 1 ? "traveler" : "travelers"}`
    : null;
  const parts = [
    trip.clientName ?? fallbackClientName,
    trip.startDate ? formatTripDates(trip.startDate, trip.endDate) : null,
    travelers,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** The link's state as a chip, and whether Extend applies. */
export function describeLinkState(share, now = Date.now()) {
  if (share.revokedAt) return { label: "Link turned off", tone: "danger", canExtend: false };
  if (!share.expiresAt) return { label: "Never expires", tone: "neutral", canExtend: false };
  const left = Date.parse(share.expiresAt) - now;
  if (!Number.isFinite(left)) return { label: "Expiry unknown", tone: "neutral", canExtend: true };
  if (left <= 0) return { label: "Link has expired", tone: "danger", canExtend: true };
  if (left <= EXPIRING_SOON_MS) return { label: `Expires in ${span(left)}`, tone: "warning", canExtend: true };
  return { label: `Expires ${formatShortDate(share.expiresAt)}`, tone: "neutral", canExtend: true };
}

/** "Viewed 4 times · last viewed 2h ago", or "Not opened yet". */
export function describeLinkViews(share, now = Date.now()) {
  if (!share.viewCount) return "Not opened yet";
  const times = share.viewCount === 1 ? "Viewed once" : `Viewed ${share.viewCount} times`;
  return share.lastViewedAt ? `${times} · last viewed ${timeAgo(share.lastViewedAt, now).toLowerCase()}` : times;
}

/** Where a comment points: "Day 1 · Ryokan check-in", "Day 2", "Day 3 · Removed stop" or "General". */
export function commentPlace(comment) {
  const day = comment.dayNumber != null ? `Day ${comment.dayNumber}` : null;
  const stop = comment.itemTitle ?? (comment.itemId ? "Removed stop" : null);
  return [day, stop].filter(Boolean).join(" · ") || "General";
}

/** True until the agency has replied. */
export const isWaiting = (comment) => !comment.agencyReply;

/** Unanswered comments first, oldest first; then answered ones, newest first. */
export function orderPanelComments(comments = []) {
  const byCreated = (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt);
  return {
    waiting: comments.filter(isWaiting).sort(byCreated),
    answered: comments.filter((comment) => !isWaiting(comment)).sort((a, b) => byCreated(b, a)),
  };
}
