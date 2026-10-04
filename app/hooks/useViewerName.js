"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "voyage-user";

function subscribe(onChange) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

// Returns a string (or null), so React can tell whether it changed.
function getSnapshot() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const name = raw ? JSON.parse(raw)?.displayName : null;
    return typeof name === "string" && name.trim() ? name : null;
  } catch {
    return null;
  }
}

const getServerSnapshot = () => null;

/**
 * The signed-in user's display name, from the user object stored at login
 * ("voyage-user", the same place useAgencyRole reads). Null on the server and
 * while hydrating, so the page doesn't mismatch, then the stored name.
 */
export function useViewerName() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default useViewerName;
