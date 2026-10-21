import { useCallback, useEffect, useState } from "react";
import { fetchPublicShareRevision } from "../lib/api/index.js";

export const REVISION_POLL_MS = 30_000;

/**
 * Tells the public share page when the agency has edited the itinerary since the
 * copy on screen was loaded. It only reports; it never loads anything itself.
 *
 * `revision` is the baseline: the revision that came with the itinerary now on
 * screen. A falsy one (an older server that doesn't send it) means no polling.
 * Otherwise the share's revision is checked every 30 s while the tab is visible,
 * and straight away when it becomes visible again. A different revision sets
 * `updateAvailable` and stops polling. 404/410 stop polling silently (the page's
 * next real load maps them to its error screens); any other error is ignored and
 * polling goes on.
 *
 * When the page swaps in a newer itinerary its `revision` changes, which starts a
 * fresh watch against the new baseline. `acknowledge()` does the same without a
 * new revision, for a reload that came back with the revision it already had.
 *
 * StrictMode-safe: all state lives in the effect's closure, so the dev double
 * mount leaves one timer. A response is dropped if its effect has been cleaned up
 * (unmount, or a new baseline), so a slow one can't speak for an old baseline.
 */
export function useShareRevisionWatch({ token, revision } = {}) {
  const [epoch, setEpoch] = useState(0);
  // The watch the update was found for. Tying it to the baseline makes it lapse
  // by itself the moment the baseline changes, with no reset step to forget.
  const watchKey = `${token ?? ""}|${revision ?? ""}|${epoch}`;
  const [foundFor, setFoundFor] = useState(null);

  useEffect(() => {
    if (!token || !revision) return undefined;

    let cancelled = false;
    let finished = false; // found an update, or the share is gone: no more polling
    let inFlight = false;
    let timerId = null;

    function stopTimer() {
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
    }

    function startTimer() {
      if (timerId === null && !finished) timerId = setInterval(check, REVISION_POLL_MS);
    }

    async function check() {
      if (cancelled || finished || inFlight) return;
      if (document.visibilityState !== "visible") return;
      inFlight = true;
      try {
        const res = await fetchPublicShareRevision(token);
        if (cancelled) return;
        const latest = res?.revision;
        if (latest && latest !== revision) {
          finished = true;
          stopTimer();
          setFoundFor(watchKey);
        }
      } catch (err) {
        if (cancelled) return;
        if (err?.status === 404 || err?.status === 410) {
          finished = true;
          stopTimer();
        }
        // Anything else (offline, a 5xx) is transient: keep polling.
      } finally {
        inFlight = false;
      }
    }

    function onVisibilityChange() {
      if (finished) return;
      if (document.visibilityState === "visible") {
        // Back on the tab: ask now, then a full interval from here.
        check();
        stopTimer();
        startTimer();
      } else {
        stopTimer();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    if (document.visibilityState === "visible") startTimer();

    return () => {
      cancelled = true;
      stopTimer();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [token, revision, watchKey]);

  const acknowledge = useCallback(() => setEpoch((n) => n + 1), []);

  return { updateAvailable: foundFor === watchKey, acknowledge };
}
