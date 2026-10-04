import { describeWorklistItem } from "./worklistContext";

/**
 * Flattens a dashboard worklist into the "Needs you today" list, highest
 * priority first. Each row keeps its worklist key as `kind`, so the caller
 * decides what its action does (comments open the slide-over; the rest open
 * the trip). Labels match the old grouped worklist.
 */

const byTime = (field) => (a, b) => Date.parse(a[field]) - Date.parse(b[field]);

export const OWNER_NEEDS_YOU_ORDER = [
  { key: "lowRated", tone: "danger", actionLabel: "Open trip" },
  { key: "sharesExpiring", tone: "warning", actionLabel: "Extend", sort: byTime("expiresAt") },
  { key: "unreadComments", tone: "info", actionLabel: "Reply", sort: byTime("createdAt") },
  { key: "viewedNotReplied", tone: "info", actionLabel: "Open trip" },
  { key: "draftsStuck", tone: "warning", actionLabel: "Resume" },
];

export const STAFF_NEEDS_YOU_ORDER = [
  { key: "mySharesExpiring", tone: "warning", actionLabel: "Nudge", sort: byTime("expiresAt") },
  { key: "unreadComments", tone: "info", actionLabel: "Reply", sort: byTime("createdAt") },
  { key: "startingSoon", tone: "success", actionLabel: "Open trip", sort: (a, b) => a.daysToStart - b.daysToStart },
  { key: "myDraftsStuck", tone: "warning", actionLabel: "Resume" },
];

/**
 * @param {object|undefined} worklist  the payload's worklist
 * @param {Array} order                OWNER_NEEDS_YOU_ORDER or STAFF_NEEDS_YOU_ORDER
 * @param {number} [now]               epoch ms that relative times count from
 */
export function buildNeedsYouItems(worklist, order, now = Date.now()) {
  const items = [];
  for (const group of order) {
    const rows = [...(worklist?.[group.key] ?? [])];
    if (group.sort) rows.sort(group.sort);
    rows.forEach((row, index) => {
      const { subtitle, hint } = describeWorklistItem(group.key, row, now);
      items.push({
        key: `${group.key}:${row.id ?? row.shareId ?? row.tripId ?? index}`,
        kind: group.key,
        tone: group.tone,
        title: row.tripTitle ?? "Untitled trip",
        subtitle,
        hint,
        actionLabel: group.actionLabel,
        tripId: row.tripId,
        tripTitle: row.tripTitle ?? "Trip",
        clientName: row.clientName ?? null,
      });
    });
  }
  return items;
}
