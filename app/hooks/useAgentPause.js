import { useCallback, useEffect, useRef, useState } from "react";
import { activePause, pauseFromError, pauseKey } from "../lib/agentPause.js";

// setTimeout stores its delay in a signed 32-bit int; a longer one fires immediately.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * Agent-pause state for the planner page.
 * - `userPause`: `user.agentPause` from /auth/me.
 * - `surfaceActive`: the agent chat is on screen; the popup opens by itself at most once per pause per page load.
 * - `reportError(error)`: call with any send/upload error; returns true (and opens the popup) for AGENT_PAUSED.
 */
export function useAgentPause(userPause, { surfaceActive = false } = {}) {
  // A pause learned from a 403, for when the user object was loaded before the admin paused them.
  const [serverPause, setServerPause] = useState(null);
  const [tick, setTick] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const shownKeyRef = useRef(null);

  const pause = activePause(serverPause ?? userPause);
  const key = pauseKey(pause);

  useEffect(() => {
    if (!pause || !surfaceActive || shownKeyRef.current === key) return;
    shownKeyRef.current = key;
    setModalOpen(true);
  }, [key, surfaceActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-render when the pause ends so the composer unlocks without a reload. `tick` re-arms the
  // timer when a very long wait had to be cut short at the setTimeout limit.
  useEffect(() => {
    if (!pause?.until) return undefined;
    const ms = Date.parse(pause.until) - Date.now();
    const timer = setTimeout(() => setTick((t) => t + 1), Math.min(Math.max(ms, 0) + 50, MAX_TIMEOUT_MS));
    return () => clearTimeout(timer);
  }, [pause?.until, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const reportError = useCallback((error) => {
    const fromServer = pauseFromError(error);
    if (!fromServer) return false;
    setServerPause(fromServer);
    shownKeyRef.current = pauseKey(fromServer);
    setModalOpen(true);
    return true;
  }, []);

  return {
    pause,
    modalOpen: modalOpen && !!pause,
    openModal: useCallback(() => setModalOpen(true), []),
    closeModal: useCallback(() => setModalOpen(false), []),
    reportError,
  };
}
