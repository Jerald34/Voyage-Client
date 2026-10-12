"use client";

import { useEffect, useRef } from "react";
import { fetchApi } from "../lib/api/index.js";

export const AGENCY_STATUS_POLL_MS = 30_000;

/**
 * While an agency waits for review, re-reads the signed-in user every 30 seconds
 * and whenever the tab comes back into view, and hands the fresh user to `onUser`
 * (capstone panel item 20: the pending screen updates by itself). A failed read
 * is ignored; the next check tries again. A 401 means the session ended: polling
 * stops and `onUnauthorized` is called once.
 */
export default function useAgencyStatusPolling({ enabled, onUser, onUnauthorized, intervalMs = AGENCY_STATUS_POLL_MS }) {
  const onUserRef = useRef(onUser);
  const onUnauthorizedRef = useRef(onUnauthorized);
  useEffect(() => {
    onUserRef.current = onUser;
    onUnauthorizedRef.current = onUnauthorized;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    let inFlight = false;

    async function check() {
      if (inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const data = await fetchApi("/auth/me");
        if (!cancelled && data?.user) onUserRef.current?.(data.user);
      } catch (error) {
        if (error?.status === 401 && !cancelled) {
          stop();
          onUnauthorizedRef.current?.();
        }
        // Any other failure (network blip, 5xx): keep the current screen; the next check retries.
      } finally {
        inFlight = false;
      }
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") check();
    }

    function stop() {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", handleVisibility);
    }

    const timer = setInterval(check, intervalMs);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", handleVisibility);
    return stop;
  }, [enabled, intervalMs]);
}
