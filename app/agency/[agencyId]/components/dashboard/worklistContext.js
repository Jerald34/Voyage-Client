/**
 * Plain-language context for dashboard to-do rows: why a trip is listed
 * (subtitle) and how urgent it is (hint), built from the fields the dashboard
 * endpoint sends for each kind of row.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Compact span such as "45m", "6h" or "9d"; null when the time can't be read. */
function span(ms) {
  if (!Number.isFinite(ms)) return null;
  if (ms < HOUR) return `${Math.max(1, Math.floor(ms / MINUTE))}m`;
  if (ms < DAY) return `${Math.floor(ms / HOUR)}h`;
  return `${Math.floor(ms / DAY)}d`;
}

const since = (isoString, now) => span(now - Date.parse(isoString));

function expiryHint(expiresAt, now) {
  const left = Date.parse(expiresAt) - now;
  if (!Number.isFinite(left)) return null;
  return left > 0 ? `Link expires in ${span(left)}` : "Link has expired";
}

function startHint(daysToStart) {
  if (daysToStart === 0) return "Starts today";
  if (daysToStart === 1) return "Starts tomorrow";
  return Number.isFinite(daysToStart) ? `Starts in ${daysToStart} days` : null;
}

function viewsLabel(viewCount) {
  if (viewCount === 1) return "Viewed once";
  return viewCount > 1 ? `Viewed ${viewCount} times` : null;
}

/**
 * @param {string} kind  worklist key from the payload, e.g. "unreadComments" or "myDraftsStuck"
 * @param {object} item  one row of that worklist
 * @param {number} [now] epoch ms that relative times count from
 * @returns {{ subtitle: string | null, hint: string | null }}
 */
export function describeWorklistItem(kind, item, now = Date.now()) {
  switch (kind) {
    case "unreadComments": {
      const waited = since(item.createdAt, now);
      return {
        subtitle: item.commentExcerpt ? `“${item.commentExcerpt}”` : null,
        hint: waited && `Waiting ${waited}`,
      };
    }
    case "viewedNotReplied": {
      const lastViewed = since(item.lastViewedAt, now);
      return { subtitle: viewsLabel(item.viewCount), hint: lastViewed && `Last viewed ${lastViewed} ago` };
    }
    case "draftsStuck":
    case "myDraftsStuck": {
      const edited = since(item.updatedAt, now);
      return { subtitle: null, hint: edited && `Last edited ${edited} ago` };
    }
    case "sharesExpiring":
    case "mySharesExpiring":
      return { subtitle: null, hint: expiryHint(item.expiresAt, now) };
    case "lowRated": {
      const rated = since(item.ratedAt, now);
      return {
        subtitle: item.rating != null ? `Rated ${item.rating} out of 5` : null,
        hint: rated && `${rated} ago`,
      };
    }
    case "startingSoon":
      return { subtitle: null, hint: startHint(item.daysToStart) };
    default:
      return { subtitle: null, hint: null };
  }
}
