/**
 * Hand edits to a saved itinerary on the Itineraries page, and reopening an approved
 * trip. Every edit answers with the whole itinerary, in the same `{ itinerary }`
 * shape as fetchItineraryDraft. The server refuses edits to an approved itinerary
 * with 409 ITINERARY_LOCKED.
 */
import { fetchApi } from "./client.js";

function itineraryPath(agencyId, itineraryId) {
  return `/agencies/${agencyId}/itineraries/${itineraryId}`;
}

export async function renameItineraryDay(agencyId, itineraryId, dayId, title) {
  return fetchApi(`${itineraryPath(agencyId, itineraryId)}/days/${dayId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export async function addItineraryStop(agencyId, itineraryId, dayId, stop) {
  return fetchApi(`${itineraryPath(agencyId, itineraryId)}/days/${dayId}/items`, {
    method: "POST",
    body: JSON.stringify(stop),
  });
}

export async function updateItineraryStop(agencyId, itineraryId, itemId, patch) {
  return fetchApi(`${itineraryPath(agencyId, itineraryId)}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteItineraryStop(agencyId, itineraryId, itemId) {
  return fetchApi(`${itineraryPath(agencyId, itineraryId)}/items/${itemId}`, {
    method: "DELETE",
  });
}

// `target` is { toDayId, toSortOrder? }: the stop's 1-based position among the day's
// other stops, or the end of the day when left out.
export async function moveItineraryStop(agencyId, itineraryId, itemId, target) {
  return fetchApi(`${itineraryPath(agencyId, itineraryId)}/items/${itemId}/move`, {
    method: "POST",
    body: JSON.stringify(target),
  });
}

export async function reopenClientTrip(agencyId, tripId) {
  return fetchApi(`/agencies/${agencyId}/itineraries/trips/${tripId}/reopen`, {
    method: "POST",
  });
}
