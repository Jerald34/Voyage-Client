import React, { useEffect, useMemo, useRef, useState } from "react";
import PlaceAdvisoryNotice from "./PlaceAdvisoryNotice.jsx";
import dynamic from "next/dynamic";
import { getItineraryPlaceEntityId } from "../../../lib/trip-dashboard/placeEntities.js";

const ItineraryLiveMap = dynamic(() => import("./ItineraryLiveMap.jsx"), { ssr: false });

function getItemTimeLabel(item) {
  if (typeof item?.time === "string" && item.time.trim()) return item.time;
  if (item?.startTime && item?.endTime) return `${item.startTime} - ${item.endTime}`;
  if (item?.startTime) return item.startTime;
  if (item?.endTime) return `Ends ${item.endTime}`;
  return "Time pending";
}

const formatDistance = (m) => (!m || m <= 0) ? null : (m >= 1000 ? `${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} km` : `${Math.round(m)} m`);
const formatDuration = (s) => {
  if (!s || s <= 0) return null;
  const mins = Math.round(s / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
};

export default function ItineraryDraftPanel({
  itinerary = null,
  draftDays,
  draftVersion,
  onContinue = () => { },
  primaryActionLabel = "Send to Client",
  dispatchAgentMessage,
  mapMarkers = [],
  routeEstimates = [],
  placeEntities = [],
  selectedPlaceId = "",
  onPlaceSelect,
  reuseDropRef,
  dockMode = false,
}) {
  const safeDays = useMemo(() => Array.isArray(itinerary?.days) ? itinerary.days : (Array.isArray(draftDays) ? draftDays : []), [itinerary, draftDays]);
  const panelTitle = itinerary?.title || "Live Itinerary";
  const panelSummary = itinerary?.summary || "";
  const latestEstimate = routeEstimates?.[routeEstimates.length - 1];

  const mapItems = useMemo(() => safeDays.reduce((acc, day) => {
    (day?.items || []).forEach((item, idx) => acc.push({
      ...item,
      __dayNumber: day?.dayNumber,
      __dayTitle: day?.title,
      __itemIndex: idx,
      __placeEntityId: getItineraryPlaceEntityId(item, day, idx),
    }));
    return acc;
  }, []), [safeDays]);
  const selectedPlace = useMemo(
    () => placeEntities.find((place) => place.id === selectedPlaceId) ?? null,
    [placeEntities, selectedPlaceId],
  );

  const [activeStopIndex, setActiveStopIndex] = useState(mapItems.length > 0 ? 0 : -1);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 60, y: 60 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Dock-mode bookkeeping: remember the user's floating position so we can
  // restore it when the picker closes and dockMode flips back to false.
  const savedPositionRef = useRef(null);
  useEffect(() => {
    if (dockMode) {
      if (savedPositionRef.current === null) {
        savedPositionRef.current = position;
      }
    } else if (savedPositionRef.current !== null) {
      setPosition(savedPositionRef.current);
      savedPositionRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dockMode]);

  // Effective position: when docked, override to the left edge.
  const effectivePosition = dockMode ? { x: 0, y: 60 } : position;

  useEffect(() => { setActiveStopIndex(mapItems.length > 0 ? 0 : -1); }, [mapItems.length]);

  useEffect(() => {
    if (!selectedPlaceId) return;
    const nextIndex = mapItems.findIndex((item) => item.__placeEntityId === selectedPlaceId);
    if (nextIndex >= 0) {
      setActiveStopIndex(nextIndex);
    }
  }, [mapItems, selectedPlaceId]);

  useEffect(() => {
    const handleMove = (e) => {
      if (!isDragging) return;
      let newX = e.clientX - dragStartPos.current.x;
      let newY = e.clientY - dragStartPos.current.y;
      if (containerRef.current) {
        const b = containerRef.current.getBoundingClientRect();
        newX = Math.max(0, Math.min(newX, b.width - 440));
        newY = Math.max(0, Math.min(newY, b.height - 80));
      }
      setPosition({ x: newX, y: newY });
    };
    const handleUp = () => setIsDragging(false);
    if (isDragging) { window.addEventListener("mousemove", handleMove); window.addEventListener("mouseup", handleUp); }
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
  }, [isDragging]);

  return (
    <div className="absolute inset-0 pointer-events-none z-20" ref={containerRef}>
      {/* floating draggable card */}
      <div
        className={`absolute pointer-events-auto flex items-start will-change-transform transition-all duration-300 ease-out ${isMinimized ? "w-[300px]" : "w-[440px]"}`}
        style={{ transform: `translate(${effectivePosition.x}px, ${effectivePosition.y}px)`, right: "auto", bottom: "auto" }}
      >
        <article className="w-full bg-[rgba(34,56,67,0.85)] backdrop-blur-[24px] border border-white/10 rounded-[32px] text-white flex flex-col max-h-[calc(100vh-220px)] shadow-[0_32px_64px_rgba(0,0,0,0.35)] overflow-hidden">
          {/* card header / drag handle */}
          <header
            className={`px-6 py-4 select-none flex items-center gap-4 border-b border-white/[0.08] bg-white/[0.02] ${dockMode ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
            onMouseDown={(e) => {
              if (dockMode) return; // suppress drag-start in dock mode
              if (e.target.closest(".drag-handle") || e.target.closest("header") && !e.target.closest("button")) {
                setIsDragging(true);
                dragStartPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
              }
            }}
          >
            {/* drag indicator */}
            <div className="drag-handle flex flex-col gap-[3px] opacity-40">
              <span className="w-3.5 h-0.5 bg-white rounded-[2px]" />
              <span className="w-3.5 h-0.5 bg-white rounded-[2px]" />
              <span className="w-3.5 h-0.5 bg-white rounded-[2px]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-0.5">
                <svg className="text-secondary drop-shadow-[0_0_12px_rgba(215,122,97,0.6)]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>
                <h2 className="m-0 text-[19px] font-normal tracking-tight font-serif text-white">{panelTitle}</h2>
              </div>
              {panelSummary && <p className="m-0 text-white/50 text-[12px] font-medium truncate max-w-[240px]">{panelSummary}</p>}
              {/* Verification warnings for this read. Derived from the response,
                  so a re-fetch that still fails keeps them and the first
                  successful notes load clears them. Public views never get them. */}
              <PlaceAdvisoryNotice advisories={itinerary?.placeAdvisories} className="mt-2 max-w-[320px]" />
              {dockMode && (
                <span
                  className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/[0.08] border border-white/10"
                  style={{ color: "var(--text-soft, rgba(255,255,255,0.55))" }}
                >
                  Pinned while picker open
                </span>
              )}
            </div>
            <button
              className="bg-white/[0.08] border border-white/10 rounded-xl w-9 h-9 flex items-center justify-center text-white/70 cursor-pointer transition-all duration-300 hover:bg-secondary hover:text-white hover:border-secondary hover:scale-105 active:scale-95"
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /></svg>
              }
            </button>
          </header>

          {!isMinimized && (
            <>
              {/* timeline */}
              <div
                ref={reuseDropRef || undefined}
                className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar scroll-smooth"
              >
                {safeDays.length > 0 ? (
                  <div className="flex flex-col">
                    {safeDays.map((day, dIdx) => (
                      <div
                        key={day.id || day.dayNumber || dIdx}
                        className="mb-10 last:mb-2"
                        data-reuse-day={dIdx}
                      >
                        <div
                          data-reuse-day-header=""
                          className="flex items-center gap-4 mb-6 sticky top-0 bg-[rgba(34,56,67,0.01)] backdrop-blur-[2px] py-1 z-[5]"
                        >
                          <span className="bg-secondary/20 text-secondary border border-secondary/30 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">Day {day.dayNumber}</span>
                          <span className="font-serif text-[20px] text-white/90">{day.title}</span>
                        </div>
                        {(day.items || []).length > 0 ? (day.items.map((item, iIdx) => {
                          const gIdx = mapItems.findIndex(m => m.__dayNumber === day.dayNumber && m.__itemIndex === iIdx);
                          const isActive = activeStopIndex === gIdx;
                          return (
                            <div
                              key={`${day.dayNumber}-${iIdx}`}
                              data-reuse-item={iIdx}
                              className={`flex gap-6 group cursor-pointer relative py-1`}
                              onMouseEnter={() => setActiveStopIndex(gIdx)}
                              onClick={() => onPlaceSelect?.(mapItems[gIdx]?.__placeEntityId)}
                            >
                              {/* timeline rail */}
                              <div className="flex flex-col items-center w-3.5 pt-2.5">
                                <span className={`w-3 h-3 rounded-full flex-shrink-0 transition-all duration-500 ${isActive ? "bg-secondary shadow-[0_0_20px_rgba(215,122,97,0.8)] scale-[1.3]" : "bg-white/15 group-hover:bg-white/30"}`} />
                                <div className="w-[1.5px] flex-1 bg-white/[0.08] my-2 rounded-full" />
                              </div>
                              {/* content */}
                              <div className="flex-1 pb-8 group-last:pb-2">
                                <div className="flex items-center gap-2 text-[11px] font-bold text-white/40 mb-2 tracking-wide uppercase">
                                  <svg className="opacity-60" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                  {getItemTimeLabel(item)}
                                </div>
                                <h3 className={`m-0 mb-2 transition-colors duration-300 font-bold text-[17px] leading-snug ${isActive ? "text-secondary" : "text-white group-hover:text-white"}`}>{item.title || "Untitled stop"}</h3>
                                {item.description && <p className="m-0 text-white/60 text-[14px] leading-relaxed font-medium line-clamp-2 group-hover:line-clamp-none transition-all duration-300">{item.description}</p>}
                              </div>
                            </div>
                          );
                        })) : (
                          <div className="flex gap-6 text-white/20 italic text-[14px] py-2">
                            <div className="flex flex-col items-center w-3.5 pt-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                              <div className="w-[1px] flex-1 my-1 border-l border-dashed border-white/10" />
                            </div>
                            <p>Exploration pending.</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center">
                    <div className="w-16 h-16 bg-white/[0.05] rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <svg className="text-white/20" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>
                    </div>
                    <p className="text-white/40 font-medium text-lg">No active itinerary generated yet.</p>
                    <p className="text-white/20 text-sm mt-2">Brief the agent to start planning.</p>
                  </div>
                )}
              </div>
              {/* footer */}
              <footer className="px-8 pb-8 pt-2">
                <button
                  type="button"
                  className="w-full py-4 bg-secondary text-white border-none rounded-[20px] text-[15px] font-black cursor-pointer transition-all duration-300 shadow-[0_20px_40px_rgba(215,122,97,0.3)] hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(215,122,97,0.4)] active:scale-[0.98]"
                  onClick={onContinue}
                >
                  {primaryActionLabel}
                </button>
              </footer>
            </>
          )}
        </article>
      </div>
    </div>
  );
}
