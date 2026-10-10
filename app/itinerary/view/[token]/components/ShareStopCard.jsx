"use client";

import AccessibilityBadges from "../../../../components/accessibility/AccessibilityBadges.jsx";
import StopWeatherTag from "../../../../components/weather/StopWeatherTag.jsx";
import StopNumberBadge from "../../../../components/trip-dashboard/itinerary/StopNumberBadge.jsx";
import { MapPinIcon, ChatIcon } from "../../../../components/icons/index.js";
import { getReadablePlaceType, getSnapshotPhotoUrl } from "../../../../lib/trip-dashboard/richItinerary.js";

/**
 * One stop on the public share page, in the same anatomy as the in-app day view
 * (ItineraryDayView): time pill + place type, photo or type tile, title (sans,
 * like the dashboard's card titles), rating, then details. `actions` sit beside the title; `children` holds the
 * stop's comment form and comments. `compact` keeps only the header row, photo, title and rating (landing hero).
 */
export default function ShareStopCard({ item, isActive = false, timeLabel = "", icon = null, actions = null, dayWeather = null, dayNumber = null, stopNumber = null, compact = false, onHoverChange, children }) {
  const snapshot = item.placeSnapshot ?? null;
  const photoUrl = getSnapshotPhotoUrl(snapshot);
  const placeType = getReadablePlaceType(snapshot);
  const rating = snapshot?.rating ?? snapshot?.metadata?.rating ?? null;

  return (
    <article
      data-active={isActive ? "true" : "false"}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      onFocus={() => onHoverChange?.(true)}
      onBlur={(e) => {
        // Focus moving between this card's own buttons keeps the map highlight.
        if (!e.currentTarget.contains(e.relatedTarget)) onHoverChange?.(false);
      }}
      className={`grid gap-3 rounded-xl border bg-surface-elevated p-4 transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none max-[400px]:p-3 ${
        isActive ? "border-secondary/40 shadow-soft" : "border-border/15"
      }`}
    >
      {timeLabel || placeType || stopNumber ? (
        <div className="flex items-center justify-between gap-2 border-b border-border/10 pb-2">
          {timeLabel || stopNumber ? (
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              {/* Same number and day colour as this stop's map pin. */}
              <StopNumberBadge dayNumber={dayNumber} stopNumber={stopNumber} />
              {timeLabel ? (
                <span className="rounded-pill bg-secondary/10 px-2.5 py-1 text-[0.72rem] font-bold text-secondary-strong">{timeLabel}</span>
              ) : null}
              <StopWeatherTag entry={dayWeather} itemId={item.id} />
            </span>
          ) : (
            <span />
          )}
          {placeType ? (
            <span className="text-[0.65rem] font-bold uppercase tracking-widest text-text-muted">{placeType}</span>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-start gap-3">
        {photoUrl ? (
          <img src={photoUrl} alt="" loading="lazy" className="h-16 w-16 flex-shrink-0 rounded-xl object-cover max-[400px]:h-14 max-[400px]:w-14" />
        ) : (
          <div aria-hidden="true" className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border border-border/10 bg-background text-primary max-[400px]:h-14 max-[400px]:w-14">
            {icon}
          </div>
        )}
        <div className="grid min-w-0 flex-1 gap-1">
          <h3 className="m-0 font-sans text-[15px] font-semibold leading-snug tracking-normal text-text-primary">{item.title}</h3>
          {rating ? <span className="text-[0.75rem] font-semibold text-text-muted">★ {rating}</span> : null}
        </div>
        {actions ? <div className="flex flex-shrink-0 items-center gap-1.5">{actions}</div> : null}
      </div>

      {!compact && item.description ? <p className="m-0 text-[0.85rem] leading-relaxed text-text-muted">{item.description}</p> : null}

      {!compact && snapshot?.name ? (
        <p className="m-0 flex items-start gap-1.5 text-[0.78rem] leading-snug text-text-muted">
          <MapPinIcon width={12} height={12} className="mt-[2px] flex-shrink-0" />
          <span className="min-w-0">
            <span className="font-semibold text-text-primary">{snapshot.name}</span>
            {snapshot.formattedAddress ? <span className="block">{snapshot.formattedAddress}</span> : null}
          </span>
        </p>
      ) : null}

      {compact ? null : <AccessibilityBadges snapshot={snapshot} />}

      {!compact && item.clientNotes ? (
        <div className="flex items-start gap-1.5 rounded-sm border-l-[3px] border-secondary bg-secondary/[0.06] px-3 py-2 text-[0.78rem] leading-[1.5] text-text-muted">
          <ChatIcon width={12} height={12} className="mt-[2px] flex-shrink-0 text-secondary-strong" />
          <span>{item.clientNotes}</span>
        </div>
      ) : null}

      {children}
    </article>
  );
}
