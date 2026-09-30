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

export async function fetchUsage({ period = "day", groupBy = "user", from, to } = {}) {
  const qs = new URLSearchParams({ period, groupBy, ...(from ? { from } : {}), ...(to ? { to } : {}) });
  return fetchApi(`/admin/usage?${qs.toString()}`);
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
