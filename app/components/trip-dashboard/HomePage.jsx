import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../theme/ThemeProvider";
import { useAuth } from "../../hooks/useAuth.js";
import { useAgentRunStream } from "../../hooks/useAgentRunStream.js";
import { useAgentStreamOrchestration } from "../../hooks/useAgentStreamOrchestration.js";
import { useTourFlow } from "../../hooks/useTourFlow.js";
import { useTripPlanning } from "../../hooks/useTripPlanning.js";
import {
  saveAgentThreadItinerary,
  deleteAgentThread,
  deleteAgencyTrip,
  listAgencyTrips,
  fetchPendingCount,
  updateAgencySettings,
  updateCurrentUserProfile,
  fetchPersonalItineraries,
  fetchPersonalThreads,
} from "../../lib/api/index.js";
import {
  getAgencyPortfolioSummary,
  getAgentPriorityQueue,
  getApprovalBlockers,
  getUrgentDepartures,
} from "../../lib/agency-dashboard/selectors.js";
import { buildPlaceEntities, getItineraryPlaceEntityId } from "../../lib/trip-dashboard/placeEntities.js";
import { getSavedItineraryTrips } from "../../lib/trip-dashboard/savedItineraries.js";
import { buildPlanningOptions } from "../../lib/trip-dashboard/planningOptions.js";

import dynamic from "next/dynamic";
import AgentCommandCenter from "./command-center/AgentCommandCenter.jsx";
import OwnerOverview from "../../agency/[agencyId]/components/dashboard/OwnerOverview.jsx";
import StaffMyWork from "../../agency/[agencyId]/components/dashboard/StaffMyWork.jsx";
import ItineraryDraftPanel from "./itinerary/ItineraryDraftPanel.jsx";
const ItineraryLiveMap = dynamic(() => import("./itinerary/ItineraryLiveMap.jsx"), { ssr: false });
import ClientItineraryPage from "./pages/ClientItineraryPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import SaveItineraryModal from "./modals/SaveItineraryModal.jsx";
import DashboardHeader from "./layout/DashboardHeader.jsx";
import DashboardSidebar from "./layout/DashboardSidebar.jsx";
import AdminPage from "../admin/AdminPage.jsx";
import MobileGlassSheet from "./mobile/MobileGlassSheet.jsx";
import useMobileViewport from "./mobile/useMobileViewport.js";
import ChatInput from "./command-center/ChatInput.jsx";
import FirstUseTutorial from "./tutorial/FirstUseTutorial.jsx";
import {
  TUTORIAL_MOCK_TRIPS,
  TUTORIAL_MOCK_PLANNING_OPTIONS,
  TUTORIAL_MOCK_TRIP_STATE,
} from "./tutorial/tutorialMockData.js";

import {
  getInitials,
  mapTripStatus,
  formatTripDates,
  getRunStatusLabel,
} from "../../lib/formatters.js";


export function getAgencyMapFallbackFromUser(user) {
  const agency = Array.isArray(user?.memberships)
    ? user.memberships.find((membership) => membership?.agency)?.agency
    : null;
  if (!agency) return null;

  const city = String(agency.city ?? "").trim();
  const country = String(agency.country ?? "").trim();
  if (!city && !country) return null;

  return {
    name: agency.name,
    city,
    country,
  };
}

