/**
 * Personal account API endpoints (/me/*).
 */
import { fetchApi } from "./client.js";

export async function fetchPersonalItineraries() {
  return fetchApi("/me/itineraries");
}

export async function fetchPersonalItinerary(id) {
  return fetchApi(`/me/itineraries/${id}`);
}

export async function createPersonalItinerary(body = {}) {
  return fetchApi("/me/itineraries", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updatePersonalItinerary(id, body = {}) {
  return fetchApi(`/me/itineraries/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deletePersonalItinerary(id) {
  return fetchApi(`/me/itineraries/${id}`, {
    method: "DELETE",
  });
}

export async function fetchPersonalThreads() {
  return fetchApi("/me/agent/threads");
}

export async function createPersonalThread(body = {}) {
  return fetchApi("/me/agent/threads", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function createPersonalShare(itineraryId, payload = {}) {
  return fetchApi(`/me/itineraries/${itineraryId}/shares`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
