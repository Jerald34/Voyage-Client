/**
 * Share/comment API endpoints.
 */
import { fetchApi } from "./client.js";
import { API_URL } from "./client.js";

export async function createItineraryShare(
  agencyId,
  itineraryId,
  payload = {},
) {
  return fetchApi(`/agencies/${agencyId}/shares/${itineraryId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listTripShares(agencyId, tripId) {
  const params = tripId
    ? `?tripId=${encodeURIComponent(tripId)}`
    : "";
  return fetchApi(`/agencies/${agencyId}/shares${params}`);
}

export async function revokeShare(agencyId, shareId) {
  return fetchApi(`/agencies/${agencyId}/shares/${shareId}`, {
    method: "DELETE",
  });
}

/** Pushes a link's expiry out by 7 or 30 days, counted from now if it has already expired. */
export async function extendShare(agencyId, shareId, extendDays) {
  return fetchApi(`/agencies/${agencyId}/shares/${shareId}/expiry`, {
    method: "PATCH",
    body: JSON.stringify({ extendDays }),
  });
}

export async function listShareComments(agencyId, shareId) {
  return fetchApi(`/agencies/${agencyId}/shares/${shareId}/comments`);
}

export async function replyToShareComment(agencyId, commentId, content) {
  return fetchApi(
    `/agencies/${agencyId}/shares/comments/${commentId}/reply`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    },
  );
}

export async function getUnreadCommentCount(agencyId) {
  return fetchApi(`/agencies/${agencyId}/shares/unread-count`);
}

export async function getUnreadCommentCountsByTrip(agencyId) {
  return fetchApi(`/agencies/${agencyId}/shares/unread-counts-by-trip`);
}

export async function fetchPublicItinerary(token) {
  const url = `${API_URL}/shared/${token}`;
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data.error?.message || "Itinerary not available",
    );
    error.code = data.error?.code || "UNKNOWN_ERROR";
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function listPublicComments(token) {
  const url = `${API_URL}/shared/${token}/comments`;
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data.error?.message || "Failed to load comments",
    );
    error.code = data.error?.code || "UNKNOWN_ERROR";
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function postPublicComment(token, payload) {
  const url = `${API_URL}/shared/${token}/comments`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data.error?.message || "Failed to post comment",
    );
    error.code = data.error?.code || "UNKNOWN_ERROR";
    error.status = response.status;
    throw error;
  }
  return data;
}