export default function HomePage({
  user: userProp,
  agencyTrips: agencyTripsProp = [],
  onContinue,
  onOpenTrip,
  onNewItinerary,
  initialTab = "command-center",
  showJoinedNotice = false,
}) {
  const { theme } = useTheme();
  const { logout } = useAuth();
  const [user, setUser] = useState(userProp || null);
  const isPersonal = user?.accountType === "PERSONAL";
  const agencyId = user?.memberships?.[0]?.agencyId ?? null;
  const [fetchedTrips, setFetchedTrips] = useState(null);
  const agencyTrips = agencyTripsProp;
  const savedTripsForPortfolio = fetchedTrips ?? [];

  const existingClientNames = useMemo(() => {
    if (!fetchedTrips?.length) return [];
    const seen = new Set();
    const out = [];
    for (const t of fetchedTrips) {
      const name = String(t.clientName ?? "").trim();
      const key = name.toLowerCase();
      if (name && !seen.has(key)) {
        seen.add(key);
        out.push(name);
      }
    }
    return out.sort((a, b) => a.localeCompare(b));
  }, [fetchedTrips]);

  const {
    activeContext,
    setActiveContext,
    tripStates,
    setTripStates,
    draftThreadStates,
    setDraftThreadStates,
    draftThreadOrder,
    setDraftThreadOrder,
    bootstrapTrips,
    isSending,
    isCreatingDraftThread,
    agentError,
    setAgentError,
    runTargetRef,
    ensureTripThreadState,
    ensureDraftThreadState,
    loadInitialThreads,
    dispatchMessage,
    createPlanningContext,
    createRunTargetKey,
    renameThread,
  } = useTripPlanning(agencyId);

  // Guard ref: when a dashboard action explicitly sets activeContext (e.g.
  // Resume / Open trip), the context-management effect must NOT clear it
  // before ensureTripThreadState has a chance to hydrate tripStates.
  const explicitContextRef = useRef(false);

  const [composerInput, setComposerInput] = useState("");
  const [deletingThreadId, setDeletingThreadId] = useState(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isApprovingDraft, setIsApprovingDraft] = useState(false);
  const [approvalError, setApprovalError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [isClientMenuOpen, setIsClientMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [mobileMapPadding, setMobileMapPadding] = useState(0);
  const [pendingClientName, setPendingClientName] = useState(null);
  const [cipTourState, setCipTourState] = useState({
    hasSelectedClient: false,
    hasMultipleTrips: false,
    hasItineraryDays: false,
  });

  const isMobile = useMobileViewport();
  const clientMenuRef = useRef(null);
  const mobileTextareaRef = useRef(null);

  // Poll pending count for admin users
  useEffect(() => {
    if (user?.role !== "SUPER_ADMIN") return;
    let cancelled = false;
    const load = () => {
      fetchPendingCount()
        .then((data) => { if (!cancelled) setPendingCount(data.count || 0); })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user?.role]);

  const refreshPendingCount = () => {
    if (user?.role !== "SUPER_ADMIN") return;
    fetchPendingCount()
      .then((data) => setPendingCount(data.count || 0))
      .catch(() => {});
  };

  const {
    isStreaming,
    runStatus,
    assistantMessage,
    completedMessageContent,
    completedMessageProcess,
    tasks,
    tasksTouchedThisRun,
    toolCalls,
    thoughtEntries,
    mapMarkers,
    routeEstimates,
    activeToolLabel,
    lastItineraryUpdate,
    streamingItinerary,
    error: streamError,
    startStream,
    stopStream,
  } = useAgentRunStream(agencyId ?? "");

  // Ref that AgentCommandCenter writes with the committed process snapshot.
  // Passed to useAgentStreamOrchestration so it can attach it to the message.
  const agentProcessSnapshotRef = useRef(null);

  // Load user
  useEffect(() => { setUser(userProp); }, [userProp]);
  useEffect(() => {
    if (user) return;
    const stored = localStorage.getItem("voyage-user");
    if (stored) { try { setUser(JSON.parse(stored)); } catch (e) { console.error(e); } }
  }, [user]);

  // Load initial data — agency path
  useEffect(() => { if (agencyId) loadInitialThreads(); }, [agencyId]);

  // Load initial data — personal path
  useEffect(() => {
    if (!isPersonal) return;
    let cancelled = false;

    fetchPersonalItineraries()
      .then((res) => {
        if (cancelled) return;
        const items = Array.isArray(res?.itineraries) ? res.itineraries : (Array.isArray(res) ? res : []);
        setFetchedTrips(
          items.map((it) => ({
            id: it.id,
            clientName: null,
            destination: it.destinationSummary ?? it.title ?? null,
            travelWindow: formatTripDates(it.startDate, it.endDate),
            status: it.status?.toLowerCase() === "archived" ? "archived" : "active",
            approvalStatus: mapTripStatus(it.status),
            itineraryId: it.id,
            itineraryVersion: it.version ?? null,
          }))
        );
      })
      .catch((err) => console.error("Failed to load personal itineraries:", err));

    fetchPersonalThreads()
      .then((res) => {
        if (cancelled) return;
        const threads = Array.isArray(res?.threads) ? res.threads : (Array.isArray(res) ? res : []);
        if (threads.length === 0) return;

        const nextDraftStates = {};
        const nextDraftOrder = [];
        for (const thread of threads) {
          if (!thread?.id) continue;
          nextDraftStates[thread.id] = {
            threadId: thread.id,
            title: String(thread.title ?? thread.name ?? "").trim(),
            tripId: null,
            messages: [],
            itinerary: null,
            loaded: false,
          };
          nextDraftOrder.push(thread.id);
        }
        setDraftThreadStates((prev) => ({ ...prev, ...nextDraftStates }));
        setDraftThreadOrder((prev) => {
          const existing = new Set(prev);
          const toAdd = nextDraftOrder.filter((id) => !existing.has(id));
          return toAdd.length > 0 ? [...toAdd, ...prev] : prev;
        });
      })
      .catch((err) => console.error("Failed to load personal threads:", err));

    return () => { cancelled = true; };
  }, [isPersonal]);

  const {
    isFirstUseTutorialOpen,
    activeTourSteps,
    tourMobilePaneOverride,
    tourGlassSheetSnap,
    closeFirstUseTutorial,
    replayFirstUseTutorial,
    handleFirstUseTutorialStepChange,
  } = useTourFlow({ user, cipTourState, setActiveTab, setIsSidebarOpen });

  const persistUser = useCallback((nextUserOrUpdater) => {
    setUser((currentUser) => {
      const nextUser = typeof nextUserOrUpdater === "function"
        ? nextUserOrUpdater(currentUser)
        : nextUserOrUpdater;
      if (typeof window !== "undefined" && nextUser) {
        localStorage.setItem("voyage-user", JSON.stringify(nextUser));
      }
      return nextUser;
    });
  }, []);

  const handleUserProfileUpdate = useCallback(async (payload) => {
    const result = await updateCurrentUserProfile(payload);
    if (result?.user) {
      persistUser(result.user);
    }
    return result;
  }, [persistUser]);

  const handleAgencySettingsUpdate = useCallback(async (payload) => {
    if (!agencyId) {
      throw new Error("Missing agency context. Refresh and log in again.");
    }
    const result = await updateAgencySettings(agencyId, payload);
    const updatedAgency = result?.agency;
    if (updatedAgency) {
      persistUser((currentUser) => {
        if (!currentUser) return currentUser;
        return {
          ...currentUser,
          memberships: (currentUser?.memberships || []).map((membership) => (
            membership?.agencyId === agencyId
              ? { ...membership, agency: { ...membership.agency, ...updatedAgency } }
              : membership
          )),
        };
      });
    }
    return result;
  }, [agencyId, persistUser]);

  useEffect(() => {
    if (!Array.isArray(bootstrapTrips)) return;
    setFetchedTrips(
      bootstrapTrips.map((t) => {
        const firstItinerary = Array.isArray(t.itineraries) ? t.itineraries[0] : null;
        return {
          id: t.id,
          clientName: t.clientName ?? null,
          destination: t.destinationSummary ?? t.title,
          travelWindow: formatTripDates(t.startDate, t.endDate),
          status: t.status?.toLowerCase() === "archived" ? "archived" : "active",
          approvalStatus: mapTripStatus(t.status),
          itineraryId: firstItinerary?.id ?? null,
          itineraryVersion: firstItinerary?.version ?? null,
        };
      })
    );
  }, [bootstrapTrips]);

  // Context management — skip cleanup when a dashboard action explicitly set
  // the context (explicitContextRef). This prevents the effect from clearing
  // activeContext before ensureTripThreadState can hydrate tripStates.
  useEffect(() => {
    if (explicitContextRef.current) {
      explicitContextRef.current = false;
      return;
    }
    const hasPropTrips = Array.isArray(agencyTrips) && agencyTrips.length > 0;
    const hasThreadTrips = Object.keys(tripStates).length > 0;
    if (!hasPropTrips && !hasThreadTrips) {
      if (activeContext?.type === "trip") setActiveContext(null);
      return;
    }
    if (activeContext?.type === "draft") return;
    if (activeContext?.type === "trip") {
      const existsInProp = agencyTrips.some(t => t?.id === activeContext?.id);
      const existsInStates = Boolean(tripStates[activeContext?.id]);
      if (existsInProp || existsInStates) return;
    }
    if (hasPropTrips) setActiveContext(createPlanningContext("trip", agencyTrips[0]?.id ?? null));
  }, [activeContext, agencyTrips, tripStates]);

  useEffect(() => {
    if (!agencyId || !activeContext?.id) return;
    if (activeContext.type === "trip") {
      ensureTripThreadState(activeContext.id).catch(e => console.error(e));
    } else if (activeContext.type === "draft") {
      ensureDraftThreadState(activeContext.id).catch(e => console.error(e));
    }
  }, [activeContext, agencyId]);

  useAgentStreamOrchestration({
    agencyId,
    runStatus,
    completedMessageContent,
    completedMessageProcess,
    assistantMessage,
    lastItineraryUpdate,
    streamingItinerary,
    runTargetRef,
    setTripStates,
    setDraftThreadStates,
    processSnapshotRef: agentProcessSnapshotRef,
  });

  // UI state derivation
  const safeTrips = Array.isArray(agencyTrips) ? agencyTrips : [];
  const activeTrip = activeContext?.type === "trip" ? safeTrips.find(t => t?.id === activeContext.id) : null;
  const activeTripState = activeContext?.type === "draft" ? draftThreadStates[activeContext.id] : (activeContext?.type === "trip" && activeContext.id ? tripStates[activeContext.id] : null);

  const planningOptions = useMemo(
    () => buildPlanningOptions({ draftThreadOrder, draftThreadStates, safeTrips, tripStates, activeContext }),
    [draftThreadOrder, draftThreadStates, safeTrips, tripStates, activeContext],
  );

  const activeOption = useMemo(() => activeContext ? planningOptions.find(o => o.type === activeContext.type && o.id === activeContext.id) : planningOptions[0], [activeContext, planningOptions]);

  const tutorialCCMock = isFirstUseTutorialOpen && planningOptions.length === 0;
  const tutorialCIPMock = isFirstUseTutorialOpen && getSavedItineraryTrips(savedTripsForPortfolio).length === 0;
  const effectivePlanningOptions = tutorialCCMock ? TUTORIAL_MOCK_PLANNING_OPTIONS : planningOptions;
  const effectiveActiveOption = tutorialCCMock ? TUTORIAL_MOCK_PLANNING_OPTIONS[0] : activeOption;
  const effectiveTripState = tutorialCCMock ? TUTORIAL_MOCK_TRIP_STATE : activeTripState;
  const tripsForCip = tutorialCIPMock ? TUTORIAL_MOCK_TRIPS : savedTripsForPortfolio;

  const activeContextKey = createRunTargetKey(activeContext);
  const isVisible = Boolean(activeContextKey && activeContextKey === runTargetRef.current);
  const liveStatus = getRunStatusLabel(isVisible ? runStatus : "idle", isVisible ? streamError : null);
  const visibleMapMarkers = isVisible ? mapMarkers : [];
  const visibleRouteEstimates = isVisible ? routeEstimates : [];
  const placeEntities = useMemo(
    () => buildPlaceEntities({ itinerary: effectiveTripState?.itinerary ?? null, liveMarkers: visibleMapMarkers }),
    [effectiveTripState?.itinerary, visibleMapMarkers],
  );
  const agencyMapFallback = useMemo(() => getAgencyMapFallbackFromUser(user), [user]);
  const activeMembership = useMemo(() => (
    Array.isArray(user?.memberships)
      ? user.memberships.find((membership) => membership?.agencyId === agencyId)
      : null
  ), [agencyId, user]);
  const activeAgency = activeMembership?.agency ?? null;

  // Deep links can open the Dashboard (e.g. `tab=team` after accepting an
  // invite). Users without an agency workspace have no dashboard, so fall back
  // to the Command Center instead of leaving the main area empty.
  const currentTab = activeTab === "dashboard" && user && (isPersonal || !agencyId)
    ? "command-center"
    : activeTab;

  useEffect(() => {
    setSelectedPlaceId("");
  }, [activeContextKey]);

  const handleMobileSnapChange = useCallback((snap) => {
    const vh = window.visualViewport?.height ?? window.innerHeight;
    if (snap === "peek") setMobileMapPadding(120);
    else if (snap === "half") setMobileMapPadding(Math.round(vh * 0.55));
    else setMobileMapPadding(Math.round(vh * 0.9));
  }, []);

  function handleMobileKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (composerInput.trim() && !isSending) {
        handleMobileSubmit(event);
      }
    }
  }

  function handleMobileSubmit(event) {
    event.preventDefault();
    if (!composerInput.trim()) return;
    void dispatchMessage(composerInput, startStream);
    setComposerInput("");
  }

  const activeTripClientName = String(effectiveActiveOption?.clientName ?? effectiveActiveOption?.label ?? "").trim();
  const activeTripInitials = activeTripClientName ? getInitials(activeTripClientName) : "";
  const activeTripOrganizerInitials = effectiveActiveOption?.assignedOrganizer ? getInitials(effectiveActiveOption.assignedOrganizer) : "";
  const clientMenuEmptyTitle = "No client trips available";
  const clientMenuEmptyBody = "Use New Itinerary to create the first trip.";

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!clientMenuRef.current) return;
      if (clientMenuRef.current.contains(event.target)) return;
      if (event.target.closest?.("[data-clientmenu-portal]")) return;
      setIsClientMenuOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);


  // Actions
  const handleNewItinerary = async () => {
    // NOTE: pendingClientName is intentionally NOT cleared here. The top-level
    // "+ New Itinerary" header button clears it via its onNewItinerary wrapper
    // below; the "+ New trip for {client}" entry point in ClientItineraryPage
    // sets it just before calling this — clearing here would race with that
    // setter and erase the seed (same-event setState calls take the last value).
    // Reset to "command-center" tab so user sees the new draft being created
    setActiveTab("command-center");
    
    // Set a placeholder context to immediately transition the UI to a "creating" state
    // and avoid race conditions where the UI might try to render a null context.
    const placeholderId = `pending-${Date.now()}`;
    setActiveContext({ type: "draft", id: placeholderId });
    
    if (onNewItinerary) {
      await onNewItinerary();
    }
  };

  const handleDeleteOption = async (option) => {
    const threadId = option?.threadId;
    if (!agencyId || !threadId || deletingThreadId) return;
    setDeletingThreadId(threadId);
    try {
      await deleteAgentThread(agencyId, threadId);
      if (option.type === "draft") {
        setDraftThreadStates(prev => { const n = { ...prev }; delete n[option.id]; return n; });
        setDraftThreadOrder(prev => prev.filter(id => id !== option.id));
      } else if (option.tripId) {
        setTripStates(prev => { const n = { ...prev }; delete n[option.tripId]; return n; });
      }
      if (runTargetRef.current === createRunTargetKey(option)) runTargetRef.current = null;
      if (selectedPlaceId) setSelectedPlaceId("");
      if (activeContext?.type === option.type && activeContext?.id === option.id) {
        const next = getNextPlanningContextAfterDelete(planningOptions, option);
        setActiveContext(next ? createPlanningContext(next.type, next.id) : null);
      }
    } catch (e) { console.error(e); setAgentError(e.message); } finally { setDeletingThreadId(null); }
  };

  const submitDraftApproval = async (fields) => {
    if (!agencyId || activeContext?.type !== "draft") return;
    const threadId = activeContext.id;
    const itineraryId = draftThreadStates[threadId]?.itinerary?.id;
    if (!itineraryId) { setApprovalError("Generate an itinerary before saving this draft."); return; }

    setIsApprovingDraft(true); setApprovalError("");
    try {
      const res = await saveAgentThreadItinerary(agencyId, threadId, { itineraryId, ...fields });
      const approved = res?.thread || res?.trip || {};
      const tripId = approved.tripId || approved.id;
      const draftState = draftThreadStates[threadId] || {};

      if (tripId) {
        setTripStates(prev => ({
          ...prev,
          [tripId]: {
            ...draftState,
            threadId,
            title: approved.title || approved.clientName || fields.clientName,
            tripId,
            loaded: true,
          },
        }));
        setDraftThreadStates(prev => { const next = { ...prev }; delete next[threadId]; return next; });
        setDraftThreadOrder(prev => prev.filter(id => id !== threadId));
        setActiveContext(createPlanningContext("trip", tripId));
      }

      listAgencyTrips(agencyId)
        .then((r) => {
          const trips = Array.isArray(r?.trips) ? r.trips : [];
          setFetchedTrips(
            trips.map((t) => {
              const firstItinerary = Array.isArray(t.itineraries) ? t.itineraries[0] : null;
              return {
                id: t.id,
                clientName: t.clientName ?? null,
                destination: t.destinationSummary ?? t.title,
                travelWindow: formatTripDates(t.startDate, t.endDate),
                status: t.status?.toLowerCase() === "archived" ? "archived" : "active",
                approvalStatus: mapTripStatus(t.status),
                itineraryId: firstItinerary?.id ?? null,
                itineraryVersion: firstItinerary?.version ?? null,
              };
            })
          );
        })
        .catch((err) => console.error("Failed to refresh agency trips:", err));

      setIsApprovalModalOpen(false);
      setPendingClientName(null);
    } catch (e) { setApprovalError(e.message); } finally { setIsApprovingDraft(false); }
  };

  // REUSE: Append a system-visible message (e.g. reuse confirmation) into the
  // active trip's message list so it surfaces in the chat history without
  // triggering an agent run. Falls back silently when no trip context is active.
  const handleReuseSystemMessage = useCallback((message) => {
    const tripId = activeContext?.type === "trip" ? activeContext.id : null;
    if (!tripId || !message) return;
    setTripStates((prev) => {
      const current = prev[tripId] || { messages: [], loaded: false };
      // Deduplicate by id to avoid double-appends on re-renders.
      if (current.messages.some((m) => m.id === message.id)) return prev;
      return { ...prev, [tripId]: { ...current, messages: [...current.messages, message] } };
    });
  }, [activeContext, setTripStates]);

  // REUSE: Replace the active trip's itinerary with the freshly-inserted copy
  // returned by the reuse API call. Also refreshes the itinerary in the sidebar
  // (fetchedTrips) so the version badge stays accurate without a full reload.
  const handleReuseInserted = useCallback((updatedItinerary) => {
    const tripId = activeContext?.type === "trip" ? activeContext.id : null;
    if (!tripId || !updatedItinerary) return;
    setTripStates((prev) => {
      const current = prev[tripId] || {};
      return { ...prev, [tripId]: { ...current, itinerary: updatedItinerary } };
    });
  }, [activeContext, setTripStates]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-text-primary font-sans">
      <FirstUseTutorial
        open={isFirstUseTutorialOpen}
        onClose={closeFirstUseTutorial}
        onStepChange={handleFirstUseTutorialStepChange}
        steps={activeTourSteps}
      />

      {isApprovalModalOpen && activeContext?.type === "draft" && (
        <SaveItineraryModal
          itinerary={effectiveTripState?.itinerary ?? null}
          isSaving={isApprovingDraft}
          error={approvalError}
          initialClientName={pendingClientName ?? undefined}
          existingClientNames={existingClientNames}
          onCancel={() => { if (!isApprovingDraft) { setIsApprovalModalOpen(false); setApprovalError(""); setPendingClientName(null); } }}
          onSubmit={submitDraftApproval}
        />
      )}

      <div>
        <DashboardHeader
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          liveStatus={liveStatus}
          scopedStreamError={isVisible ? streamError : null}
          scopedIsStreaming={isVisible ? isStreaming : false}
          getInitials={getInitials}
          displayName={user?.displayName || "Traveler"}
          agencyId={agencyId}
          activeTab={currentTab}
          onNewItinerary={() => {
            setPendingClientName(null);
            handleNewItinerary();
          }}
          isCreatingDraftThread={isCreatingDraftThread}
          isClientMenuOpen={isClientMenuOpen}
          setIsClientMenuOpen={setIsClientMenuOpen}
          clientMenuRef={clientMenuRef}
          hasOptions={effectivePlanningOptions.length > 0}
          activeTripClientName={activeTripClientName}
          activeTripInitials={activeTripInitials}
          activeTripOrganizerInitials={activeTripOrganizerInitials}
          clientMenuEmptyTitle={clientMenuEmptyTitle}
          clientMenuEmptyBody={clientMenuEmptyBody}
          safeOptions={currentTab === "itineraries" ? effectivePlanningOptions.filter(o => o.type !== "draft") : effectivePlanningOptions}
          activeOption={effectiveActiveOption}
          onPlanningOptionDelete={handleDeleteOption}
          deletingThreadId={deletingThreadId}
          onPlanningOptionChange={(ctx) => { setActiveContext(createPlanningContext(ctx?.type, ctx?.id)); setComposerInput(""); }}
          onRenameThread={renameThread}
          canApproveDraft={activeContext?.type === "draft" && Boolean(activeTripState?.itinerary?.id)}
          onApproveDraft={() => { setApprovalError(""); setIsApprovalModalOpen(true); }}
        />
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <DashboardSidebar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          activeTab={currentTab}
          setActiveTab={setActiveTab}
          logout={logout}
          user={user}
          pendingCount={pendingCount}
          agencyId={agencyId}
        />

        <main className="flex-1 overflow-y-auto p-2 flex flex-col gap-2 max-[900px]:p-0 max-[900px]:overflow-hidden">
          {currentTab === "command-center" ? (
            <section
              data-tour-target="workspace"
              className="relative flex flex-1 min-h-0 overflow-hidden rounded-[24px] border border-border/10 shadow-inner max-[900px]:rounded-none max-[900px]:border-none max-[900px]:shadow-none"
            >
              {/* Immersive Map Background */}
              <div
                data-tour-target="workspace-map"
                className="absolute inset-0 z-0 opacity-90 transition-opacity duration-700 hover:opacity-100"
              >
                <ItineraryLiveMap
                  theme={theme}
                  agencyLocation={agencyMapFallback}
                  items={effectiveTripState?.itinerary?.days?.reduce((acc, day) => {
                    (day?.items || []).forEach((item, idx) => acc.push({
                      ...item,
                      __dayNumber: day?.dayNumber,
                      __dayTitle: day?.title,
                      __itemIndex: idx,
                      __placeEntityId: getItineraryPlaceEntityId(item, day, idx),
                    }));
                    return acc;
                  }, []) ?? []}
                  liveMarkers={visibleMapMarkers}
                  routeEstimates={visibleRouteEstimates}
                  placeEntities={placeEntities}
                  selectedPlaceId={selectedPlaceId}
                  onSelectPlace={setSelectedPlaceId}
                  sidebarWidth={isMobile ? 0 : 520}
                  mapBottomPadding={isMobile ? mobileMapPadding : 0}
                />
              </div>

              {/* Desktop: Floating Glass Panels Layer */}
              <div className="relative z-10 flex gap-6 p-2 w-full h-full pointer-events-none overflow-hidden max-[900px]:hidden">
                <div
                  data-tour-target="workspace-chat"
                  className="w-full lg:w-[520px] h-full pointer-events-auto transition-all duration-500 ease-in-out"
                >
                  <AgentCommandCenter
                    messages={effectiveTripState?.messages ?? []}
                    isStreaming={isVisible ? isStreaming : false}
                    assistantMessage={isVisible ? assistantMessage : ""}
                    toolCalls={isVisible ? toolCalls : []}
                    thoughtEntries={isVisible ? thoughtEntries : []}
                    tasks={isVisible ? tasks : []}
                    tasksTouchedThisRun={isVisible ? tasksTouchedThisRun : new Set()}
                    streamingItinerary={isVisible ? streamingItinerary : null}
                    dispatchAgentMessage={(prompt, files) => dispatchMessage(prompt, startStream, files)}
                    composerInput={composerInput}
                    setComposerInput={setComposerInput}
                    isSending={isSending}
                    agentError={agentError}
                    user={user}
                    itinerary={effectiveTripState?.itinerary ?? null}
                    placeEntities={placeEntities}
                    selectedPlaceId={selectedPlaceId}
                    onPlaceSelect={setSelectedPlaceId}
                    onStop={isVisible ? stopStream : undefined}
                    processSnapshotRef={agentProcessSnapshotRef}
                    tripId={activeContext?.type === "trip" ? activeContext.id : null}
                    agencyId={agencyId}
                    targetItineraryId={effectiveTripState?.itinerary?.id ?? null}
                    currentVersion={effectiveTripState?.itinerary?.version ?? null}
                    targetItinerary={effectiveTripState?.itinerary ?? null}
                    onSystemVisibleMessage={handleReuseSystemMessage}
                    onReuseInserted={handleReuseInserted}
                  />
                </div>
              </div>

              {/* Mobile: Glass Sheet over map */}
              {isMobile && (
                <MobileGlassSheet
                  defaultSnap="half"
                  onSnapChange={handleMobileSnapChange}
                  forcedSnap={tourGlassSheetSnap}
                  data-tour-target="workspace-chat"
                  footer={
                    <ChatInput
                      textareaRef={mobileTextareaRef}
                      composerInput={composerInput}
                      setComposerInput={setComposerInput}
                      handleKeyDown={handleMobileKeyDown}
                      submitComposer={handleMobileSubmit}
                      isSending={isSending || (isVisible && isStreaming)}
                      agentError={agentError}
                      onStop={isVisible ? stopStream : undefined}
                      containerClassName="px-3 pb-3"
                    />
                  }
                >
                  <AgentCommandCenter
                    messages={effectiveTripState?.messages ?? []}
                    isStreaming={isVisible ? isStreaming : false}
                    assistantMessage={isVisible ? assistantMessage : ""}
                    toolCalls={isVisible ? toolCalls : []}
                    thoughtEntries={isVisible ? thoughtEntries : []}
                    tasks={isVisible ? tasks : []}
                    tasksTouchedThisRun={isVisible ? tasksTouchedThisRun : new Set()}
                    streamingItinerary={isVisible ? streamingItinerary : null}
                    dispatchAgentMessage={(prompt, files) => dispatchMessage(prompt, startStream, files)}
                    composerInput={composerInput}
                    setComposerInput={setComposerInput}
                    isSending={isSending}
                    agentError={agentError}
                    user={user}
                    itinerary={effectiveTripState?.itinerary ?? null}
                    placeEntities={placeEntities}
                    selectedPlaceId={selectedPlaceId}
                    onPlaceSelect={setSelectedPlaceId}
                    onStop={isVisible ? stopStream : undefined}
                    hideChatInput
                    processSnapshotRef={agentProcessSnapshotRef}
                    tripId={activeContext?.type === "trip" ? activeContext.id : null}
                    agencyId={agencyId}
                    targetItineraryId={effectiveTripState?.itinerary?.id ?? null}
                    currentVersion={effectiveTripState?.itinerary?.version ?? null}
                    targetItinerary={effectiveTripState?.itinerary ?? null}
                    onSystemVisibleMessage={handleReuseSystemMessage}
                    onReuseInserted={handleReuseInserted}
                  />
                </MobileGlassSheet>
              )}
            </section>
          ) : currentTab === "dashboard" && agencyId ? (
            // Own scroll container: <main> is overflow-hidden at ≤900px (for the
            // Command Center map), so the dashboard must scroll itself on phones.
            <div
              data-testid="dashboard-scroll"
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain max-[900px]:pb-[env(safe-area-inset-bottom)]"
            >
              {activeMembership?.role === "STAFF" ? (
                <StaffMyWork
                  agencyId={agencyId}
                  initialData={null}
                  onOpenTrip={(tripId) => {
                    explicitContextRef.current = true;
                    setActiveTab("command-center");
                    setActiveContext(createPlanningContext("trip", tripId));
                  }}
                  onNewTrip={handleNewItinerary}
                  onOpenItineraries={() => setActiveTab("itineraries")}
                  showJoinedNotice={showJoinedNotice}
                />
              ) : (
                <OwnerOverview
                  agencyId={agencyId}
                  initialData={null}
                  onOpenTrip={(tripId) => {
                    explicitContextRef.current = true;
                    setActiveTab("command-center");
                    setActiveContext(createPlanningContext("trip", tripId));
                  }}
                  onNewTrip={handleNewItinerary}
                  showJoinedNotice={showJoinedNotice}
                />
              )}
            </div>
          ) : currentTab === "itineraries" ? (
            <ClientItineraryPage
              agencyTrips={tripsForCip}
              agencyId={agencyId}
              onTourStateChange={setCipTourState}
              tourMobilePaneOverride={tourMobilePaneOverride}
              onAddTripForClient={(clientName) => {
                setPendingClientName(clientName);
                handleNewItinerary();
              }}
              onDeleteTrip={async (aid, tripId) => {
                await deleteAgencyTrip(aid, tripId);
                setFetchedTrips(prev => (prev || []).filter(t => t.id !== tripId));
                if (tripStates[tripId]) {
                  setTripStates(prev => { const next = { ...prev }; delete next[tripId]; return next; });
                }
              }}
              onTripStatusChange={(tripId, label) => {
                setFetchedTrips((prev) => (prev || []).map((t) =>
                  t.id === tripId ? { ...t, approvalStatus: label } : t
                ));
              }}
            />
          ) : currentTab === "settings" ? (
            <SettingsPage
              user={user}
              agency={activeAgency}
              membership={activeMembership}
              logout={logout}
              onUpdateProfile={handleUserProfileUpdate}
              onUpdateAgency={handleAgencySettingsUpdate}
              onReplayTutorial={replayFirstUseTutorial}
            />
          ) : currentTab === "admin" && user?.role === "SUPER_ADMIN" ? (
            <AdminPage onPendingCountChange={refreshPendingCount} />
          ) : null}
        </main>
      </div>

    </div>
  );
}

