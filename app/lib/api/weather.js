/**
 * Weather API endpoints. Weather is optional everywhere it appears, so callers
 * treat any error as "no weather" rather than surfacing it.
 */
import { fetchApi, API_URL } from "./client.js";

export async function fetchItineraryWeather(agencyId, itineraryId) {
  return fetchApi(`/agencies/${agencyId}/itineraries/${itineraryId}/weather`);
}

export async function fetchSharedItineraryWeather(token) {
  const response = await fetch(`${API_URL}/shared/${encodeURIComponent(token)}/weather`, {
    headers: { "Content-Type": "application/json" },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.message || "Weather not available");
    error.code = data.error?.code || "UNKNOWN_ERROR";
    error.status = response.status;
    throw error;
  }
  return data;
}
