"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchApi } from "../lib/api/client";
import { gridRange, toDateKey } from "../lib/calendarDays";

const REFRESH_MS = 60_000;

/**
 * Every grid range loaded this session, by `${agencyId}:${from}:${to}`. It
 * lives outside the hook so leaving the Dashboard tab and coming back, or
 * returning to a month, shows the last result straight away.
 */
const rangeCache = new Map();

/** Clears the session cache so tests don't depend on each other's months. */
export function resetCalendarCacheForTests() {
  rangeCache.clear();
}

/**
 * Loads the dashboard calendar for the six-week grid around `month`.
 * - Ranges already loaded this session show instantly while they refresh.
 * - The shown range refreshes every minute while the page is visible, and
 *   again when the tab returns if that refresh is overdue.
 * - A request that is no longer wanted (range or agency changed, unmounted)
 *   is aborted and its result ignored.
 * - A failed request keeps the last good data on screen and sets `error`.
 */
export function useCalendarEvents({ agencyId, month }) {
  const { start, end } = gridRange(month);
  const from = toDateKey(start);
  const to = toDateKey(end);
  const rangeKey = `${agencyId}:${from}:${to}`;

  const requestIdRef = useRef(0);
  const controllerRef = useRef(null);
  const lastFetchedAtRef = useRef(null);
  const warnedRef = useRef(false);
  const [data, setData] = useState(() => rangeCache.get(rangeKey) ?? null);
  const [error, setError] = useState(null);
  // A fetch starts on mount, so the first render already counts as loading.
  const [isLoading, setIsLoading] = useState(Boolean(agencyId));

  const load = useCallback(async () => {
    // Whatever was in flight belongs to a range or agency nobody is looking at.
    controllerRef.current?.abort();
    controllerRef.current = null;
    const requestId = ++requestIdRef.current;
    if (!agencyId) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      const result = await fetchApi(`/agencies/${agencyId}/dashboard/calendar?${params.toString()}`, {
        signal: controller.signal,
      });
      if (requestId !== requestIdRef.current) return;
      rangeCache.set(rangeKey, result);
      lastFetchedAtRef.current = Date.now();
      setData(result);
      setError(null);
    } catch (err) {
      // fetchApi reports an abort as a network error, so check the signal.
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      if (err?.code === "CALENDAR_RANGE_INVALID" && !warnedRef.current) {
        warnedRef.current = true;
        console.warn(`Dashboard calendar asked for an invalid range (CALENDAR_RANGE_INVALID): ${from} to ${to}`);
      }
      setError(err);
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [agencyId, from, to, rangeKey]);

  useEffect(() => {
    setData(rangeCache.get(rangeKey) ?? null);
    setError(null);
    lastFetchedAtRef.current = null;
    load();
  }, [rangeKey, load]);

  // Nothing may land after unmount.
  useEffect(
    () => () => {
      requestIdRef.current += 1;
      controllerRef.current?.abort();
      controllerRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!agencyId) return undefined;
    const id = setInterval(() => {
      if (typeof document === "undefined" || !document.hidden) load();
    }, REFRESH_MS);

    function handleVisibilityChange() {
      if (document.hidden) return;
      const elapsed = lastFetchedAtRef.current === null ? Infinity : Date.now() - lastFetchedAtRef.current;
      if (elapsed >= REFRESH_MS) load();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [agencyId, load]);

  return { data, error, isLoading, refetch: load, from, to };
}

export default useCalendarEvents;
