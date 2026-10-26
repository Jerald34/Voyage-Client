import { useCallback, useEffect, useRef, useState } from "react";
import { activeLearnedPause, activePause, learnedPauseEnd, pauseFromError, pauseKey } from "../lib/agentPause.js";

// setTimeout stores its delay in a signed 32-bit int; a longer one fires immediately.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * Agent-pause state for the planner page.
 * - `userPause`: `user.agentPause` from /auth/me.
 * - `surfaceActive`: the agent chat is on screen; the popup opens by itself at most once per pause per page load.
 * - `reportError(error)`: call with any send/upload error; returns true (and opens the popup) for AGENT_PAUSED.
 *   The server is the authority on a pause it has just enforced: the popup opens and the composer locks from
 *   the server's details even when this device's clock says the pause already ended (see SERVER_PAUSE_HOLD_MS).
 */
export function useAgentPause(userPause, { surfaceActive = false } = {}) {
  // A pause learned from a 403, for when the user object was loaded before the admin paused them
  // (or when this device's clock runs ahead of the server's). `learnedAt` anchors its hold.
  const [learned, setLearned] = useState(null);
  const [tick, setTick] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const shownKeyRef = useRef(null);

  const learnedPause = learned ? activeLearnedPause(learned.pause, learned.learnedAt) : null;
  const pause = learnedPause ?? activePause(userPause);
  const key = pauseKey(pause);

  // When the pause being shown stops, as ms since epoch (null = until an administrator lifts it).
  let endsAt = null;
  if (learnedPause) endsAt = learnedPauseEnd(learnedPause, learned.learnedAt);
  else if (pause?.until) endsAt = Date.parse(pause.until);

  useEffect(() => {
    if (!pause || !surfaceActive || shownKeyRef.current === key) return;
    shownKeyRef.current = key;
    setModalOpen(true);
  }, [key, surfaceActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-render when the pause ends so the composer unlocks without a reload. `tick` re-arms the
  // timer when a very long wait had to be cut short at the setTimeout limit.
  useEffect(() => {
    if (endsAt === null) return undefined;
    const ms = endsAt - Date.now();
    const timer = setTimeout(() => setTick((t) => t + 1), Math.min(Math.max(ms, 0) + 50, MAX_TIMEOUT_MS));
    return () => clearTimeout(timer);
  }, [endsAt, tick]);

  const reportError = useCallback((error) => {
    const fromServer = pauseFromError(error);
    if (!fromServer) return false;
    setLearned({ pause: fromServer, learnedAt: Date.now() });
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
