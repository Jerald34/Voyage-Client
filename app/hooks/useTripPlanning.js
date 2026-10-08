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
import { normalizeTravelerNeeds } from "../lib/accessibility/travelerNeeds.js";

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
        // Keep all of it: the chat reads ask_user questions and answers, and user images, from here.
        ...(message.metadata && typeof message.metadata === "object" ? { metadata: message.metadata } : {}),
        ...(message.metadata?.process ? { process: message.metadata.process } : {}),
      }))
    : [];

  // The server links each reply to the itinerary its run touched, the same replies the
  // live run tagged. Guess from the reply text only for a server that sends no link.
  if (normalized.some((message) => message.itineraryId || message.metadata?.itineraryId)) {
    return normalized;
  }

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
    travelerNeeds: normalizeTravelerNeeds(thread.travelerNeeds),
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
        travelerNeeds: existingState?.travelerNeeds ?? null,
      };

      // Merge inside the setter: a needs edit made while the thread was hydrating lives in the
      // current entry, not in the snapshot taken before the await, and must win.
      setTripStates((previous) => ({
        ...previous,
        [tripId]: { ...nextState, travelerNeeds: previous[tripId]?.travelerNeeds ?? nextState.travelerNeeds },
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
      // Same as trips: the current entry's needs win over the pre-await snapshot.
      setDraftThreadStates((previous) => ({
        ...previous,
        [draftId]: { ...nextState, travelerNeeds: previous[draftId]?.travelerNeeds ?? nextState.travelerNeeds },
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
            travelerNeeds: normalizeTravelerNeeds(thread.travelerNeeds),
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
          travelerNeeds: normalizeTravelerNeeds(thread.travelerNeeds),
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

  // Replace a context's messages with the server's copy, e.g. after an answer was
  // refused because its question had already been answered in another tab.
  const reloadThreadMessages = async (context, threadId) => {
    try {
      const result = await fetchThreadMessages(agencyId, threadId, { limit: 50 });
      // Server returns DESC (newest first); UI renders ASC.
      const ascending = [...(Array.isArray(result?.messages) ? result.messages : [])].reverse();
      const states = context.type === "draft" ? draftThreadStatesRef.current : tripStatesRef.current;
      const messages = normalizeMessagesArray(ascending, states[context.id]?.itinerary?.id ?? null);
      const applyMessages = (prev) => ({
        ...prev,
        [context.id]: { ...(prev[context.id] || {}), messages },
      });
      if (context.type === "draft") setDraftThreadStates(applyMessages);
      else setTripStates(applyMessages);
    } catch (reloadError) {
      console.error("Failed to reload thread messages", reloadError);
    }
  };

  // Resolves to { sent, contextId, threadId } so callers can track what reached the server.
  // `answers` (from buildAnswer) marks the message as the reply to ask_user questions.
  const dispatchMessage = async (content, startStream, imageFiles = [], travelerNeeds = null, { answers = null } = {}) => {
    const outcome = { sent: false, contextId: null, threadId: null };
    let sendContext = null;
    let optimisticAnswerId = null;
    if (!agencyId) {
      setAgentError("Missing agency context. Refresh and log in again.");
      return outcome;
    }
    const cleanContent = content.trim();
    const hasImages = Array.isArray(imageFiles) && imageFiles.length > 0;
    if ((!cleanContent && !hasImages) || isSending) return outcome;

    setAgentError("");
    setIsSending(true);

    try {
      let currentContext = activeContextRef.current;
      let ensuredState = null;

      if (!currentContext || (currentContext.type === "draft" && String(currentContext.id).startsWith("pending-"))) {
        ensuredState = await createDraftThread();
        currentContext = createPlanningContext("draft", ensuredState?.threadId ?? null);
        // Without a thread, stay on the pending context: replacing it would drop the needs chosen for it.
        if (ensuredState?.threadId) setActiveContext(currentContext);
      } else if (currentContext.type === "draft") {
        ensuredState = (await ensureDraftThreadState(currentContext.id))
          ?? draftThreadStatesRef.current[currentContext.id]
          ?? null;
      } else {
        ensuredState = await ensureTripThreadState(currentContext.id);
      }

      const currentThreadId = ensuredState?.threadId;
      if (!currentThreadId) throw new Error("Failed to create agent thread.");
      outcome.contextId = currentContext.id;
      outcome.threadId = currentThreadId;
      sendContext = currentContext;

      // Persist the chosen needs on the thread as soon as it exists. The chips
      // (and HomePage's pending-needs hand-off) key off this, so it must not
      // wait for the image upload, which can fail and return early.
      if (travelerNeeds) {
        const needsPatch = { travelerNeeds };
        const applyNeeds = (prev) => ({
          ...prev,
          [currentContext.id]: { ...(prev[currentContext.id] || {}), ...needsPatch },
        });
        if (currentContext.type === "draft") setDraftThreadStates(applyNeeds);
        else setTripStates(applyNeeds);
      }

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
          return outcome;
        }
      }

      // Optimistic update
      const messageContent = cleanContent || (hasImages ? "Sent image(s)" : "");
      const metadata = {
        ...(imageUrls.length > 0 ? { imageUrls } : {}),
        ...(answers ? { answers: answers.display } : {}),
      };
      const message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: messageContent,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      };
      if (answers) optimisticAnswerId = message.id;
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

      const sendResult = answers
        ? await sendMessage(agencyId, currentThreadId, messageContent, imageUrls, travelerNeeds, answers.request)
        : await sendMessage(agencyId, currentThreadId, messageContent, imageUrls, travelerNeeds);
      outcome.sent = true;
      const runId = sendResult?.runId || sendResult?.run?.id;
      if (runId && startStream) startStream(runId);
    } catch (error) {
      console.error("Failed to send agent message", error);
      setAgentError(error?.message || "Unable to send your request to Voyage Agent.");
      // The question closed elsewhere (another tab answered it): show the server's copy.
      if (answers && error?.code === "QUESTION_NOT_PENDING" && sendContext && outcome.threadId) {
        await reloadThreadMessages(sendContext, outcome.threadId);
      } else if (optimisticAnswerId && sendContext) {
        // Any other failure: take the answer back so the question returns to be answered again.
        const dropAnswer = (prev) => ({
          ...prev,
          [sendContext.id]: {
            ...(prev[sendContext.id] || {}),
            messages: (prev[sendContext.id]?.messages || []).filter((item) => item.id !== optimisticAnswerId),
          },
        });
        if (sendContext.type === "draft") setDraftThreadStates(dropAnswer);
        else setTripStates(dropAnswer);
      }
    } finally {
      setIsSending(false);
    }
    return outcome;
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
