// First-run tour: opens once per account, uses the steps for the person's role,
// and moves tabs, mobile panes and the sidebar as the tour advances.
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildTourSteps, tourStorageKey } from "../components/trip-dashboard/tutorial/tutorialContent.js";

function hasSeenTour(userId) {
  try {
    return localStorage.getItem(tourStorageKey(userId)) === "true";
  } catch {
    return false;
  }
}

function rememberTourSeen(userId) {
  try {
    localStorage.setItem(tourStorageKey(userId), "true");
  } catch {
    // Storage blocked (private mode): the tour may show again next time.
  }
}

// Steps whose target only exists with real Itineraries data are dropped when it's missing.
function filterForItineraries(steps, cipTourState) {
  if (!cipTourState.hasSelectedClient) return steps;
  return steps.filter((step) => {
    if (step.target === "cip-trip-selector") return cipTourState.hasMultipleTrips;
    if (step.target === "cip-day-strip") return cipTourState.hasItineraryDays;
    return true;
  });
}

export function useTourFlow({ user, agencyId, cipTourState, setActiveTab, setIsSidebarOpen }) {
  const tourSteps = useMemo(() => buildTourSteps({ user, agencyId }), [user, agencyId]);
  const [isFirstUseTutorialOpen, setIsFirstUseTutorialOpen] = useState(false);
  const [activeTourSteps, setActiveTourSteps] = useState(tourSteps);
  const [tourMobilePaneOverride, setTourMobilePaneOverride] = useState(null);
  const [tourGlassSheetSnap, setTourGlassSheetSnap] = useState(null);
  const userId = user?.id ?? null;

  // Decide once per account, not again when the profile object changes.
  useEffect(() => {
    if (!userId || hasSeenTour(userId)) return;
    setActiveTourSteps(tourSteps);
    setIsFirstUseTutorialOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, agencyId]);

  const closeFirstUseTutorial = useCallback(() => {
    if (userId) rememberTourSeen(userId);
    setIsFirstUseTutorialOpen(false);
    setTourMobilePaneOverride(null);
    setTourGlassSheetSnap(null);
    // The replay step opens the mobile drawer; don't leave it covering the page.
    setIsSidebarOpen(false);
  }, [userId, setIsSidebarOpen]);

  // The welcome step carries the start tab, so the step change below moves there.
  const replayFirstUseTutorial = useCallback(() => {
    setActiveTourSteps(filterForItineraries(tourSteps, cipTourState));
    setIsFirstUseTutorialOpen(true);
  }, [cipTourState, tourSteps]);

  const handleFirstUseTutorialStepChange = useCallback((step) => {
    if (step?.tab) {
      setActiveTab((current) => (current === step.tab ? current : step.tab));
    }
    if (step?.target === "cip-client-directory") {
      setTourMobilePaneOverride("list");
    } else if (
      step?.target === "cip-workspace" ||
      step?.target === "cip-trip-selector" ||
      step?.target === "cip-day-strip" ||
      step?.target === "cip-actions"
    ) {
      setTourMobilePaneOverride("detail");
    } else {
      setTourMobilePaneOverride(null);
    }
    if (step?.target === "workspace-chat") {
      setTourGlassSheetSnap("half");
    } else if (step?.target === "workspace-map") {
      setTourGlassSheetSnap("peek");
    } else {
      setTourGlassSheetSnap(null);
    }
    // Only the replay step shows the sidebar (the mobile drawer); every other step hides it.
    setIsSidebarOpen(step?.target === "settings-replay");
  }, [setActiveTab, setIsSidebarOpen]);

  return {
    isFirstUseTutorialOpen,
    activeTourSteps,
    tourMobilePaneOverride,
    tourGlassSheetSnap,
    closeFirstUseTutorial,
    replayFirstUseTutorial,
    handleFirstUseTutorialStepChange,
  };
}
