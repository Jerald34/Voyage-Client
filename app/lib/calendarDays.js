import { ACTION_ORDER, eventAction, spanAction } from "./calendarActions";

/**
 * Pure helpers for the dashboard month calendar. Trip dates are calendar
 * dates ("YYYY-MM-DD") and are compared as strings; event times are instants
 * that land on the viewer's local day.
 */

export const GRID_DAYS = 42;
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DAY_MS = 86_400_000;
const pad = (n) => String(n).padStart(2, "0");

/** Local calendar date of a Date, as YYYY-MM-DD. */
export function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local midnight of a YYYY-MM-DD key. */
export function fromDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** The first day of the month `months` away from `date`'s month. */
export function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/** The Sunday-first six-week grid that contains `month`. */
export function gridRange(month) {
  const first = startOfMonth(month);
  const start = addDays(first, -first.getDay());
  return { start, end: addDays(start, GRID_DAYS - 1) };
}

/** Whole days from `fromKey` to `toKey` (rounded, so DST shifts don't matter). */
export function daysBetweenKeys(fromKey, toKey) {
  return Math.round((fromDateKey(toKey) - fromDateKey(fromKey)) / DAY_MS);
}

/** "Thursday, October 8". */
export function fullDayLabel(date) {
  return `${WEEKDAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

/** "Today", "Tomorrow", "Yesterday", "In 5 days" or "3 days ago". */
export function relativeDayLabel(key, todayKey) {
  const diff = daysBetweenKeys(todayKey, key);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return diff > 1 ? `In ${diff} days` : `${-diff} days ago`;
}

/**
 * The 42 cells of the month grid, Sunday first. Each cell carries the trips
 * spanning that day (with where the day falls in the trip) and the events
 * that happened on it, in the server's time order.
 *
 * @param {object|null} payload  calendar payload, or null while loading
 * @param {Date} month           any day in the month to show
 * @param {Date} [today]
 */
export function buildCalendarDays(payload, month, today = new Date()) {
  const { start } = gridRange(month);
  const todayKey = toDateKey(today);
  const monthIndex = month.getMonth();

  const eventsByDay = new Map();
  for (const event of payload?.events ?? []) {
    const key = toDateKey(new Date(event.occurredAt));
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key).push(event);
  }

  const cells = [];
  for (let index = 0; index < GRID_DAYS; index += 1) {
    const date = addDays(start, index);
    const key = toDateKey(date);
    const spans = [];
    for (const trip of payload?.trips ?? []) {
      if (key < trip.startDate || key > trip.endDate) continue;
      const isStart = key === trip.startDate;
      spans.push({
        ...trip,
        isStart,
        isEnd: key === trip.endDate,
        showLabel: isStart || index % 7 === 0,
        isPast: trip.endDate < todayKey,
        dayNumber: daysBetweenKeys(trip.startDate, key) + 1,
        totalDays: daysBetweenKeys(trip.startDate, trip.endDate) + 1,
      });
    }
    cells.push({
      key,
      date,
      dayOfMonth: date.getDate(),
      inMonth: date.getMonth() === monthIndex,
      isToday: key === todayKey,
      isPast: key < todayKey,
      /** Whole days from today: 0 today, negative before. */
      daysFromToday: daysBetweenKeys(todayKey, key),
      spans,
      events: eventsByDay.get(key) ?? [],
    });
  }
  return cells;
}

const travelers = (count) => (count == null ? null : `${count} traveler${count === 1 ? "" : "s"}`);
const views = (count) => (count === 1 ? "Viewed once" : `${count ?? 0} views in total`);
const quote = (text) => (text ? `“${text}”` : null);

function spanCopy(span) {
  const who = span.clientName ? `${span.clientName} · ` : "";
  if (span.isStart) {
    const nights = span.totalDays - 1;
    const length = nights > 0 ? `${nights} night${nights === 1 ? "" : "s"}` : "Day trip";
    return {
      title: `${who}${span.placeLabel} departs`,
      detail: [length, travelers(span.travelerCount)].filter(Boolean).join(" · "),
    };
  }
  if (span.isEnd) {
    return { title: `${who}${span.placeLabel} returns`, detail: travelers(span.travelerCount) ?? span.tripTitle };
  }
  // Without a client the title is the trip name, which is often just the place.
  const subject = span.clientName ?? span.tripTitle;
  return {
    title: subject === span.placeLabel ? subject : `${subject} in ${span.placeLabel}`,
    detail: `Day ${span.dayNumber} of ${span.totalDays}`,
  };
}

const EVENT_COPY = {
  share_sent: (e) => ({
    title: `Sent ${e.tripTitle}${e.clientName ? ` to ${e.clientName}` : ""}`,
    detail: "Itinerary link shared",
  }),
  share_expires: (e, cell) => ({
    title: `${e.tripTitle} link ${cell.isPast ? "expired" : "expires"}`,
    detail: e.clientName ? `Shared with ${e.clientName}` : "Itinerary link",
  }),
  client_viewed: (e) => ({ title: `${e.clientName ?? "Client"} viewed ${e.tripTitle}`, detail: views(e.detail?.viewCount) }),
  client_commented: (e) => ({ title: `${e.clientName ?? "Client"} commented`, detail: quote(e.detail?.excerpt) ?? e.tripTitle }),
  proposal_rated: (e) => ({ title: `${e.clientName ?? "Client"} rated the proposal`, detail: `${e.detail?.rating} out of 5` }),
  review_submitted: (e) => ({
    title: `${e.clientName ?? "Client"} reviewed ${e.tripTitle}`,
    detail: [`${e.detail?.rating} out of 5`, quote(e.detail?.excerpt)].filter(Boolean).join(" · "),
  }),
};

/** Sort rank: items that need the agent by urgency, then trips, then quiet activity. */
function itemRank(item) {
  if (item.actionKind) return ACTION_ORDER.indexOf(item.actionKind);
  return item.kind === "trip" ? ACTION_ORDER.length : ACTION_ORDER.length + 1;
}

/**
 * What a day's details list: the items that need the agent first (most urgent
 * first), then its trips, then quiet activity in time order. `actionKind`
 * ("reply", "lowRating", "expiring", "departing" or null) matches the icon on
 * the day's tile. Every item opens its trip; comments say "Reply".
 */
export function describeDayItems(cell) {
  const items = cell.spans.map((span) => ({
    key: `trip:${span.tripId}`,
    kind: "trip",
    actionKind: spanAction(span, cell),
    tripId: span.tripId,
    tripTitle: span.tripTitle,
    clientName: span.clientName,
    actionLabel: "Open trip",
    ...spanCopy(span),
  }));
  for (const event of cell.events) {
    const copy = EVENT_COPY[event.kind];
    if (!copy) continue;
    items.push({
      key: event.id,
      kind: event.kind,
      actionKind: eventAction(event, cell),
      tripId: event.tripId,
      tripTitle: event.tripTitle,
      clientName: event.clientName,
      actionLabel: event.kind === "client_commented" ? "Reply" : "Open trip",
      ...copy(event, cell),
    });
  }
  // Array.prototype.sort is stable: equal ranks keep the server's time order.
  return items.sort((a, b) => itemRank(a) - itemRank(b));
}
