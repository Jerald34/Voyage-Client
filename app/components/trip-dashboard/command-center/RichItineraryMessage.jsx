import React, { useMemo } from "react";
import PlaceStatusBadge from "../itinerary/PlaceStatusBadge.jsx";
import AccessibilityBadges from "../../accessibility/AccessibilityBadges.jsx";
import TripAccessibilitySummary from "../../accessibility/TripAccessibilitySummary.jsx";
import StopNumberBadge from "../itinerary/StopNumberBadge.jsx";
import { buildRichItinerarySections } from "../../../lib/trip-dashboard/richItinerary.js";
import { describeAccessibilityBadges } from "../../../lib/accessibility/placeAccessibility.js";

function StopShell({ stop, dayNumber, stopNumber, selectedPlaceId, onPlaceSelect }) {
  const isSelected = stop.isSelectable && stop.placeId === selectedPlaceId;
  
  // Base Container Styles - Luxury Editorial Feel
  const containerBase =
    "group flex flex-col gap-4 w-full border border-border/10 rounded-2xl bg-surface-elevated text-text-primary p-5 text-left transition-all duration-300 shadow-sm overflow-hidden";
  const containerSelectable = stop.isSelectable
    ? "cursor-pointer hover:border-secondary/30 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.99]"
    : "opacity-95";
  const containerSelected = isSelected ? "border-secondary/40 ring-4 ring-secondary/5 shadow-xl bg-surface-elevated/90" : "";

  const className = `${containerBase} ${containerSelectable} ${containerSelected}`;

  const content = (
    <>
      {/* Top Meta Row - Time & Status */}
      <div className="flex items-center justify-between gap-3 border-b border-border/5 pb-3">
        <div className="flex items-center gap-2">
          <StopNumberBadge dayNumber={dayNumber} stopNumber={stopNumber} />
          <span className="px-2.5 py-1 rounded-full bg-secondary/10 text-secondary text-[11px] font-black tracking-tight">
            {stop.timeLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <PlaceStatusBadge businessStatus={stop.businessStatus} placeAdvisory={stop.placeAdvisory} />
          <span className={`text-[10px] font-bold tracking-widest uppercase transition-colors duration-300 ${isSelected ? "text-secondary" : "text-text-soft"}`}>
            {stop.statusLabel}
          </span>
        </div>
      </div>

      {/* Identity Block - Image & Title */}
      <div className="flex gap-5 items-start">
        {stop.photoUrl ? (
          <img 
            className="w-[100px] h-[100px] rounded-2xl object-cover shadow-md group-hover:shadow-lg transition-shadow duration-500" 
            src={stop.photoUrl} 
            alt={stop.placeName} 
          />
        ) : (
          <div className="w-[100px] h-[100px] rounded-2xl flex-shrink-0 flex items-center justify-center bg-background text-text-soft text-2xl font-serif font-bold border border-border/10 shadow-inner" aria-hidden="true">
            {stop.placeName.slice(0, 1).toUpperCase()}
          </div>
        )}
        
        <div className="grid gap-1.5 min-w-0 flex-1">
          <h4 className="m-0 text-text-primary text-[18px] font-serif leading-tight tracking-tight group-hover:text-secondary transition-colors duration-300">
            {stop.title}
          </h4>
          
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-text-soft text-[11px] font-bold uppercase tracking-wider">
            {stop.rating ? <span className="flex items-center gap-1">★ {stop.rating}</span> : null}
            {stop.placeType ? <span>• {stop.placeType}</span> : null}
            {stop.userRatingCount ? <span className="font-normal opacity-80">({stop.userRatingCount.toLocaleString()})</span> : null}
          </div>
          <AccessibilityBadges badges={stop.accessibilityBadges} inline={stop.isSelectable} />
        </div>
      </div>

      {/* Narrative Section - airy and readable */}
      {stop.description || stop.highlights.length > 0 ? (
        <div className="grid gap-3 pt-1">
          {stop.description ? (
            <p className="m-0 text-text-primary text-[14px] leading-relaxed font-medium opacity-90">
              {stop.description}
            </p>
          ) : null}
          
          {stop.highlights.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {stop.highlights.map((highlight) => (
                <span key={highlight} className="px-2 py-0.5 rounded-md bg-background/50 border border-border/10 text-text-soft text-[10px] font-bold">
                  {highlight}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );

  if (!stop.isSelectable) {
    return <div className={className}>{content}</div>;
  }

  // aria-label replaces the button content as its name, so the badges must be spelled out in it.
  const badgeSummary = describeAccessibilityBadges(stop.accessibilityBadges);
  const selectLabel = badgeSummary ? `Select ${stop.title}. ${badgeSummary}` : `Select ${stop.title}`;

  return (
    <button
      type="button"
      className={className}
      onClick={() => onPlaceSelect?.(stop.placeId)}
      aria-label={selectLabel}
      aria-current={isSelected ? "true" : undefined}
    >
      {content}
    </button>
  );
}

export default function RichItineraryMessage({
  itinerary,
  placeEntities = [],
  selectedPlaceId = "",
  onPlaceSelect,
}) {
  const sections = useMemo(
    () => buildRichItinerarySections({ itinerary, placeEntities }),
    [itinerary, placeEntities],
  );

  return (
    <article className="grid gap-8 min-w-[min(100%,400px)] bg-surface-elevated/40 backdrop-blur-md p-6 rounded-[24px] border border-border/10 shadow-2xl" aria-label="Generated itinerary">
      <header className="grid gap-3 p-1">
        <div className="flex items-center gap-3">
          <span className="h-[1px] flex-1 bg-gradient-to-r from-secondary/40 to-transparent" />
          <span className="text-secondary text-[11px] font-black tracking-[0.2em] uppercase">Draft Itinerary</span>
          <span className="h-[1px] flex-1 bg-gradient-to-l from-secondary/40 to-transparent" />
        </div>
        <h2 className="m-0 text-text-primary text-3xl font-serif leading-[1.1] tracking-tight text-center">{sections.title}</h2>
        {sections.summary ? (
          <p className="m-0 text-text-soft text-[15px] leading-relaxed text-center font-medium max-w-[90%] mx-auto">
            {sections.summary}
          </p>
        ) : null}
        <TripAccessibilitySummary days={itinerary?.days} className="justify-center text-center text-balance" />
      </header>

      <div className="grid gap-8">
        {sections.days.map((day) => (
          <section className="grid gap-5" key={day.id}>
            <div className="flex items-center gap-4">
              <h3 className="m-0 text-text-primary text-[16px] font-serif font-black tracking-tighter whitespace-nowrap">
                {day.label}
              </h3>
              <div className="h-[1px] flex-1 bg-border/10" />
              {day.title ? (
                <span className="text-text-soft text-[13px] font-medium tracking-tight italic">
                  {day.title}
                </span>
              ) : null}
            </div>
            <div className="grid gap-4">
              {day.stops.map((stop, stopIndex) => (
                <StopShell
                  key={stop.id}
                  stop={stop}
                  dayNumber={day.dayNumber}
                  stopNumber={stopIndex + 1}
                  selectedPlaceId={selectedPlaceId}
                  onPlaceSelect={onPlaceSelect}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="pt-2 border-t border-border/5 text-center">
        <p className="m-0 text-text-soft text-[11px] font-bold tracking-wide uppercase opacity-60">
          Curated by Voyage Agent
        </p>
      </footer>
    </article>
  );
}
