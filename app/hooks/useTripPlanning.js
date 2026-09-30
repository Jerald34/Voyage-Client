import { useEffect, useRef, useState } from "react";
import {
  bootstrapAgentWorkspace,
  createAgentThread,
  fetchItineraryDraft,
  fetchThreadMessages,
  sendMessage,
  uploadChatImages,
  updateAgentThreadTitle,
} from "../lib/api/index.js";

function createPlanningContext(type, id) {
  if (!id || (type !== "trip" && type !== "draft")) return null;
  return { type, id };
}

function createRunTargetKey(context) {
  if (!context?.type || !context?.id) return null;
  return `${context.type}:${context.id}`;
}

function toUiRole(role) {
  if (role === "USER") return "user";
  if (role === "ASSISTANT") return "assistant";
  return "system";
}

export function isLikelyItineraryAssistantContent(content) {
  const text = String(content ?? "").trim();
  if (!text) return false;

  return (
    /\bitinerary draft\b/i.test(text) ||
    /\bitinerary title\s*:/i.test(text) ||
    /\btrip title\s*:/i.test(text) ||
    /(^|\n)\s*#{1,4}\s*day\s+\d+\b/i.test(text) ||
    /(^|\n)\s*day\s+\d+\s*[–\-:]/i.test(text) ||
    /\|\s*(time|order)\s*\|\s*(activity|description)/i.test(text)
  );
}

function normalizeMessagesArray(rawMessages, itineraryId = null) {
  const normalized = Array.isArray(rawMessages)
    ? rawMessages
      .filter((message) => message?.role === "USER" || message?.role === "ASSISTANT")
      .map((message) => ({
        id: message.id,
        role: toUiRole(message.role),
        content: message.content,
        ...(message.itineraryId ? { itineraryId: message.itineraryId } : {}),
        ...(message.metadata?.itineraryId ? { metadata: { itineraryId: message.metadata.itineraryId } } : {}),
        ...(message.metadata?.process ? { process: message.metadata.process } : {}),
      }))
    : [];

  const targetItineraryId = String(itineraryId ?? "").trim();
  if (!targetItineraryId) return normalized;

  for (let index = normalized.length - 1; index >= 0; index -= 1) {
    const message = normalized[index];
    if (message?.role === "assistant" && isLikelyItineraryAssistantContent(message.content)) {
      return normalized.map((item, itemIndex) => (
        itemIndex === index ? { ...item, itineraryId: targetItineraryId } : item
      ));
    }
  }

  return normalized;
}

export function normalizeThreadMessages(thread, itineraryId = null) {
  return normalizeMessagesArray(
    thread?.messages,
    itineraryId ?? thread?.itineraryId ?? null,
  );
}

function getThreadTripId(thread) {
  return thread?.tripId ?? thread?.trip?.id ?? thread?.context?.tripId ?? thread?.metadata?.tripId ?? null;
}

// Fallback for thread responses that still ship events (createAgentThread POST,
// fetchAgentThread GET). The bootstrap endpoint provides thread.itineraryId
// directly, so loadInitialThreads no longer needs to walk events.
function getThreadItineraryIdFromEvents(thread) {
  if (thread?.itineraryId) return thread.itineraryId;
  const events = Array.isArray(thread?.events) ? thread.events : [];
  const itineraryUpdateEvent = [...events]
    .reverse()
    .find((event) => (event?.type === "itinerary.updated" || event?.type === "itinerary.created") && event?.payload?.itineraryId);
  return itineraryUpdateEvent?.payload?.itineraryId ?? null;
}

function normalizeItineraryResponse(responseData) {
  return responseData?.itinerary ?? responseData ?? null;
}

function normalizeDraftThreadState(thread, itinerary = null) {
  if (!thread?.id) return null;

  const itineraryId = getThreadItineraryIdFromEvents(thread);

  return {
    threadId: thread.id,
    title: String(thread.title ?? thread.name ?? "").trim(),
    tripId: null,
    messages: normalizeThreadMessages(thread, itineraryId),
    itinerary,
    loaded: true,
    createdAt: thread.createdAt ?? null,
  };
}

