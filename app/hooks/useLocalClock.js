"use client";

import { useSyncExternalStore } from "react";
import { toDateKey } from "../lib/calendarDays";

/**
 * The viewer's local date and hour, safe to render on a server-rendered page.
 *
 * The server has its own clock and timezone, so reading "now" while rendering
 * would paint something the browser then disagrees with (a hydration
 * mismatch, or a flash of the wrong day). These hooks return `null` for the
 * server render and the hydration pass, then the browser's value straight
 * after. A page rendered only in the browser gets the real value at once.
 * Callers show something neutral for `null`.
 */

const SLACK_MS = 50;

/**
 * A `subscribe` for useSyncExternalStore that notifies when `msUntilNext(now)`
 * runs out (re-armed each time) and when the tab becomes visible again, since
 * timers stall while a laptop sleeps.
 */
function subscribeEvery(msUntilNext) {
  return (onChange) => {
    let timer;
    function arm() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        onChange();
        arm();
      }, msUntilNext(new Date()));
    }
    function handleVisibility() {
      if (document.hidden) return;
      onChange();
      arm();
    }
    arm();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  };
}

const untilMidnight = (now) =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now + SLACK_MS;
const untilNextHour = (now) =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1) - now + SLACK_MS;

// Module-level so React sees the same functions every render and doesn't resubscribe.
const subscribeToDay = subscribeEvery(untilMidnight);
const subscribeToHour = subscribeEvery(untilNextHour);
const getDateKey = () => toDateKey(new Date());
const getHour = () => new Date().getHours();
const getNothing = () => null;

/** Today's local date as "YYYY-MM-DD", rolling over at midnight; null until the browser has it. */
export function useLocalDateKey() {
  return useSyncExternalStore(subscribeToDay, getDateKey, getNothing);
}

/** The local hour, 0-23, rolling over on the hour; null until the browser has it. */
export function useLocalHour() {
  return useSyncExternalStore(subscribeToHour, getHour, getNothing);
}
