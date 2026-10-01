// ItineraryDayView — desktop day content + map columns. Extracted from ClientItineraryPage.jsx.

import dynamic from "next/dynamic";
import { Spinner } from "../../ui/index.js";
import { BuildingIcon } from "../../icons/index.js";
import { getSnapshotPhotoUrl, getReadablePlaceType } from "../../../lib/trip-dashboard/richItinerary.js";
import { formatDayDate, getItemTimeLabel, getAccommodationLabel } from "../../../lib/formatters.js";
import CommentsPanel from "./CommentsPanel.jsx";
import DayWeatherSummary from "../../weather/DayWeatherSummary.jsx";

const ItineraryLiveMap = dynamic(
  () => import("../itinerary/ItineraryLiveMap.jsx"),
  { ssr: false }
);

export default function ItineraryDayView({
  agencyId,
  selectedTripId,
  selectedItineraryId,
  fullItinerary,
  safeDays,
  selectedDay,
  selectedDayIndex,
  selectedDayMapItems,
  activeStopIndex,
  setActiveStopIndex,
  tripStart,
  isLoadingItinerary,
  itineraryError,
  showCommentsPanel,
  setShowCommentsPanel,
  theme,
  dayWeather = null,
}) {
  if (isLoadingItinerary) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-text-soft gap-6 text-center px-10 py-[60px]">
        <Spinner size="md" />
        <p>Loading saved itinerary...</p>
      </div>
    );
  }
  if (itineraryError) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-text-soft gap-6 text-center px-10 py-[60px]">
        <p>Unable to load this saved itinerary.</p>
      </div>
    );
  }
  if (!selectedItineraryId) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-text-soft gap-6 text-center px-10 py-[60px]">
        <p>This saved trip is missing itinerary details.</p>
      </div>
    );
  }

  if (fullItinerary && safeDays.length > 0) {
    const dayAccommodation = selectedDay ? getAccommodationLabel(selectedDay) : "";
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 h-full bg-surface/20 backdrop-blur-sm">
        {/* Day content column */}
        <div className="flex flex-col overflow-y-auto border-r border-border/5 p-4 sm:p-6 gap-4">
          {showCommentsPanel && (
            <CommentsPanel
              agencyId={agencyId}
              tripId={selectedTripId}
              itinerary={fullItinerary}
              onClose={() => setShowCommentsPanel(false)}
            />
          )}
          {selectedDay && (
            <>
              <div className="flex items-center gap-3">
                <span className="text-secondary/80 text-[0.85rem] font-extrabold uppercase tracking-wider">Day {selectedDay.dayNumber}</span>
                <span className="text-[0.85rem] text-text-soft font-semibold">{formatDayDate(selectedDay, tripStart)}</span>
              </div>
              <h4 className="text-[1.5rem] font-extrabold m-0 text-text-primary tracking-tight">{selectedDay.title}</h4>
              {dayAccommodation && (
                <div className="flex items-center gap-2 text-[0.85rem] text-text-soft font-semibold">
                  <BuildingIcon width={14} height={14} />
                  {dayAccommodation}
                </div>
              )}
              <DayWeatherSummary entry={dayWeather} />
              <div className="flex flex-col gap-3">
                {(selectedDay.items || []).map((item, iIdx) => {
                  const dayItemIdx = selectedDayMapItems.findIndex(
                    (m) => m.__dayNumber === selectedDay.dayNumber && m.__itemIndex === iIdx
                  );
                  const timeLabel = getItemTimeLabel(item);
                  const snapshot = item?.placeSnapshot ?? null;
                  const photoUrl = getSnapshotPhotoUrl(snapshot);
                  const placeType = getReadablePlaceType(snapshot);
                  const rating = snapshot?.rating ?? snapshot?.metadata?.rating ?? null;
                  const description = (item.description || snapshot?.formattedAddress || "").trim();
                  const highlights = Array.isArray(item.highlights)
                    ? item.highlights
                    : Array.isArray(item.metadata?.highlights) ? item.metadata.highlights : [];
                  const placeName = snapshot?.name || item.placeName || item.title || "Untitled";
                  const isActive = activeStopIndex === dayItemIdx;

                  return (
                    <div
                      key={`${selectedDay.dayNumber}-${iIdx}`}
                      className={`flex flex-col gap-3 border rounded-xl p-4 cursor-default transition-all duration-200 ${isActive
                        ? "border-secondary/40 bg-secondary/5 shadow-soft"
                        : "border-border/20 bg-surface-elevated hover:border-secondary/20 hover:shadow-soft"
                        }`}
                      onMouseEnter={() => setActiveStopIndex(dayItemIdx)}
                    >
                      {/* Time badge + type */}
                      <div className="flex items-center justify-between gap-2 border-b border-border/5 pb-2">
                        <span className="px-2.5 py-1 rounded-full bg-secondary/10 text-secondary text-[0.7rem] font-black tracking-tight">
                          {timeLabel || "Time pending"}
                        </span>
                        {placeType && (
                          <span className="text-[0.65rem] font-bold tracking-widest uppercase text-text-soft">
                            {placeType}
                          </span>
                        )}
                      </div>

                      {/* Image + title + rating */}
                      <div className="flex gap-4 items-start">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={placeName}
                            className="w-20 h-20 rounded-xl object-cover shadow-md flex-shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-xl flex-shrink-0 flex items-center justify-center bg-background text-text-soft text-2xl font-serif font-bold border border-border/10 shadow-inner">
                            {placeName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <h5 className="m-0 text-text-primary text-[1rem] font-serif leading-tight tracking-tight">
                            {item.title || placeName}
                          </h5>
                          {rating && (
                            <span className="text-[0.7rem] font-bold text-text-soft flex items-center gap-0.5">
                              ★ {rating}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Description + highlights */}
                      {(description || highlights.length > 0) && (
                        <div className="flex flex-col gap-2">
                          {description && (
                            <p className="m-0 text-text-primary text-[0.85rem] leading-relaxed font-medium opacity-90">
                              {description}
                            </p>
                          )}
                          {highlights.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {highlights.map((h, hIdx) => (
                                <span key={hIdx} className="px-2 py-0.5 rounded-md bg-background/50 border border-border/10 text-text-soft text-[0.65rem] font-bold">
                                  {h}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Map column — hidden on mobile, full panel on lg+ */}
        <div className="hidden lg:relative lg:block min-h-0 p-4 bg-surface">
          <div className="relative w-full h-full rounded-md overflow-hidden border border-border/10 shadow-soft">
            <ItineraryLiveMap
              items={selectedDayMapItems}
              liveMarkers={[]}
              routeEstimates={[]}
              activeIndex={activeStopIndex}
              onHoverItem={setActiveStopIndex}
              selectedPlaceId=""
              selectedPlace={null}
              onSelectPlace={() => { }}
              theme={theme}
              sidebarWidth={0}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 text-text-soft gap-6 text-center px-10 py-[60px]">
      <p>This saved trip is missing itinerary details.</p>
    </div>
  );
}
