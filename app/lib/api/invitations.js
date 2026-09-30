/**
 * Agency invitation API endpoints.
 */
import { fetchApi } from "./client.js";

export async function lookupInvitation(token) {
  const search = new URLSearchParams({ token });
  return fetchApi(`/invitations/lookup?${search.toString()}`);
}

export async function acceptInvitation(token) {
  return fetchApi("/invitations/accept", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function listAgencyInvitations(agencyId) {
  return fetchApi(`/agencies/${agencyId}/team/invitations`);
}

export async function revokeAgencyInvitation(agencyId, invitationId) {
  return fetchApi(`/agencies/${agencyId}/team/invitations/${invitationId}`, {
    method: "DELETE",
  });
}
