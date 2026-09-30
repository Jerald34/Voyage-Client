"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchApi } from "../../../lib/api/client";

/**
 * useRatedHistory — fetches paginated rated trip summaries with detail caching.
 *
 * Filters (destination, durationDays, season) cause a list-cache clear and reset
 * to page 1. Detail cache persists across filter changes.
 *
 * agencyId changes clear both caches and reset state.
 *
 * @param {object} opts
 * @param {string} opts.agencyId - required; when changed, clears all caches
 * @param {object} [opts.filters={}] - { destination?: string, durationDays?: number, season?: 'spring'|'summer'|'fall'|'winter' }
 *
 * @returns {{
 *   trips: Array<{id, destination, duration, rating, ...}>,
 *   isLoading: boolean,
 *   hasMore: boolean,
 *   loadMore: () => void,
 *   getDetail: (tripId: string) => Promise<RatedItinerary>,
 *   error: Error | null,
 *   refetch: () => void
 * }}
 */
export function useRatedHistory({ agencyId, filters = {} }) {
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // Track current page (1-indexed) for pagination.
  const currentPageRef = useRef(1);

  // Map<tripId, Promise<RatedItinerary>> for detail caching.
  const detailCacheRef = useRef(new Map());

  // AbortController for cancelling in-flight IMPERATIVE list requests
  // (loadMore / refetch only). The automatic list effect owns its own
  // per-run controller so StrictMode's setup -> cleanup -> setup cycle can
  // never orphan it. No unmount effect touches this ref.
  const abortControllerRef = useRef(null);

  // Track previous agencyId to decide whether an agencyId change should also
  // clear the detail cache (filters changes must NOT clear it).
  const prevAgencyIdRef = useRef(null);

  // Stable serialization of filters. Callers pass `filters: {}` inline (a new
  // object every render), so the automatic effect must depend on this string
  // — not the raw object — to avoid churn / infinite re-fetch loops.
  const filtersKey = JSON.stringify(filters);

  // State refs to access latest values in async context without re-creating callbacks.
  const agencyIdRef = useRef(agencyId);
  const filtersRef = useRef(filters);

  // Keep refs in sync with current props.
  useEffect(() => {
    agencyIdRef.current = agencyId;
    filtersRef.current = filters;
  }, [agencyId, filters]);

  /**
   * Internal fetch for list — called by the automatic effect and by the
   * imperative public methods (loadMore / refetch).
   *
   * Each caller passes the AbortSignal that owns this request so the result is
   * only applied while that specific request is still live. This keeps every
   * invocation self-contained and StrictMode-safe.
   *
   * @param {number} page
   * @param {boolean} append
   * @param {AbortSignal} signal - signal owning this request
   */
  const doFetchList = useCallback(
    async (page, append, signal) => {
      const currentAgencyId = agencyIdRef.current;
      const currentFilters = filtersRef.current;

      if (!currentAgencyId) return;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: "20",
        });
        if (currentFilters.destination)
          params.set("destination", currentFilters.destination);
        if (currentFilters.durationDays !== undefined)
          params.set(
            "durationDays",
            currentFilters.durationDays.toString()
          );
        if (currentFilters.season) params.set("season", currentFilters.season);

        const result = await fetchApi(
          `/agencies/${currentAgencyId}/rated-history?${params.toString()}`,
          { signal }
        );

        // This request was superseded/cancelled — drop its result.
        if (signal?.aborted) return;

        const newTrips = result.trips || [];
        setTrips((prev) => (append ? [...prev, ...newTrips] : newTrips));
        setHasMore(result.hasMore ?? false);
        currentPageRef.current = page;
      } catch (err) {
        if (err.name !== "AbortError" && !signal?.aborted) {
          setError(err);
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  /**
   * getDetail — cached detail fetch.
   */
  const getDetail = useCallback(
    (tripId) => {
      const currentAgencyId = agencyIdRef.current;
      if (!currentAgencyId || !tripId) {
        return Promise.reject(new Error("agencyId and tripId required"));
      }

      const cached = detailCacheRef.current.get(tripId);
      if (cached) {
        return cached;
      }

      const promise = fetchApi(
        `/agencies/${currentAgencyId}/rated-history/${tripId}`
      )
        .then((result) => {
          return result.itinerary;
        })
        .catch((err) => {
          detailCacheRef.current.delete(tripId);
          throw err;
        });

      detailCacheRef.current.set(tripId, promise);
      return promise;
    },
    []
  );

  /**
   * Start a new imperative list request, cancelling any prior imperative one.
   * Returns the owning signal.
   */
  const startImperativeFetch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current.signal;
  }, []);

  /**
   * loadMore — append next page if hasMore and not already loading.
   */
  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    doFetchList(currentPageRef.current + 1, true, startImperativeFetch());
  }, [hasMore, isLoading, doFetchList, startImperativeFetch]);

  /**
   * refetch — reset to page 1 and re-fetch (keeps trips visible).
   */
  const refetch = useCallback(() => {
    currentPageRef.current = 1;
    setHasMore(true);
    doFetchList(1, false, startImperativeFetch());
  }, [doFetchList, startImperativeFetch]);

  /**
   * Automatic list fetch — runs on mount and whenever `agencyId` or the
   * serialized filters change. Each run OWNS a fresh AbortController whose
   * signal acts as that run's "ignore" token: doFetchList only applies a
   * result while the signal is live, and the cleanup aborts it. This makes
   * StrictMode's setup -> cleanup -> setup double-invoke safe — the first
   * setup's request is aborted by its own cleanup, and the second setup
   * performs a real fetch whose result IS applied. Keying on `filtersKey`
   * (a string) avoids churn from inline `filters: {}` objects.
   */
  useEffect(() => {
    if (!agencyId) return;

    // An agencyId change clears the detail cache too; a filters-only change
    // must preserve it. (filtersKey participates in the deps below.)
    const agencyChanged = prevAgencyIdRef.current !== agencyId;
    if (agencyChanged) {
      detailCacheRef.current.clear();
      prevAgencyIdRef.current = agencyId;
    }

    // Reset list state for the page-1 fetch this run is about to perform.
    setTrips([]);
    currentPageRef.current = 1;
    setHasMore(true);
    setError(null);

    const controller = new AbortController();

    // doFetchList only applies its result while controller.signal is live, so
    // aborting in cleanup is what makes a superseded/StrictMode-orphaned run a
    // no-op. Fire-and-forget: an effect body can't be async.
    doFetchList(1, false, controller.signal);

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId, filtersKey, doFetchList]);

  return {
    trips,
    isLoading,
    hasMore,
    loadMore,
    getDetail,
    error,
    refetch,
  };
}

export default useRatedHistory;
