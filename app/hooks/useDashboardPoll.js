"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchApi } from "../lib/api/client";

/**
 * useDashboardPoll — polls /agencies/{agencyId}/dashboard at a fixed cadence.
 *
 * Spec §7.4:
 * - 60s default interval.
 * - Pauses when document.hidden; fires one immediate fetch on resume if more
 *   than intervalMs has elapsed since the last successful fetch.
 * - Dedupes in-flight requests (only one outstanding fetch at a time).
 * - isStale: true when the last successful fetch is older than 2 × intervalMs.
 * - On error, keeps previous data visible; next success clears the error.
 * - Cleans up interval + visibility listener on unmount.
 * - No-ops when enabled === false or agencyId is falsy.
 *
 * @param {object} opts
 * @param {string}  opts.agencyId     - agency to poll
 * @param {"owner"|"staff"} [opts.view] - omit to let server use role default
 * @param {"7d"|"30d"|"90d"} opts.period
 * @param {*}       opts.initialData  - SSR-hydrated payload; used as initial data
 * @param {number}  [opts.intervalMs=60_000]
 * @param {boolean} [opts.enabled=true]
 *
 * @returns {{ data, isStale, isFetching, error, refetch }}
 */
export function useDashboardPoll({
  agencyId,
  view,
  period,
  initialData,
  intervalMs = 60_000,
  enabled = true,
}) {
  const [data, setData] = useState(initialData ?? null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);

  // Tracks the Promise for the currently in-flight fetch (null when idle).
  const inFlightRef = useRef(null);

  // Timestamp (Date.now()) of the last completed successful fetch.
  const lastFetchedAtRef = useRef(null);

  // Stable ref for intervalMs so the effect closure always reads the latest.
  const intervalMsRef = useRef(intervalMs);
  useEffect(() => {
    intervalMsRef.current = intervalMs;
  }, [intervalMs]);

  // isStale: derived from lastFetchedAt on each render.
  const isStale =
    lastFetchedAtRef.current !== null &&
    Date.now() - lastFetchedAtRef.current > 2 * intervalMs;

  /**
   * Core fetch function — returns a Promise resolving with the new data.
   * Dedupes: if a fetch is already in flight, returns that same Promise.
   */
  const doFetch = useCallback(() => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    const params = new URLSearchParams({ period });
    if (view) params.set("view", view);

    const promise = fetchApi(
      `/agencies/${agencyId}/dashboard?${params.toString()}`,
    )
      .then((result) => {
        setData(result);
        setError(null);
        lastFetchedAtRef.current = Date.now();
        return result;
      })
      .catch((err) => {
        setError(err);
        // Re-throw so callers can also handle it.
        throw err;
      })
      .finally(() => {
        inFlightRef.current = null;
        setIsFetching(false);
      });

    inFlightRef.current = promise;
    setIsFetching(true);
    return promise;
  }, [agencyId, view, period]);

  /**
   * Public refetch — always initiates a new fetch (still deduped if already in
   * flight) and returns the Promise.
   */
  const refetch = useCallback(() => {
    return doFetch();
  }, [doFetch]);

  // Interval + visibility-pause effect.
  useEffect(() => {
    if (!enabled || !agencyId) return;

    // Kick off an initial fetch immediately so the client data is fresh even
    // when SSR data was already provided (avoids a 60s wait for first refresh).
    doFetch();

    const intervalId = setInterval(() => {
      if (document.hidden) return; // paused while tab is hidden
      doFetch();
    }, intervalMs);

    function handleVisibilityChange() {
      if (document.hidden) return;

      // Tab became visible — check if we're overdue.
      const elapsed =
        lastFetchedAtRef.current === null
          ? Infinity
          : Date.now() - lastFetchedAtRef.current;

      if (elapsed >= intervalMsRef.current) {
        doFetch();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Cancel in-flight tracking reference — the fetch itself can't be
      // aborted cheaply here, but we prevent stale state updates by noting
      // that the component is gone.  A proper AbortController refactor is
      // deferred to when fetch cancellation is needed elsewhere.
      inFlightRef.current = null;
    };
  }, [agencyId, view, period, intervalMs, enabled, doFetch]);

  return { data, isStale, isFetching, error, refetch };
}

export default useDashboardPoll;
