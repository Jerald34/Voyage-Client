/**
 * Admin API endpoints.
 */
import { fetchApi } from "./client.js";

export async function fetchPendingAgencies() {
  return fetchApi("/admin/agencies/pending");
}

export async function fetchAllAgencies(status) {
  const params = status
    ? `?status=${encodeURIComponent(status)}`
    : "";
  return fetchApi(`/admin/agencies${params}`);
}

export async function fetchAllAccounts() {
  return fetchApi("/admin/users");
}

export async function fetchAccountDetail(userId) {
  return fetchApi(`/admin/users/${userId}`);
}

function postAccountAction(userId, action, body) {
  return fetchApi(`/admin/users/${userId}/${action}`, { method: "POST", body: JSON.stringify(body) });
}

const withReason = (reason) => (reason && reason.trim() ? { reason: reason.trim() } : {});

export async function adminDisableUser(userId, reason) {
  return postAccountAction(userId, "disable", withReason(reason));
}

export async function adminEnableUser(userId, reason) {
  return postAccountAction(userId, "enable", withReason(reason));
}

export async function adminSignOutUser(userId, reason) {
  return postAccountAction(userId, "sign-out", withReason(reason));
}

export async function adminDeleteUser(userId, { confirmEmail, reason, newOwnerUserId } = {}) {
  return postAccountAction(userId, "delete", {
    confirmEmail,
    ...withReason(reason),
    ...(newOwnerUserId ? { newOwnerUserId } : {}),
  });
}

export async function fetchPendingCount() {
  return fetchApi("/admin/agencies/pending-count");
}

export async function fetchAgencyDetail(agencyId) {
  return fetchApi(`/admin/agencies/${agencyId}`);
}

export async function adminApproveAgency(agencyId) {
  return fetchApi(`/admin/agencies/${agencyId}/approve`, {
    method: "POST",
  });
}

export async function adminRejectAgency(agencyId, reason) {
  return fetchApi(`/admin/agencies/${agencyId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function adminSuspendAgency(agencyId, reason) {
  return fetchApi(`/admin/agencies/${agencyId}/suspend`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function adminUnsuspendAgency(agencyId) {
  return fetchApi(`/admin/agencies/${agencyId}/unsuspend`, {
    method: "POST",
  });
}

export async function fetchUsage({ range = "this_month", groupBy = "user" } = {}) {
  const qs = new URLSearchParams({ range, groupBy });
  return fetchApi(`/admin/usage?${qs.toString()}`);
}

/** Runs behind one table row: pass exactly one of userId, agencyId, threadId. */
export async function fetchUsageRuns({ range = "this_month", userId, agencyId, threadId }) {
  const qs = new URLSearchParams({
    range,
    ...(userId ? { userId } : {}),
    ...(agencyId ? { agencyId } : {}),
    ...(threadId ? { threadId } : {}),
  });
  return fetchApi(`/admin/usage/runs?${qs.toString()}`);
}

export async function fetchUsageRun(runId) {
  return fetchApi(`/admin/usage/runs/${runId}`);
}

export async function fetchReports(status) {
  const qs = status && status !== "ALL" ? `?status=${encodeURIComponent(status)}` : "";
  return fetchApi(`/admin/reports${qs}`);
}

export async function fetchReportDetail(id) {
  return fetchApi(`/admin/reports/${id}`);
}

export async function updateReport(id, patch) {
  return fetchApi(`/admin/reports/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}
