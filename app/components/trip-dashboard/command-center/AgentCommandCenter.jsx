import { useEffect, useMemo, useRef, useState } from "react";
import ClientSwitcher from "./ClientSwitcher.jsx";
import ChatMessage from "./ChatMessage.jsx";
import ChatInput from "./ChatInput.jsx";
import RichItineraryMessage from "./RichItineraryMessage.jsx";
import useImageAttachments from "../../../hooks/useImageAttachments.js";
import { toolToActiveLabel, summarize, activeLabelFor } from "../../agent/process-bubble/processBubbleLabels.js";
import ReuseSlashCommand from "../../ratedHistory/entryPoints/ReuseSlashCommand.jsx";

function getInitials(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "VP";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const EMPTY_ARRAY = Object.freeze([]);

export default function AgentCommandCenter({
  messages,
  isStreaming,
  assistantMessage,
  toolCalls,
  thoughtEntries,
  tasks = [],
  tasksTouchedThisRun = new Set(),
  dispatchAgentMessage,
  composerInput,
  setComposerInput,
  isSending,
  agentError,
  user,
  itinerary = null,
  streamingItinerary = null,
  placeEntities = [],
  selectedPlaceId = "",
  onPlaceSelect,
  onStop,
  hideChatInput = false,
  // Ref passed in from parent — AgentCommandCenter writes the latest process
  // snapshot here so useAgentStreamOrchestration can attach it to the committed
  // message without requiring additional prop threading.
  processSnapshotRef = null,
  // Stage 6C — Rated-history slash command (`/reuse`).
  // All four are required for the slash command to render; if any are missing
  // we simply don't mount it (no crash). The parent page wires these.
  tripId = null,
  agencyId = null,
  targetItineraryId = null,
  currentVersion = null,
  // Optional — used by the slash command to compute the default insertion
  // anchor (end of itinerary). Falls back gracefully when null.
  targetItinerary = null,
  // Optional — invoked by the slash command after successful insertion to
  // post a SYSTEM_VISIBLE message into the thread. The parent page is
  // responsible for appending the message to its messages state without
  // dispatching an agent run.
  onSystemVisibleMessage = null,
  // Optional — forwarded to the slash command so the parent can refresh
  // the itinerary view after a successful insertion.
  onReuseInserted = null,
}) {
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const imageAttachments = useImageAttachments();
  const streamStartTimeRef = useRef(null);
  const [openStates, setOpenStates] = useState(() => new Map());

  const displayedMessages = useMemo(() => {
    if (!Array.isArray(messages) || messages.length === 0) {
      return EMPTY_ARRAY;
    }
    return messages.slice(-12);
  }, [messages]);


  const liveStreamingItinerary = streamingItinerary ?? null;
  // Render the streaming bubble as soon as a run is active so the user sees the
  // ProcessBubble immediately on send — not only after the first reply delta arrives.
  // Guard against the brief commit-transition window where the committed message
  // already mirrors assistantMessage.
  const hasStreamingBubble =
    isStreaming &&
    displayedMessages[displayedMessages.length - 1]?.content !== assistantMessage;

  const liveProcess = useMemo(() => {
    if (!isStreaming) return null;
    const toolEntries = Array.isArray(toolCalls)
      ? toolCalls.map((call, i) => ({ id: `tool-${i}`, kind: "tool", name: call.name ?? "" }))
      : [];
    const thoughts = Array.isArray(thoughtEntries) ? thoughtEntries : [];

    // Interleave thoughts and tools by precedingToolCount:
    // For each tool index i, emit thoughts where precedingToolCount === i, then emit tool i.
    // After the last tool, emit any trailing thoughts.
    const timeline = [];
    for (let i = 0; i < toolEntries.length; i++) {
      for (const thought of thoughts) {
        if (thought.precedingToolCount === i) {
          timeline.push({ id: thought.id, kind: "thought", text: thought.text });
        }
      }
      timeline.push(toolEntries[i]);
    }
    // Trailing thoughts (after all tools)
    for (const thought of thoughts) {
      if (thought.precedingToolCount === toolEntries.length) {
        timeline.push({ id: thought.id, kind: "thought", text: thought.text });
      }
    }

    // Build task entries for tasks touched during this run and append to timeline.
    // tasksTouchedThisRunRef is a ref (not state), but this memo re-runs whenever
    // `tasks` state changes — which fires on every task.updated SSE event — so
    // the filtered list stays current without explicit ref subscription.
    const touchedTasks = Array.isArray(tasks)
      ? tasks.filter(t => tasksTouchedThisRun.has(t.id))
      : [];

    const taskEntries = touchedTasks.map(t => ({
      id: t.id,
      kind: "task",
      status: t.status,
      label: t.label,
      updatedAt: t.updatedAt ?? null,
    }));

    // Append task entries — they bookend the tool/thought flow chronologically.
    // SSE arrival order is preserved by the array order of `tasks`.
    for (const taskEntry of taskEntries) {
      timeline.push(taskEntry);
    }

    const activeLabel = activeLabelFor(timeline);

    return {
      status: "live",
      activeLabel,
      timeline,
      durationMs: null,
      // Default OPEN during live streaming so the user can see thoughts as they arrive.
      // Respect the user's explicit collapse — only honored via openStates entry.
      defaultOpen: openStates.get("streaming") ?? true,
    };
  }, [isStreaming, toolCalls, thoughtEntries, tasks, tasksTouchedThisRun, openStates]);

  const userName = user?.displayName || "You";
  const userInitials = getInitials(userName);
  const itineraryId = itinerary?.id != null ? String(itinerary.id) : null;

  function shouldRenderMessageAsItinerary(message) {
    if (!itineraryId || message?.role !== "assistant") return false;
    return String(message?.itineraryId ?? "") === itineraryId || String(message?.metadata?.itineraryId ?? "") === itineraryId;
  }

  const prevMessageCountRef = useRef(messages?.length ?? 0);
  const prevItemCountRef = useRef(0);

  // Keep a ref to the latest liveProcess so the commit effect can read it after
  // isStreaming flips to false (at which point liveProcess will be null).
  const liveProcessRef = useRef(null);
  useEffect(() => {
    if (liveProcess != null) {
      liveProcessRef.current = liveProcess;
    }
  }, [liveProcess]);

  // Record stream start time when streaming begins, and reset any stale
  // "streaming" entry in openStates so the new run starts with defaultOpen
  // semantics (open by default).
  useEffect(() => {
    if (isStreaming) {
      streamStartTimeRef.current = Date.now();
      setOpenStates(prev => {
        if (!prev.has("streaming")) return prev;
        const next = new Map(prev);
        next.delete("streaming");
        return next;
      });
    }
  }, [isStreaming]);

  // When streaming ends, compute the committed process snapshot and write it
  // to the parent-supplied processSnapshotRef so the stream-commit hook can
  // attach it to the message object.
  useEffect(() => {
    if (!isStreaming && processSnapshotRef != null) {
      const timeline = liveProcessRef.current?.timeline ?? [];
      const durationMs = streamStartTimeRef.current != null
        ? Date.now() - streamStartTimeRef.current
        : null;
      const touchedTasks = Array.isArray(tasks)
        ? tasks.filter(t => tasksTouchedThisRun.has(t.id))
        : [];
      processSnapshotRef.current = {
        status: "done",
        activeLabel: summarize(timeline, durationMs ?? 0),
        timeline,
        tasks: touchedTasks.map(t => ({ id: t.id, label: t.label, status: t.status })),
        durationMs,
        defaultOpen: false,
      };
      streamStartTimeRef.current = null;
    }
  }, [isStreaming, processSnapshotRef, tasks, tasksTouchedThisRun]);

  // Scroll when messages arrive or text streams in
  useEffect(() => {
    const currentCount = messages?.length ?? 0;
    const isNewMessage = currentCount > prevMessageCountRef.current;
    prevMessageCountRef.current = currentCount;

    const shouldScroll = isNewMessage
      || (isStreaming && assistantMessage)
      || (isStreaming && liveProcess != null);

    if (shouldScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages?.length, isStreaming, assistantMessage, liveProcess?.timeline?.length]);

  function handleProcessToggle(msgId, isOpen) {
    setOpenStates(prev => new Map(prev).set(msgId, isOpen));
  }

  // Scroll when itinerary grows card-by-card
  useEffect(() => {
    if (!streamingItinerary?.days) return;
    const count = streamingItinerary.days.reduce(
      (sum, d) => sum + (Array.isArray(d.items) ? d.items.length : 0),
      0,
    );
    if (count > prevItemCountRef.current) {
      prevItemCountRef.current = count;
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamingItinerary]);

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const hasContent = composerInput.trim() || imageAttachments.hasAttachments;
      if (hasContent && !isSending) {
        submitComposer(event);
      }
    }
  }

  function submitComposer(event) {
    event.preventDefault();
    const hasContent = composerInput.trim() || imageAttachments.hasAttachments;
    if (!hasContent) return;
    // Pass image URLs (will be [] if no attachments); the parent handles upload
    void dispatchAgentMessage(composerInput, imageAttachments.attachments.map((a) => a.file));
    setComposerInput("");
    imageAttachments.clear();
  }

  // Mask gradient softens both edges of the scroll area so chat messages
  // dissolve into the chrome instead of meeting the chat input with a hard line.
  // Bottom fade is larger because that's where the floating input sits.
  const scrollMaskStyle = hideChatInput
    ? undefined
    : {
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0, black 16px, black calc(100% - 56px), transparent 100%)",
        maskImage:
          "linear-gradient(to bottom, transparent 0, black 16px, black calc(100% - 56px), transparent 100%)",
      };

  return (
    <div className={`${hideChatInput ? "" : "glass-panel backdrop-blur-[24px] shadow-strong"} relative p-4 flex flex-col min-h-0 h-full transition-all duration-500 ease-in-out`}>

      {/* chat log */}
      <div
        className={`flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-5 pr-2 ${hideChatInput ? "mb-0" : "pb-[120px]"}`}
        style={scrollMaskStyle}
      >
        {displayedMessages.length === 0 ? (
          <div className="grid gap-2.5 place-items-center min-h-[220px] text-center text-text-muted">
            <div className="w-12 h-12 rounded-[16px] bg-background flex items-center justify-center text-text-soft mb-2" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <strong>No conversation yet</strong>
            <p>Ask the agent to create the first draft, tighten the route, or prepare a client-ready revision.</p>
          </div>
        ) : (
          displayedMessages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isUser={message.role === "user"}
              userName={userName}
              userInitials={userInitials}
              itinerary={itinerary}
              renderAsItinerary={shouldRenderMessageAsItinerary(message)}
              placeEntities={placeEntities}
              selectedPlaceId={selectedPlaceId}
              onPlaceSelect={onPlaceSelect}
              onEdit={message.role === "user" ? (content) => setComposerInput(content) : undefined}
              process={message.process ?? null}
              onProcessToggle={message.process ? (isOpen) => handleProcessToggle(message.id, isOpen) : undefined}
            />
          ))
        )}

        {hasStreamingBubble && (
          <ChatMessage
            message={{
              id: "streaming",
              role: "assistant",
              // Empty content while the reply text hasn't started streaming yet —
              // ChatMessage skips the body (and the divider in ChatMessage skips
              // itself when content is empty), so only the ProcessBubble shows.
              content: assistantMessage || ""
            }}
            isUser={false}
            userName={userName}
            userInitials={userInitials}
            itinerary={liveStreamingItinerary ?? itinerary}
            renderAsItinerary={Boolean(liveStreamingItinerary?.id)}
            placeEntities={placeEntities}
            selectedPlaceId={selectedPlaceId}
            onPlaceSelect={onPlaceSelect}
            process={liveProcess}
            onProcessToggle={(isOpen) => handleProcessToggle("streaming", isOpen)}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {!hideChatInput && (
        <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
          <div className="pointer-events-auto relative">
            {/* Stage 6C — slash-command observer. Renders nothing unless the
                composer matches `/^\/[a-z]*$/i`. Mounts whenever an agency is
                active; in a draft (no saved trip) it shows a "save first" hint
                instead of opening the picker or leaking `/reuse` to the agent. */}
            {agencyId && (
              <ReuseSlashCommand
                composerInput={composerInput}
                setComposerInput={setComposerInput}
                textareaRef={textareaRef}
                tripId={tripId}
                agencyId={agencyId}
                targetItineraryId={targetItineraryId}
                currentVersion={currentVersion}
                targetItinerary={targetItinerary ?? itinerary}
                currentTrip={itinerary ? { destinationSummary: itinerary.destinationSummary ?? null } : null}
                onSystemVisibleMessage={onSystemVisibleMessage}
                onInserted={onReuseInserted}
              />
            )}
            <ChatInput
          textareaRef={textareaRef}
          composerInput={composerInput}
          setComposerInput={setComposerInput}
          handleKeyDown={handleKeyDown}
          submitComposer={submitComposer}
          isSending={isSending || isStreaming}
          agentError={agentError}
          onStop={onStop}
          attachments={imageAttachments.attachments}
          onAddFiles={imageAttachments.addFiles}
          onRemoveAttachment={imageAttachments.removeAttachment}
          fileInputRef={imageAttachments.fileInputRef}
        />
          </div>
        </div>
      )}

    </div>
  );
}
