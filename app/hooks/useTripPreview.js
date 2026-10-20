"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTripPreview } from "@/app/lib/api/index.js";

/**
 * Loads the dashboard trip panel's data while `enabled` (the panel is open).
 * The panel stays mounted between trips, so a slow answer for an earlier trip
 * can land after a later one: each load is stamped and only the latest counts.
 * Closing or switching trips retires whatever is still in flight.
 *
 * Returns { data, error, loading, reload, update }. `data` is only ever the
 * current trip's; `update(fn)` edits it in place after a reply or an extension.
 */
export function useTripPreview({ agencyId, tripId, enabled }) {
  const [state, setState] = useState({ forTripId: null, data: null, error: null, loading: false });
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!agencyId || !tripId) return;
    const requestId = ++requestIdRef.current;
    setState((prev) => ({
      forTripId: tripId,
      data: prev.forTripId === tripId ? prev.data : null,
      error: null,
      loading: true,
    }));
    try {
      const data = await fetchTripPreview(agencyId, tripId);
      if (requestId !== requestIdRef.current) return;
      setState({ forTripId: tripId, data, error: null, loading: false });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setState({ forTripId: tripId, data: null, error, loading: false });
    }
  }, [agencyId, tripId]);

  useEffect(() => {
    if (enabled) load();
    return () => {
      requestIdRef.current += 1;
    };
  }, [enabled, load]);

  const update = useCallback((edit) => {
    setState((prev) => (prev.data ? { ...prev, data: edit(prev.data) } : prev));
  }, []);

  const isCurrent = state.forTripId === tripId;
  return {
    data: isCurrent ? state.data : null,
    error: isCurrent ? state.error : null,
    loading: isCurrent ? state.loading : enabled,
    reload: load,
    update,
  };
}

export default useTripPreview;
