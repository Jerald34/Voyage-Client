/** Shared number, date and label formatting for the admin Usage tab. */

export const fmtInt = (n) => Math.round(n ?? 0).toLocaleString("en-US");

const usdText = (v, dp) => v.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });

/**
 * Money, with enough digits that a small cost never looks like nothing: $1 and up show cents,
 * $0.01-$1 show three decimals, under a cent shows four, and anything smaller (but not zero) reads "<$0.0001".
 * Exactly zero is "$0.00". A value that rounds up across a boundary uses the next size's precision.
 */
export function fmtUsd(n) {
  const v = n ?? 0;
  if (v === 0) return "$0.00";
  if (v < 0) return `-${fmtUsd(-v)}`;
  if (v < 0.0001) return "<$0.0001";
  let dp = v >= 1 ? 2 : v >= 0.01 ? 3 : 4;
  if (dp === 3 && Number(v.toFixed(3)) >= 1) dp = 2;
  if (dp === 4 && Number(v.toFixed(4)) >= 0.01) dp = 3;
  return `$${usdText(v, dp)}`;
}

export const fmtPct = (ratio) => `${Math.round((ratio ?? 0) * 100)}%`;

/** Change vs the previous period as a ratio (0.38 = +38%), or null if there was no previous spend. */
export function deltaPct(current, previous) {
  if (!previous) return null;
  return (current - previous) / previous;
}

/** "2026-10-03" -> "Oct 3" (buckets are UTC days). */
export function fmtShortDate(isoDay) {
  return new Date(`${isoDay}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export const ROLE_TAG_LABELS = { OWNER: "Owner", ADMIN: "Admin", STAFF: "Staff", PERSONAL: "Personal" };

/** "Owner · Hops Travel", "Personal", or just the agency when the role is unknown. */
export function roleTagLine({ roleTag, agencyName }) {
  const role = roleTag ? ROLE_TAG_LABELS[roleTag] || roleTag : null;
  if (roleTag === "PERSONAL") return role;
  return [role, agencyName].filter(Boolean).join(" · ");
}

export const RANGE_OPTIONS = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

export const GROUP_OPTIONS = [
  { value: "user", label: "Users" },
  { value: "agency", label: "Agencies" },
  { value: "chat", label: "Chats" },
];

/** Which drill-in query parameter each table grouping uses. */
export const GROUP_FILTER_KEY = { user: "userId", agency: "agencyId", chat: "threadId" };
