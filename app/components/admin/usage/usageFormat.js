/** Shared number, date and label formatting for the admin Usage tab. */

export const fmtInt = (n) => Math.round(n ?? 0).toLocaleString("en-US");

/** Small costs keep enough digits to be told apart; whole dollars use cents. */
export function fmtUsd(n) {
  const v = n ?? 0;
  if (v === 0) return "$0.00";
  if (Math.abs(v) < 0.01) return `$${v.toFixed(4)}`;
  if (Math.abs(v) < 1) return `$${v.toFixed(3)}`;
  return `$${v.toFixed(2)}`;
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
