"use client";

import { getGoogleMapsPlaceUrl } from "../../../../lib/trip-dashboard/placeEntities.js";
import PlaceStatusBadge from "../PlaceStatusBadge.jsx";

export default function PlaceDetailPanel({ place, onClose }) {
  if (!place) return null;

  const mapsUrl = getGoogleMapsPlaceUrl(place);

  return (
    <aside
      className="absolute left-[18px] bottom-[18px] z-[520] grid gap-2 w-[min(360px,calc(100%-36px))] p-4 rounded-[18px] bg-[rgba(15,23,42,0.92)] text-white shadow-[0_18px_40px_rgba(15,23,42,0.28)] backdrop-blur-[12px]"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold tracking-[0.04em] uppercase text-white/60">
            {place.source === "live" ? "Live map result" : place.dayLabel || "Itinerary stop"}
          </span>
          <h3 className="mt-0.5 text-xl leading-tight text-white font-serif">{place.name}</h3>
          <PlaceStatusBadge
            businessStatus={place?.businessStatus}
            placeAdvisory={place?.placeAdvisory}
            className="mt-1"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close place detail"
          className="w-8 h-8 border-0 rounded-full bg-white/10 text-white cursor-pointer text-xl leading-none hover:bg-white/20 transition-colors"
        >
          ×
        </button>
      </div>
      {place.formattedAddress ? <p className="m-0 text-[13px] leading-[1.45] text-white/70">{place.formattedAddress}</p> : null}
      {place.timeLabel ? <small className="text-[11px] font-bold tracking-[0.04em] uppercase text-white/60">{place.timeLabel}</small> : null}
      {mapsUrl ? (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex justify-center mt-1 rounded-full bg-[#dbeafe] text-[#0f3f86] py-[9px] px-3 text-[13px] font-extrabold no-underline hover:opacity-90 transition-opacity"
        >
          Open in Google Maps
        </a>
      ) : null}
    </aside>
  );
}
