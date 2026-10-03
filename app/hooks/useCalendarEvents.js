"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchApi } from "../lib/api/client";
import { gridRange, toDateKey } from "../lib/calendarDays";

const REFRESH_MS = 60_000;

/**
 * Loads the dashboard calendar for the six-week grid around `month`.
 * - Months already loaded this session show instantly while they refresh.
 * - The shown range refreshes every minute while the page is visible.
 * - A failed request keeps the last good data on screen and sets `error`.
 */
export function useCalendarEvents({ agencyId, month }) {
  const { start, end } = gridRange(month);
  const from = toDateKey(start);
  const to = toDateKey(end);
  const rangeKey = `${agencyId}:${from}:${to}`;

  const cacheRef = useRef(new Map());
  const requestIdRef = useRef(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!agencyId) return;
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      const result = await fetchApi(`/agencies/${agencyId}/dashboard/calendar?${params.toString()}`);
      if (requestId !== requestIdRef.current) return;
      cacheRef.current.set(rangeKey, result);
      setData(result);
      setError(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err);
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [agencyId, from, to, rangeKey]);

  useEffect(() => {
    setData(cacheRef.current.get(rangeKey) ?? null);
    setError(null);
    load();
  }, [rangeKey, load]);

  useEffect(() => {
    if (!agencyId) return undefined;
    const id = setInterval(() => {
      if (typeof document === "undefined" || !document.hidden) load();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [agencyId, load]);

  return { data, error, isLoading, refetch: load, from, to };
}

export default useCalendarEvents;
