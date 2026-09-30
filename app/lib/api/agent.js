/**
 * Agent thread and run API endpoints.
 */
import { fetchApi, API_URL, createApiError } from "./client.js";

export async function createAgentThread(agencyId, tripId = null) {
  const body = {};
  if (tripId) body.tripId = tripId;
  return fetchApi(`/agencies/${agencyId}/agent/threads`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function listAgentThreads(agencyId) {
  return fetchApi(`/agencies/${agencyId}/agent/threads`);
}

export async function fetchAgentThread(agencyId, threadId) {
  return fetchApi(`/agencies/${agencyId}/agent/threads/${threadId}`);
}

export async function deleteAgentThread(agencyId, threadId) {
  return fetchApi(`/agencies/${agencyId}/agent/threads/${threadId}`, {
    method: "DELETE",
  });
}

export async function sendMessage(agencyId, threadId, content, imageUrls = []) {
  return fetchApi(`/agencies/${agencyId}/agent/threads/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content,
      ...(imageUrls.length > 0 ? { imageUrls } : {}),
    }),
  });
}

export async function uploadChatImages(agencyId, threadId, files) {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));

  const url = `${API_URL}/agencies/${agencyId}/agent/threads/${threadId}/images`;
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw createApiError(response, data, "Failed to upload images", "UPLOAD_ERROR");
  }
  return data;
}

export async function saveAgentThreadItinerary(agencyId, threadId, payload) {
  return fetchApi(
    `/agencies/${agencyId}/agent/threads/${threadId}/save`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateAgentThreadTitle(agencyId, threadId, title) {
  return fetchApi(
    `/agencies/${agencyId}/agent/threads/${threadId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ title }),
    },
  );
}

export async function fetchThreadMessages(
  agencyId,
  threadId,
  { cursor, limit } = {},
) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return fetchApi(
    `/agencies/${agencyId}/agent/threads/${threadId}/messages${qs ? `?${qs}` : ""}`,
  );
}

export async function cancelAgentRun(agencyId, runId) {
  return fetchApi(`/agencies/${agencyId}/agent/runs/${runId}/cancel`, {
    method: "POST",
  });
}
