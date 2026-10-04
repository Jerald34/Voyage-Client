import { useCallback, useEffect, useRef, useState } from "react";
import { hasTravelerNeeds, withTravelerNeeds } from "../lib/accessibility/travelerNeeds.js";

const EMPTY_NEEDS = { needs: [], notes: null };

/**
 * Traveler needs are sensitive personal data, so this hook is strict about when they leave the tab:
 *  - Pending needs (chosen before a thread exists) belong to ONE unsaved context id and are
 *    never visible to, or sent with, a different new plan.
 *  - Needs are sent only when changed in this tab since the last successful send; otherwise the
 *    key is omitted so a stale tab cannot overwrite a colleague's edit. A clear is sent as
 *    { needs: [], notes: null }, never null (the server rejects null).
 *
 * `sendWithNeeds(dispatch)` calls `dispatch(needsOrNull)`; dispatch resolves to { sent, contextId, threadId }.
 */
export function useTravelerNeeds({ activeContext, activeTripState, setDraftThreadStates, setTripStates }) {
  const isUnsaved =
    !activeContext || (activeContext.type === "draft" && String(activeContext.id).startsWith("pending-"));
  const unsavedKey = isUnsaved ? (activeContext?.id ?? "none") : null;

  // Pending needs remember which unsaved context they were chosen for.
  const [pending, setPending] = useState(null);
  const pendingNeeds = pending && pending.key === unsavedKey ? pending.needs : null;
  const activeTravelerNeeds = isUnsaved ? pendingNeeds : (activeTripState?.travelerNeeds ?? null);

  // Drop stale pending needs from memory as soon as the unsaved context changes or is left.
  useEffect(() => {
    setPending((current) => (current && current.key !== unsavedKey ? null : current));
  }, [unsavedKey]);

  // Edits not yet confirmed sent, keyed by THREAD id: it is the one identity that survives a draft
  // being saved as a trip (the context id changes, the thread does not). The context id is tracked
  // too, as a fallback for state that has no thread yet. Each entry holds the token of the latest edit.
  const dirtyRef = useRef(new Map());
  const dirtyKeys = (contextId, threadId) => [...new Set([threadId, contextId].filter(Boolean))];
  const activeThreadId = activeTripState?.threadId ?? null;

  const clearPendingNeeds = useCallback(() => setPending(null), []);

  const saveTravelerNeeds = (next) => {
    const value = next ?? EMPTY_NEEDS;
    if (isUnsaved) {
      setPending({ key: unsavedKey, needs: value });
      return;
    }
    const token = {};
    for (const key of dirtyKeys(activeContext.id, activeThreadId)) dirtyRef.current.set(key, token);
    if (activeContext.type === "draft") setDraftThreadStates((prev) => withTravelerNeeds(prev, activeContext.id, value));
    else setTripStates((prev) => withTravelerNeeds(prev, activeContext.id, value));
  };

  const sendWithNeeds = async (dispatch) => {
    const contextId = activeContext?.id ?? null;
    let payload = null;
    let token = null;
    if (isUnsaved) {
      payload = hasTravelerNeeds(pendingNeeds) ? pendingNeeds : null;
    } else {
      const keys = dirtyKeys(contextId, activeThreadId);
      const dirtyKey = keys.find((key) => dirtyRef.current.has(key));
      if (dirtyKey) {
        token = dirtyRef.current.get(dirtyKey);
        payload = activeTripState?.travelerNeeds ?? EMPTY_NEEDS;
      }
    }

    const result = await dispatch(payload);

    if (payload) {
      if (isUnsaved) {
        // The thread was created by this send; if the send itself failed, keep the needs queued for it.
        // Keyed by thread id, so it still applies once the draft is saved as a trip.
        if (!result?.sent) {
          const token = {};
          for (const key of dirtyKeys(result?.contextId, result?.threadId)) dirtyRef.current.set(key, token);
        }
      } else if (result?.sent) {
        // Clear only entries still holding THIS send's token; a newer edit made mid-send keeps its own.
        for (const key of dirtyKeys(contextId, activeThreadId)) {
          if (dirtyRef.current.get(key) === token) dirtyRef.current.delete(key);
        }
      }
    }
    return result;
  };

  return { activeTravelerNeeds, saveTravelerNeeds, clearPendingNeeds, sendWithNeeds };
}
