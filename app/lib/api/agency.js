/**
 * Agency-related API endpoints.
 */
import { fetchApi } from "./client.js";

export async function updateAgencySettings(agencyId, payload) {
  return fetchApi(`/agencies/${agencyId}/settings`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function listAgencyTrips(agencyId) {
  return fetchApi(`/agencies/${agencyId}/itineraries`);
}

export async function deleteAgencyTrip(agencyId, tripId) {
  return fetchApi(`/agencies/${agencyId}/itineraries/trips/${tripId}`, {
    method: "DELETE",
  });
}

export async function fetchItineraryDraft(agencyId, itineraryId) {
  return fetchApi(`/agencies/${agencyId}/itineraries/${itineraryId}`);
}

export async function bootstrapAgentWorkspace(agencyId) {
  return fetchApi(`/agencies/${agencyId}/workspace/bootstrap`);
}

export async function approveClientTrip(agencyId, tripId) {
  return fetchApi(`/agencies/${agencyId}/itineraries/trips/${tripId}/approve`, {
    method: "POST",
  });
}
