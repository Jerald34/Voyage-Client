import { useEffect, useState } from "react";
import { fetchItineraryWeather, fetchSharedItineraryWeather } from "../lib/api/index.js";
import { buildWeatherByDayId } from "../lib/weather/weatherDisplay.js";

const EMPTY = { byDayId: new Map(), attribution: null };

/**
 * Per-day weather for one itinerary: `{ byDayId: Map<dayId, entry>, attribution }`.
 * Pass `shareToken` for the public page, or `agencyId` + `itineraryId`.
 * Refetches when `version` changes (a saved edit can move days or stops).
 * StrictMode-safe: no "already fetched" ref; stale responses are ignored.
 */
export function useItineraryWeather({ agencyId = null, itineraryId = null, shareToken = null, version = null, enabled = true } = {}) {
  const [state, setState] = useState(EMPTY);

  useEffect(() => {
    let cancelled = false;
    const canFetch = enabled && Boolean(shareToken || (agencyId && itineraryId));
    if (!canFetch) {
      setState(EMPTY);
      return () => {
        cancelled = true;
      };
    }

    const request = shareToken ? fetchSharedItineraryWeather(shareToken) : fetchItineraryWeather(agencyId, itineraryId);
    request
      .then((response) => {
        if (cancelled) return;
        const weather = response?.weather ?? null;
        setState({ byDayId: buildWeatherByDayId(weather), attribution: weather?.attribution ?? null });
      })
      .catch(() => {
        if (!cancelled) setState(EMPTY);
      });

    return () => {
      cancelled = true;
    };
  }, [agencyId, itineraryId, shareToken, version, enabled]);

  return state;
}
