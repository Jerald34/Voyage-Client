/**
 * Shared date/time/status formatting helpers.
 * Extracted from ClientItineraryPage, HomePage, and other components.
 */

/**
 * Format a date as "Mon DD, YYYY" (e.g. "May 15, 2026").
 */
export function formatShortDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a date range as "May 15, 2026 - May 22, 2026".
 */
export function formatDateRange(startDate, endDate) {
  if (!startDate) return "";
  if (!endDate) return formatShortDate(startDate);
  return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
}

/**
 * Format trip dates with a fallback label.
 */
export function formatTripDates(startDate, endDate) {
  if (!startDate) return "Dates pending";
  return formatDateRange(startDate, endDate);
}

/**
 * Format a day header with weekday (e.g. "Tue, May 15").
 */
export function formatDayDate(day, tripStart) {
  if (day?.date) {
    const d = new Date(day.date);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  if (!tripStart || !day?.dayNumber) return "";
  const d = new Date(tripStart);
  d.setDate(d.getDate() + (day.dayNumber - 1));
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a day card date range (e.g. "May 15, 2026 - May 16, 2026").
 */
export function formatDayCardDate(day, tripStart) {
  let start;
  if (day?.date) {
    start = new Date(day.date);
  } else if (tripStart && day?.dayNumber) {
    start = new Date(tripStart);
    start.setDate(start.getDate() + (day.dayNumber - 1));
  } else {
    return "";
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

/**
 * Format a comment timestamp (e.g. "May 15, 2026 at 3:45 PM").
 */
export function formatCommentTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " at " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

/**
 * Get a time label from an itinerary item.
 */
export function getItemTimeLabel(item) {
  if (typeof item?.time === "string" && item.time.trim()) return item.time;
  if (item?.startTime && item?.endTime)
    return `${item.startTime} - ${item.endTime}`;
  if (item?.startTime) return item.startTime;
  if (item?.endTime) return `Ends ${item.endTime}`;
  return "";
}

/**
 * Map a DB trip status to a human-readable label.
 */
export function mapTripStatus(status) {
  const s = String(status ?? "").toUpperCase();
  if (s === "APPROVED_INTERNAL") return "Approved";
  if (s === "IN_REVIEW") return "In review";
  if (s === "ARCHIVED") return "Archived";
  return "Draft";
}

/**
 * Get display initials from a name string.
 */
export function getInitials(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts.length === 0
    ? "VP"
    : parts
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("");
}

/**
 * Get accommodation label from a day's items.
 */
export function getAccommodationLabel(day) {
  const items = Array.isArray(day?.items) ? day.items : [];
  const hotel = items.find(
    (i) =>
      i?.type === "accommodation" ||
      i?.type === "hotel" ||
      /hotel|resort|inn|lodge|airbnb/i.test(i?.title ?? ""),
  );
  return hotel?.title || hotel?.placeName || "";
}

/**
 * Get the run status display label.
 */
export function getRunStatusLabel(runStatus, streamError) {
  if (streamError) return "Needs attention";
  if (runStatus === "completed") return "Idle";
  if (runStatus === "in_progress" || runStatus === "running")
    return "Agent streaming";
  return "Ready";
}

/**
 * Map a saved-status label to a CSS class variant.
 */
export function getSavedStatusClass(statusLabel) {
  const normalized = String(statusLabel ?? "")
    .toLowerCase()
    .trim();
  if (normalized.includes("approved")) return "approved";
  if (normalized.includes("saved")) return "saved";
  if (
    normalized.includes("awaiting") ||
    normalized.includes("pending") ||
    normalized.includes("needs")
  )
    return "pending";
  return "default";
}
