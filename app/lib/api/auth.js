/**
 * Auth-related API endpoints.
 */
import { fetchApi } from "./client.js";

export async function updateCurrentUserProfile(payload) {
  return fetchApi("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function setAccountType(accountType) {
  return fetchApi("/auth/me/account-type", {
    method: "POST",
    body: JSON.stringify({ accountType }),
  });
}

export async function requestEmailVerification(email) {
  return fetchApi("/auth/email/verification/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function confirmEmailVerification(token) {
  return fetchApi("/auth/email/verification/confirm", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function requestPasswordReset(email) {
  return fetchApi("/auth/password/reset/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function confirmPasswordReset({ token, password }) {
  return fetchApi("/auth/password/reset/confirm", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}
