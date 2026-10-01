import { useCallback, useEffect, useState } from "react";
import { withTravelerNeeds } from "../lib/accessibility/travelerNeeds.js";

const EMPTY_NEEDS = { needs: [], notes: null };

/**
 * Traveler needs are sensitive personal data. Pending needs (chosen before a thread exists)
 * belong to ONE unsaved context id and are never visible to, or sent with, a different new plan.
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

  const clearPendingNeeds = useCallback(() => setPending(null), []);

  const saveTravelerNeeds = (next) => {
    const value = next ?? EMPTY_NEEDS;
    if (isUnsaved) {
      setPending({ key: unsavedKey, needs: value });
      return;
    }
    if (activeContext.type === "draft") setDraftThreadStates((prev) => withTravelerNeeds(prev, activeContext.id, value));
    else setTripStates((prev) => withTravelerNeeds(prev, activeContext.id, value));
  };

  return { activeTravelerNeeds, saveTravelerNeeds, clearPendingNeeds };
}
