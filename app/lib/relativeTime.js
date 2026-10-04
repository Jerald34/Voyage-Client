/**
 * How long ago something happened, for dashboard rows. `now` is a timestamp in
 * ms and defaults to the current time. On a server-rendered page, pass the
 * browser's clock (useNowMinute) instead, so the server's HTML and the
 * browser's first render agree.
 */

const MINUTE = 60_000;

/** Whole minutes, hours and days since `isoString`; null when it can't be read. */
function elapsed(isoString, now) {
  const diff = now - new Date(isoString).getTime();
  if (Number.isNaN(diff)) return null;
  // A clock a little ahead of the server's makes the difference negative.
  const minutes = Math.max(0, Math.floor(diff / MINUTE));
  return { minutes, hours: Math.floor(minutes / 60), days: Math.floor(minutes / (60 * 24)) };
}

/** "Just now", "5m ago", "2h ago", "3d ago"; "" for no date, the raw string if it can't be read. */
export function timeAgo(isoString, now = Date.now()) {
  if (!isoString) return "";
  const span = elapsed(isoString, now);
  if (!span) return isoString;
  if (span.minutes < 1) return "Just now";
  if (span.minutes < 60) return `${span.minutes}m ago`;
  if (span.hours < 24) return `${span.hours}h ago`;
  return `${span.days}d ago`;
}

const unitsAgo = (count, unit) => `${count} ${unit}${count === 1 ? "" : "s"} ago`;

/** The same in words, for screen readers: "just now", "5 minutes ago", "1 hour ago", "3 days ago". */
export function timeAgoSpoken(isoString, now = Date.now()) {
  if (!isoString) return "";
  const span = elapsed(isoString, now);
  if (!span) return isoString;
  if (span.minutes < 1) return "just now";
  if (span.minutes < 60) return unitsAgo(span.minutes, "minute");
  if (span.hours < 24) return unitsAgo(span.hours, "hour");
  return unitsAgo(span.days, "day");
}
