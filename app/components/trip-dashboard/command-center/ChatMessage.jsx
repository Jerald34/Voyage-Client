import React from "react";
import AgentMarkdown from "../../agent/chat/AgentMarkdown";
import { getMatchedPlaces, matchPlaceMentions, getItineraryPlaceEntityId } from "../../../lib/trip-dashboard/placeEntities.js";
import RichItineraryMessage from "./RichItineraryMessage.jsx";
import useMobileViewport from "../mobile/useMobileViewport.js";
import CompactPlaceCard from "../mobile/CompactPlaceCard.jsx";
import MessageImageGrid from "../../chat/MessageImageGrid";
import ProcessBubble from "../../agent/process-bubble/ProcessBubble.jsx";
import { answerText, getAnswers, getAskUser } from "../../../lib/agent/askUser.js";

function PlaceLinkedText({ children, placeEntities, selectedPlaceId, onPlaceSelect }) {
  if (typeof children !== "string" && typeof children !== "number") {
    return <>{children}</>;
  }

  const content = String(children ?? "");
  const segments = matchPlaceMentions(content, placeEntities);

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type !== "place") {
          return <React.Fragment key={`text-${index}`}>{segment.text}</React.Fragment>;
        }

        const isSelected = segment.place.id === selectedPlaceId;
        return (
          <button
            key={`${segment.place.id}-${index}`}
            type="button"
            className={`inline px-1 py-0.5 mx-0.5 rounded-sm text-secondary font-semibold underline decoration-secondary/40 underline-offset-2 hover:bg-secondary/10 hover:decoration-secondary transition-colors cursor-pointer ${isSelected ? "bg-secondary/15 decoration-secondary" : ""}`}
            onClick={() => onPlaceSelect?.(segment.place.id)}
            aria-label={`Show ${segment.place.name} on map`}
          >
            {segment.text}
          </button>
        );
      })}
    </>
  );
}

function PlaceCards({ places, selectedPlaceId, onPlaceSelect }) {
  if (!Array.isArray(places) || places.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-3" aria-label="Places mentioned">
      {places.map((place) => (
        <button
          key={place.id}
          type="button"
          className={`flex items-center gap-2 px-3 py-2 rounded-md border text-left text-xs transition-colors cursor-pointer ${
            place.id === selectedPlaceId
              ? "bg-secondary/15 border-secondary text-text-primary"
              : "bg-surface border-border/20 text-text-muted hover:bg-secondary/5 hover:border-secondary/40"
          }`}
          onClick={() => onPlaceSelect?.(place.id)}
          aria-label={`Focus ${place.name} on map`}
        >
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-white text-[10px] font-bold flex-shrink-0" aria-hidden="true">
            {place.source === "live" ? "*" : String((place.itineraryIndex ?? 0) + 1)}
          </span>
          <span className="flex flex-col gap-0.5 min-w-0">
            <strong className="text-text-primary text-xs truncate">{place.name}</strong>
            {place.formattedAddress ? <span className="text-text-soft truncate">{place.formattedAddress}</span> : null}
            {place.dayLabel ? <small className="text-text-soft">{place.dayLabel}</small> : null}
            {place.timeLabel ? <small className="text-text-soft">{place.timeLabel}</small> : null}
          </span>
        </button>
      ))}
    </div>
  );
}

function MarkdownContent({
  content,
  placeEntities,
  selectedPlaceId,
  onPlaceSelect,
  showPlaceLinks = true,
  showPlaceCards = true,
}) {
  const matchedPlaces = showPlaceCards ? getMatchedPlaces(content, placeEntities) : [];

  const renderText = showPlaceLinks
    ? (text, key) => (
        <PlaceLinkedText
          key={key}
          placeEntities={placeEntities}
          selectedPlaceId={selectedPlaceId}
          onPlaceSelect={onPlaceSelect}
        >
          {text}
        </PlaceLinkedText>
      )
    : undefined;

  return (
    <div className="text-sm leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:mb-1 [&_strong]:font-bold [&_em]:italic [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-border/10 [&_code]:text-xs">
      <AgentMarkdown content={content} renderText={renderText} />
      <PlaceCards places={matchedPlaces} selectedPlaceId={selectedPlaceId} onPlaceSelect={onPlaceSelect} />
    </div>
  );
}

