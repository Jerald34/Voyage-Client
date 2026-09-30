/**
 * Team management API endpoints.
 */
import { fetchApi } from "./client.js";

export async function fetchTeam(agencyId) {
  return fetchApi(`/agencies/${agencyId}/team`);
}

export async function inviteMember(agencyId, body) {
  return fetchApi(`/agencies/${agencyId}/team`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function changeMemberRole(agencyId, membershipId, role) {
  return fetchApi(`/agencies/${agencyId}/team/${membershipId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function removeMember(agencyId, membershipId) {
  return fetchApi(`/agencies/${agencyId}/team/${membershipId}`, {
    method: "DELETE",
  });
}

export async function transferOwnership(agencyId, targetMembershipId) {
  return fetchApi(`/agencies/${agencyId}/team/transfer-ownership`, {
    method: "POST",
    body: JSON.stringify({ targetMembershipId }),
  });
}

export async function deleteAgency(agencyId, confirmName) {
  return fetchApi(`/agencies/${agencyId}`, {
    method: "DELETE",
    body: JSON.stringify({ confirmName }),
  });
}
