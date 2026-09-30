"use client";
import { useEffect, useMemo, useState } from "react";

/**
 * Returns the current user's membership role for the given agency.
 * Reads from localStorage ("voyage-user") where the user object with
 * memberships is persisted after login / auth/me calls.
 *
 * Returns: "OWNER" | "ADMIN" | "STAFF" | null
 */
export function useAgencyRole(agencyId) {
  const [user, setUser] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("voyage-user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Re-read from localStorage when agencyId changes or on mount (handles
  // cases where the user object is updated after this hook mounts).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("voyage-user");
      const parsed = raw ? JSON.parse(raw) : null;
      setUser(parsed);
    } catch {
      setUser(null);
    }
  }, [agencyId]);

  return useMemo(() => {
    if (!user || !agencyId) return null;
    const membership = Array.isArray(user.memberships)
      ? user.memberships.find((m) => m.agencyId === agencyId)
      : null;
    return membership?.role ?? null; // "OWNER" | "ADMIN" | "STAFF" | null
  }, [user, agencyId]);
}