// An answer to the agent's ask_user questions: each header beside its answer.
function AnswerPairs({ answers }) {
  return (
    <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3.5 gap-y-1">
      {answers.items.map((item) => (
        <React.Fragment key={item.questionId}>
          <dt className="text-xs font-medium text-text-muted">{item.header}</dt>
          <dd className="m-0 min-w-0 font-medium">{answerText(item)}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export default function ChatMessage({
  message,
  isUser,
  userName,
  userInitials,
  itinerary = null,
  renderAsItinerary = false,
  placeEntities = [],
  selectedPlaceId = "",
  onPlaceSelect,
  onEdit,
  process = null,
  onProcessToggle,
  // "pending" | "answered" | "skipped" when this reply asked ask_user questions.
  askUserStatus = null,
}) {
  const shouldRenderRichItinerary = !isUser && renderAsItinerary && itinerary;
  const answers = isUser ? getAnswers(message) : null;
  const askedQuestions = isUser ? null : getAskUser(message);
  const isMobile = useMobileViewport();

  return (
    <div className={`group flex gap-3 max-w-full ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 text-[11px] font-extrabold mt-1 shadow-sm ${
          isUser ? "bg-secondary text-white" : "bg-secondary text-white"
        }`}
        aria-hidden="true"
      >
        {isUser ? (
          userInitials
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="m16 10-4 4-4-4" />
          </svg>
        )}
      </div>
      <div className={`flex flex-col gap-1.5 max-w-[85%] min-w-0 ${isUser ? "items-end" : "items-start"}`}>
        <div className={`flex items-baseline gap-2 px-1 text-[11px] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          <span className="font-bold text-text-primary">{isUser ? userName : "Voyage Agent"}</span>
          <span className="text-text-soft">{isUser ? "You" : "Agent"}</span>
          {isUser && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(message.content)}
              className="ml-1 opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-text-soft hover:text-secondary transition-all cursor-pointer border-0 bg-transparent"
              title="Edit message"
              aria-label="Edit this message"
            >
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
        </div>
        <div
          className={`px-5 py-3.5 rounded-[20px] text-sm leading-relaxed break-words w-fit max-w-full shadow-lg ${
            isUser
              ? "bg-[rgba(215,122,97,0.4)] backdrop-blur-md text-text-primary border border-border/20 rounded-br-[4px]"
              : "bg-[rgba(255,255,255,0.05)] backdrop-blur-md text-text-primary border border-border/10 rounded-bl-[4px]"
          }`}
        >
          {!isUser && process != null && (
            <ProcessBubble
              status={process.status}
              activeLabel={process.activeLabel}
              timeline={process.timeline}
              durationMs={process.durationMs}
              defaultOpen={process.defaultOpen ?? false}
              onToggle={onProcessToggle}
              msgId={message.id}
            />
          )}
          {!isUser && process != null && typeof message.content === "string" && message.content.trim().length > 0 && (
            <hr
              className="my-2.5 border-0 border-t"
              style={{ borderColor: "rgb(var(--color-border-rgb) / 0.12)" }}
              aria-hidden="true"
            />
          )}
          {isUser ? (
            answers ? (
              <AnswerPairs answers={answers} />
            ) : (
              <div>
                <p className="m-0 font-medium">{message.content}</p>
                {message.metadata?.imageUrls?.length > 0 && (
                  <MessageImageGrid imageUrls={message.metadata.imageUrls} />
                )}
              </div>
            )
          ) : renderAsItinerary && itinerary ? (
            isMobile ? (
              <div className="flex flex-col gap-2">
                {Array.isArray(itinerary.days) && itinerary.days.map((day) => (
                  <div key={day.dayNumber || day.id} className="flex flex-col gap-2">
                    <span className="text-[0.65rem] font-extrabold uppercase tracking-[0.06em] text-text-soft">
                      Day {day.dayNumber}{day.title ? ` — ${day.title}` : ""}
                    </span>
                    {(day.items || []).map((item, iIdx) => {
                      const entityId = getItineraryPlaceEntityId(item, day, iIdx);
                      return (
                        <CompactPlaceCard
                          key={`${day.dayNumber}-${iIdx}`}
                          item={item}
                          isSelected={selectedPlaceId === entityId}
                          dayNumber={day.dayNumber}
                          stopNumber={iIdx + 1}
                          onSelect={() => onPlaceSelect?.(entityId)}
                        />
                      );
                    })}
                  </div>
                ))}
                <span className="text-[0.65rem] text-text-soft mt-1">CURATED BY VOYAGE AGENT</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <RichItineraryMessage
                  itinerary={itinerary}
                  placeEntities={placeEntities}
                  selectedPlaceId={selectedPlaceId}
                  onPlaceSelect={onPlaceSelect}
                />
                {String(message?.content ?? "").trim() ? (
                  <div className="pt-3 border-t border-white/10">
                    <MarkdownContent
                      content={message.content}
                      placeEntities={placeEntities}
                      selectedPlaceId={selectedPlaceId}
                      onPlaceSelect={onPlaceSelect}
                      showPlaceLinks={false}
                      showPlaceCards={false}
                    />
                  </div>
                ) : null}
              </div>
            )
          ) : (
            <MarkdownContent
              content={message.content}
              placeEntities={placeEntities}
              selectedPlaceId={selectedPlaceId}
              onPlaceSelect={onPlaceSelect}
              showPlaceCards={false}
            />
          )}
          {askUserStatus === "skipped" && askedQuestions && (
            <p className="m-0 mt-2.5 border-t border-dashed border-border/30 pt-2 text-xs text-text-muted">
              Not answered: {askedQuestions.map((question) => question.header).join(", ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
