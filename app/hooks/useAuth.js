import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchApi,
  setAccountType as setAccountTypeApi,
  requestEmailVerification as requestEmailVerificationApi,
  confirmEmailVerification as confirmEmailVerificationApi,
  acceptInvitation as acceptInvitationApi,
} from "../lib/api/index.js";

const PENDING_INVITE_KEY = "voyage-pending-invite";

export function setPendingInviteToken(token) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(PENDING_INVITE_KEY, token);
  else window.localStorage.removeItem(PENDING_INVITE_KEY);
}

export function getPendingInviteToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PENDING_INVITE_KEY);
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export function useAuth() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const register = async ({ email, password, displayName }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, displayName }),
      });
      return {
        user: data.user,
        emailVerificationRequired: Boolean(data.emailVerificationRequired),
      };
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async (email) => {
    setError(null);
    try {
      await requestEmailVerificationApi(email);
      return true;
    } catch (err) {
      setError(err);
      return false;
    }
  };

  const confirmEmailVerification = async (token) => {
    setLoading(true);
    setError(null);
    try {
      await confirmEmailVerificationApi(token);
      return true;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const replayPendingInvite = async () => {
    const token = getPendingInviteToken();
    if (!token) return null;
    try {
      const result = await acceptInvitationApi(token);
      setPendingInviteToken(null);
      return result;
    } catch (_) {
      return null;
    }
  };

  const createAgency = async (agencyData) => {
    setLoading(true);
    setError(null);
    try {
      await fetchApi("/agencies", {
        method: "POST",
        body: JSON.stringify(agencyData),
      });
      const meData = await fetchApi("/auth/me");
      localStorage.setItem("voyage-user", JSON.stringify(meData.user));
      router.push("/?authenticated=1");
      return meData.user;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const login = async ({ email, password }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("voyage-user", JSON.stringify(data.user));
      const inviteResult = await replayPendingInvite();
      if (inviteResult?.agencyId) {
        // Refresh user data so accountType (now AGENCY_USER) is current.
        try {
          const meData = await fetchApi("/auth/me");
          localStorage.setItem("voyage-user", JSON.stringify(meData.user));
        } catch (_) {
          // Non-fatal — the agency page will refetch.
        }
        router.push("/?authenticated=1&tab=team&invited=1");
      } else {
        router.push("/?authenticated=1");
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await fetchApi("/auth/logout", { method: "POST" }).catch(() => {});
    } finally {
      localStorage.removeItem("voyage-user");
      setLoading(false);
      window.location.href = "/";
    }
  };

  const startOAuth = (provider) => {
    window.location.href = `${API_URL}/auth/${provider}/start`;
  };

  const setAccountType = async (accountType) => {
    setLoading(true);
    setError(null);
    try {
      const data = await setAccountTypeApi(accountType);
      localStorage.setItem("voyage-user", JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    register,
    createAgency,
    login,
    logout,
    startOAuth,
    setAccountType,
    resendVerificationEmail,
    confirmEmailVerification,
    replayPendingInvite,
    error,
    setError,
    loading,
  };
}
