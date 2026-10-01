import { useEffect, useMemo, useState } from "react";
import { fetchItineraryWeather, fetchSharedItineraryWeather } from "../lib/api/index.js";
import { buildWeatherByDayId } from "../lib/weather/weatherDisplay.js";

const EMPTY = { byDayId: new Map(), attribution: null };

/**
 * Per-day weather for one itinerary: `{ byDayId: Map<dayId, entry>, attribution }`.
 * Pass `shareToken` for the public page, or `agencyId` + `itineraryId`.
 * Refetches when `version` changes (a saved edit can move days or stops); the
 * previous weather stays until the new response lands. Switching agency,
 * itinerary or share token drops it at once so one trip never shows another's.
 * StrictMode-safe: no "already fetched" ref; stale responses are ignored.
 */
export function useItineraryWeather({ agencyId = null, itineraryId = null, shareToken = null, version = null, enabled = true } = {}) {
  const [state, setState] = useState({ ...EMPTY, key: null });
  const key = `${agencyId ?? ""}|${itineraryId ?? ""}|${shareToken ?? ""}`;

  useEffect(() => {
    let cancelled = false;
    const canFetch = enabled && Boolean(shareToken || (agencyId && itineraryId));
    if (!canFetch) {
      setState({ ...EMPTY, key });
      return () => {
        cancelled = true;
      };
    }

    const request = shareToken ? fetchSharedItineraryWeather(shareToken) : fetchItineraryWeather(agencyId, itineraryId);
    request
      .then((response) => {
        if (cancelled) return;
        const weather = response?.weather ?? null;
        setState({ byDayId: buildWeatherByDayId(weather), attribution: weather?.attribution ?? null, key });
      })
      .catch(() => {
        if (!cancelled) setState({ ...EMPTY, key });
      });

    return () => {
      cancelled = true;
    };
  }, [agencyId, itineraryId, shareToken, version, enabled, key]);

  return useMemo(
    () => (state.key === key ? { byDayId: state.byDayId, attribution: state.attribution } : EMPTY),
    [state, key],
  );
}
