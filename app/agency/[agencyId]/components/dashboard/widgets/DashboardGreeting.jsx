"use client";

/** "Good morning" 05–12, "Good afternoon" 12–17, "Good evening" otherwise. */
export function greetingFor(date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

/** The line under the greeting; null until the worklist has loaded. */
export function needsYouSummary(count) {
  if (count == null) return null;
  if (count === 0) return "Nothing needs you right now";
  return count === 1 ? "1 thing needs you today" : `${count} things need you today`;
}

/**
 * The Dashboard's header row (the app header is hidden on this tab): a
 * personal greeting as the page h1, how much needs attention, and the page's
 * one filled button, New trip.
 */
export default function DashboardGreeting({ name, count, onNewTrip, now }) {
  const firstName = String(name ?? "").trim().split(/\s+/)[0];
  const greeting = greetingFor(now ?? new Date());
  const summary = needsYouSummary(count);

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="max-w-none text-[28px] leading-tight min-[1280px]:text-[32px]">
          {firstName ? `${greeting}, ${firstName}` : greeting}
        </h1>
        {summary ? <p className="mt-1 text-sm text-text-muted">{summary}</p> : null}
      </div>
      <button
        type="button"
        onClick={onNewTrip}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-pill bg-secondary-strong px-5 text-sm font-semibold text-on-secondary-strong transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
      >
        <span aria-hidden="true" className="text-base leading-none">+</span>
        New trip
      </button>
    </div>
  );
}