// Internal helper for parsing run target key (could move to hook)
function parseRunTargetKey(key) {
  if (typeof key !== "string") return null;
  const idx = key.indexOf(":");
  if (idx <= 0) return null;
  return { type: key.slice(0, idx), id: key.slice(idx + 1) };
}

export function tagAssistantMessageByCompletedContent(messages, itineraryId, completedAssistantMessage) {
  if (!itineraryId || !Array.isArray(messages) || messages.length === 0) {
    return Array.isArray(messages) ? messages : [];
  }

  const completedContent = String(completedAssistantMessage?.content ?? "").trim();
  if (!completedContent) return messages;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "assistant" && String(message?.content ?? "").trim() === completedContent) {
      return messages.map((item, itemIndex) => (
        itemIndex === index ? { ...item, itineraryId } : item
      ));
    }
  }

  return messages;
}

export function getNextPlanningContextAfterDelete(planningOptions, deletedOption) {
  const next = (Array.isArray(planningOptions) ? planningOptions : [])
    .find((option) => !(option?.type === deletedOption?.type && option?.id === deletedOption?.id));

  return next ? { type: next.type, id: next.id } : null;
}

export function shouldApplyItineraryFetchResult({
  requestSequence,
  latestSequence,
  requestTargetKey,
  currentTargetKey,
}) {
  return (
    requestSequence === latestSequence &&
    Boolean(requestTargetKey) &&
    requestTargetKey === currentTargetKey
  );
}

export function getAssistantMessageItineraryIdFromPendingTag({
  pendingTag,
  targetKey,
  completedContent,
}) {
  if (!pendingTag?.itineraryId || pendingTag?.targetKey !== targetKey) return "";
  const pendingContent = String(pendingTag.content ?? "").trim();
  const currentContent = String(completedContent ?? "").trim();
  return pendingContent && pendingContent === currentContent ? String(pendingTag.itineraryId) : "";
}
