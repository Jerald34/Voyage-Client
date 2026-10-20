/**
 * Dashboard endpoints that load on demand. The polled payload and the
 * calendar load in their own hooks.
 */
import { fetchApi } from "./client.js";

/** Everything the dashboard's trip panel shows: the trip, its share link and every comment. */
export async function fetchTripPreview(agencyId, tripId) {
  return fetchApi(`/agencies/${agencyId}/dashboard/trips/${encodeURIComponent(tripId)}`);
}
