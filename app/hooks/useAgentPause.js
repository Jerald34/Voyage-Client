import { useCallback, useEffect, useRef, useState } from "react";
import { activeLearnedPause, activePause, learnedPauseEnd, pauseFromError, pauseKey } from "../lib/agentPause.js";

// setTimeout stores its delay in a signed 32-bit int; a longer one fires immediately.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/** While paused, coming back to the window asks the server again at most this often. */
export const PAUSE_RECHECK_MIN_MS = 30 * 1000;

/**
 * Agent-pause state for the planner page.
 * - `userPause`: `user.agentPause` from /auth/me.
 * - `surfaceActive`: the agent chat is on screen; the popup opens by itself at most once per pause per page load.
 * - `refreshUser`: reads the signed-in user again and stores it (so `userPause` updates). While paused, the hook
 *   calls it when the window regains focus or the tab becomes visible (at most every PAUSE_RECHECK_MIN_MS), so a
 *   pause an administrator has lifted unlocks the composer without a reload. `recheck()` calls it on demand and
 *   resolves true when the server answered, false when it could not be asked.
 * - `reportError(error)`: call with any send/upload error; returns true (and opens the popup) for AGENT_PAUSED.
 *   The server is the authority on a pause it has just enforced: the popup opens and the composer locks from
 *   the server's details even when this device's clock says the pause already ended (see SERVER_PAUSE_HOLD_MS).
 */
export function useAgentPause(userPause, { surfaceActive = false, refreshUser } = {}) {
  // A pause learned from a 403, for when the user object was loaded before the admin paused them
  // (or when this device's clock runs ahead of the server's). `learnedAt` anchors its hold.
  const [learned, setLearned] = useState(null);
  const [tick, setTick] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const shownKeyRef = useRef(null);
  const refreshRef = useRef(refreshUser);
  const lastCheckAtRef = useRef(0);
  const checkingRef = useRef(null);
  const snapshotRef = useRef(userPause);

  const learnedPause = learned ? activeLearnedPause(learned.pause, learned.learnedAt) : null;
  const pause = learnedPause ?? activePause(userPause);
  const key = pauseKey(pause);

  // When the pause being shown stops, as ms since epoch (null = until an administrator lifts it).
  let endsAt = null;
  if (learnedPause) endsAt = learnedPauseEnd(learnedPause, learned.learnedAt);
  else if (pause?.until) endsAt = Date.parse(pause.until);

  useEffect(() => {
    refreshRef.current = refreshUser;
  });

  // A newer snapshot of the user from the server is the authority over a pause learned from an earlier
  // refusal, whichever way it points. The snapshot the hook mounted with is not "newer".
  useEffect(() => {
    if (snapshotRef.current === userPause) return;
    snapshotRef.current = userPause;
    setLearned(null);
  }, [userPause]);

  // The popup belongs to the pause it opened for: once nothing is paused, a later pause starts closed.
  const paused = !!pause;
  useEffect(() => {
    if (!paused) setModalOpen(false);
  }, [paused]);

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

  // Asks the server who the user is now. "No pause" can look the same as the snapshot already held (null
  // stays null), so a check also lifts a pause learned from a refusal, but only one it started after:
  // an answer that was already on its way when the server refused may predate that pause.
  const recheck = useCallback(() => {
    if (!refreshRef.current) return Promise.resolve(false);
    if (checkingRef.current) return checkingRef.current;
    const startedAt = Date.now();
    lastCheckAtRef.current = startedAt;
    const run = (async () => {
      try {
        await refreshRef.current();
        setLearned((current) => (current && current.learnedAt <= startedAt ? null : current));
        return true;
      } catch {
        return false;
      } finally {
        checkingRef.current = null;
      }
    })();
    checkingRef.current = run;
    return run;
  }, []);

  // While paused (and only then), coming back to the window is the moment an administrator's resume is likely to matter.
  const canRecheck = typeof refreshUser === "function";
  useEffect(() => {
    if (!paused || !canRecheck) return undefined;
    const check = () => {
      if (document.visibilityState === "hidden") return;
      if (Date.now() - lastCheckAtRef.current < PAUSE_RECHECK_MIN_MS) return;
      recheck();
    };
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [paused, canRecheck, recheck]);

  return {
    pause,
    modalOpen: modalOpen && !!pause,
    openModal: useCallback(() => setModalOpen(true), []),
    closeModal: useCallback(() => setModalOpen(false), []),
    reportError,
    recheck,
  };
}