async function hydrateContext(agencyId, threadId, itineraryId) {
  const [messagesResult, itineraryResult] = await Promise.all([
    fetchThreadMessages(agencyId, threadId, { limit: 50 }),
    itineraryId ? fetchItineraryDraft(agencyId, itineraryId) : Promise.resolve(null),
  ]);
  const rawMessages = Array.isArray(messagesResult?.messages) ? messagesResult.messages : [];
  // Server returns DESC (newest first); UI renders ASC.
  const ascending = [...rawMessages].reverse();
  const itinerary = itineraryResult ? normalizeItineraryResponse(itineraryResult) : null;
  return {
    messages: normalizeMessagesArray(ascending, itineraryId),
    itinerary,
    nextCursor: messagesResult?.nextCursor ?? null,
  };
}

export function useTripPlanning(agencyId) {
  const [activeContext, setActiveContext] = useState(null);
  const [tripStates, setTripStates] = useState({});
  const [draftThreadStates, setDraftThreadStates] = useState({});
  const [draftThreadOrder, setDraftThreadOrder] = useState([]);
  const [bootstrapTrips, setBootstrapTrips] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isCreatingDraftThread, setIsCreatingDraftThread] = useState(false);
  const [agentError, setAgentError] = useState("");

  const activeContextRef = useRef(activeContext);
  const tripStatesRef = useRef(tripStates);
  const draftThreadStatesRef = useRef(draftThreadStates);
  const tripStatePromisesRef = useRef(new Map());
  const draftStatePromisesRef = useRef(new Map());
  const hasLoadedInitialThreadRef = useRef(false);
  const loadInitialThreadsPromiseRef = useRef(null);
  const runTargetRef = useRef(null);

  useEffect(() => {
    activeContextRef.current = activeContext;
  }, [activeContext]);

  useEffect(() => {
    tripStatesRef.current = tripStates;
  }, [tripStates]);

  useEffect(() => {
    draftThreadStatesRef.current = draftThreadStates;
  }, [draftThreadStates]);

  const ensureTripThreadState = async (tripId) => {
    if (!agencyId || !tripId) return null;

    // Wait for any in-flight bootstrap so we don't create a duplicate thread for
    // a trip whose thread is about to be populated from the bootstrap response.
    if (loadInitialThreadsPromiseRef.current) {
      await loadInitialThreadsPromiseRef.current.catch(() => null);
    }

    const existingState = tripStatesRef.current[tripId];
    if (existingState?.loaded) return existingState;

    const pending = tripStatePromisesRef.current.get(tripId);
    if (pending) return pending;

    const promise = (async () => {
      let threadId = existingState?.threadId ?? null;
      let itineraryId = existingState?.itinerary?.id ?? null;

      if (!threadId) {
        const createdResult = await createAgentThread(agencyId, tripId);
        const thread = createdResult?.thread ?? null;
        if (!thread?.id) return null;
        threadId = thread.id;
        itineraryId = itineraryId ?? getThreadItineraryIdFromEvents(thread);
      }

      const hydrated = await hydrateContext(agencyId, threadId, itineraryId);
      const nextState = {
        threadId,
        messages: hydrated.messages,
        itinerary: hydrated.itinerary ?? existingState?.itinerary ?? null,
        loaded: true,
      };

      setTripStates((previous) => ({
        ...previous,
        [tripId]: nextState,
      }));

      return nextState;
    })();

    tripStatePromisesRef.current.set(tripId, promise);

    try {
      return await promise;
    } finally {
      tripStatePromisesRef.current.delete(tripId);
    }
  };

  const ensureDraftThreadState = async (draftId) => {
    if (!agencyId || !draftId) return null;
    if (String(draftId).startsWith("pending-")) return null;

    if (loadInitialThreadsPromiseRef.current) {
      await loadInitialThreadsPromiseRef.current.catch(() => null);
    }

    const existingState = draftThreadStatesRef.current[draftId];
    if (existingState?.loaded) return existingState;
    if (!existingState?.threadId) return null;

    const pending = draftStatePromisesRef.current.get(draftId);
    if (pending) return pending;

    const promise = (async () => {
      const itineraryId = existingState?.itinerary?.id ?? null;
      const hydrated = await hydrateContext(agencyId, existingState.threadId, itineraryId);
      const nextState = {
        ...existingState,
        messages: hydrated.messages,
        itinerary: hydrated.itinerary ?? existingState.itinerary ?? null,
        loaded: true,
      };
      setDraftThreadStates((previous) => ({
        ...previous,
        [draftId]: nextState,
      }));
      return nextState;
    })();

    draftStatePromisesRef.current.set(draftId, promise);

    try {
      return await promise;
    } finally {
      draftStatePromisesRef.current.delete(draftId);
    }
  };

  const createDraftThread = async () => {
    if (!agencyId) return null;

    setIsCreatingDraftThread(true);
    try {
      const createdResult = await createAgentThread(agencyId);
      const thread = createdResult?.thread ?? null;
      if (!thread?.id) return null;

      const itineraryId = getThreadItineraryIdFromEvents(thread);
      const itineraryResult = itineraryId ? await fetchItineraryDraft(agencyId, itineraryId) : null;
      const itinerary = itineraryResult ? normalizeItineraryResponse(itineraryResult) : null;
      const nextState = normalizeDraftThreadState(thread, itinerary);
      if (!nextState) return null;

      setDraftThreadStates((previous) => ({
        ...previous,
        [thread.id]: nextState,
      }));
      setDraftThreadOrder((previous) => [thread.id, ...previous.filter((id) => id !== thread.id)]);

      return nextState;
    } finally {
      setIsCreatingDraftThread(false);
    }
  };

  const loadInitialThreads = async () => {
    if (!agencyId) return null;
    if (hasLoadedInitialThreadRef.current) {
      return loadInitialThreadsPromiseRef.current ?? null;
    }
    hasLoadedInitialThreadRef.current = true;

    const promise = (async () => {
      try {
        const result = await bootstrapAgentWorkspace(agencyId);
      const trips = Array.isArray(result?.trips) ? result.trips : [];
      const threads = Array.isArray(result?.threads) ? result.threads.filter((t) => t?.id) : [];
      const summaries = (result?.itinerarySummaries && typeof result.itinerarySummaries === "object")
        ? result.itinerarySummaries
        : {};

      setBootstrapTrips(trips);

      if (threads.length === 0) return;

      const nextTripStates = {};
      const nextDraftStates = {};
      const nextDraftOrder = [];
      let fallbackContext = null;

      for (const thread of threads) {
        const tripId = getThreadTripId(thread);
        const itineraryId = thread.itineraryId ?? null;
        const itinerarySummary = itineraryId ? (summaries[itineraryId] ?? null) : null;

        if (tripId) {
          nextTripStates[tripId] = {
            threadId: thread.id,
            messages: [],
            itinerary: itinerarySummary,
            loaded: false,
            createdAt: thread.createdAt ?? null,
            status: thread.status ?? null,
          };
          fallbackContext ??= createPlanningContext("trip", tripId);
          continue;
        }

        nextDraftStates[thread.id] = {
          threadId: thread.id,
          title: String(thread.title ?? "").trim(),
          tripId: null,
          messages: [],
          itinerary: itinerarySummary,
          loaded: false,
          createdAt: thread.createdAt ?? null,
          status: thread.status ?? null,
        };
        nextDraftOrder.push(thread.id);
        fallbackContext ??= createPlanningContext("draft", thread.id);
      }

      if (Object.keys(nextTripStates).length > 0) {
        // Update the ref synchronously so ensureTripThreadState (which awaits
        // this promise) can see bootstrap-populated threadIds without waiting
        // for the React commit + tripStatesRef-syncing useEffect.
        tripStatesRef.current = { ...tripStatesRef.current, ...nextTripStates };
        setTripStates((previous) => ({ ...previous, ...nextTripStates }));
      }

      if (Object.keys(nextDraftStates).length > 0) {
        draftThreadStatesRef.current = { ...draftThreadStatesRef.current, ...nextDraftStates };
        setDraftThreadStates((previous) => ({ ...previous, ...nextDraftStates }));
        setDraftThreadOrder((previous) => {
          const existing = previous.filter((threadId) => !nextDraftOrder.includes(threadId));
          return [...nextDraftOrder, ...existing];
        });
      }

      if (!activeContextRef.current && fallbackContext) {
        setActiveContext(fallbackContext);
      }
      } catch (error) {
        console.error("Failed to bootstrap agent workspace", error);
      }
    })();
    loadInitialThreadsPromiseRef.current = promise;
    return promise;
  };

  const dispatchMessage = async (content, startStream, imageFiles = []) => {
    if (!agencyId) {
      setAgentError("Missing agency context. Refresh and log in again.");
      return;
    }
    const cleanContent = content.trim();
    const hasImages = Array.isArray(imageFiles) && imageFiles.length > 0;
    if ((!cleanContent && !hasImages) || isSending) return;

    setAgentError("");
    setIsSending(true);

    try {
      let currentContext = activeContextRef.current;
      let ensuredState = null;

      if (!currentContext || (currentContext.type === "draft" && String(currentContext.id).startsWith("pending-"))) {
        ensuredState = await createDraftThread();
        currentContext = createPlanningContext("draft", ensuredState?.threadId ?? null);
        setActiveContext(currentContext);
      } else if (currentContext.type === "draft") {
        ensuredState = (await ensureDraftThreadState(currentContext.id))
          ?? draftThreadStatesRef.current[currentContext.id]
          ?? null;
      } else {
        ensuredState = await ensureTripThreadState(currentContext.id);
      }

      const currentThreadId = ensuredState?.threadId;
      if (!currentThreadId) throw new Error("Failed to create agent thread.");

      runTargetRef.current = createRunTargetKey(currentContext);

      // Upload images to Cloudinary (if any) before sending the message.
      let imageUrls = [];
      if (hasImages) {
        try {
          const uploadResult = await uploadChatImages(agencyId, currentThreadId, imageFiles);
          imageUrls = (uploadResult.images || []).map((img) => img.url);
        } catch (uploadError) {
          console.error("Failed to upload images", uploadError);
          setAgentError("Failed to upload images. Please try again.");
          setIsSending(false);
          return;
        }
      }

      // Optimistic update
      const messageContent = cleanContent || (hasImages ? "Sent image(s)" : "");
      const metadata = imageUrls.length > 0 ? { imageUrls } : undefined;
      const message = { id: `user-${Date.now()}`, role: "user", content: messageContent, metadata };
      if (currentContext.type === "draft") {
        setDraftThreadStates((prev) => ({
          ...prev,
          [currentContext.id]: {
            ...(prev[currentContext.id] || {}),
            messages: [...(prev[currentContext.id]?.messages || []), message],
          },
        }));
      } else {
        setTripStates((prev) => ({
          ...prev,
          [currentContext.id]: {
            ...(prev[currentContext.id] || {}),
            messages: [...(prev[currentContext.id]?.messages || []), message],
          },
        }));
      }

      const sendResult = await sendMessage(agencyId, currentThreadId, messageContent, imageUrls);
      const runId = sendResult?.runId || sendResult?.run?.id;
      if (runId && startStream) startStream(runId);
    } catch (error) {
      console.error("Failed to send agent message", error);
      setAgentError(error?.message || "Unable to send your request to Voyage Agent.");
    } finally {
      setIsSending(false);
    }
  };

  const renameThread = async (threadId, nextTitle) => {
    if (!agencyId || !threadId || !nextTitle?.trim()) return;
    const trimmed = nextTitle.trim();
    // optimistic update — search drafts then trips
    let didOptimisticUpdate = false;
    setDraftThreadStates((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (next[id]?.threadId === threadId) {
          next[id] = { ...next[id], title: trimmed };
          didOptimisticUpdate = true;
        }
      }
      return didOptimisticUpdate ? next : prev;
    });
    if (!didOptimisticUpdate) {
      setTripStates((prev) => {
        const next = { ...prev };
        for (const id of Object.keys(next)) {
          if (next[id]?.threadId === threadId) {
            next[id] = { ...next[id], title: trimmed };
          }
        }
        return next;
      });
    }
    try {
      await updateAgentThreadTitle(agencyId, threadId, trimmed);
    } catch (e) {
      console.error("rename failed", e);
      setAgentError(e?.message || "Failed to rename thread.");
    }
  };

  return {
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
    createDraftThread,
    loadInitialThreads,
    dispatchMessage,
    createPlanningContext,
    createRunTargetKey,
    renameThread,
  };
}
