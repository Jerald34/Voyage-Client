"use client";

import { useLocalHour } from "@/app/hooks/useLocalClock";

/** "Good morning" 05–12, "Good afternoon" 12–17, "Good evening" otherwise. */
function greetingForHour(hour) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

export function greetingFor(date) {
  return greetingForHour(date.getHours());
}

/** What the server render says: the server's clock is not the viewer's. */
const NEUTRAL_GREETING = "Welcome back";

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
  const hour = useLocalHour();
  const firstName = String(name ?? "").trim().split(/\s+/)[0];
  // `now` pins the time (tests, previews). Otherwise the browser's hour, which
  // is unknown on the server and while hydrating, so say something neutral then.
  const greeting = now ? greetingFor(now) : hour === null ? NEUTRAL_GREETING : greetingForHour(hour);
  const summary = needsYouSummary(count);

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="max-w-none text-[28px] leading-tight min-[1280px]:text-[32px]">
          {firstName ? `${greeting}, ${firstName}` : greeting}
        </h1>
        {/* Always rendered, one line tall, so the page doesn't shift when the count arrives. */}
        <p className="mt-1 min-h-5 text-sm text-text-muted">{summary}</p>
      </div>
      <button
        type="button"
        onClick={onNewTrip}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-pill bg-secondary-strong px-5 text-sm font-semibold text-on-secondary-strong transition-[opacity,scale] duration-150 ease-out hover:opacity-90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
      >
        <span aria-hidden="true" className="text-base leading-none">+</span>
        New trip
      </button>
    </div>
  );
}
