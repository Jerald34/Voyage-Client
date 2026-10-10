"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer } from "react-leaflet";
import { useTheme } from "../theme/ThemeProvider";
import { getDayColor } from "../../lib/trip-dashboard/dayColors.js";
import { getSampleMapStops } from "./sample/sampleTrip.js";

// CARTO basemaps: free for non-commercial use with attribution. Revisit if Voyage goes commercial (Release checklist).
const TILES = {
  light: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const STOPS = getSampleMapStops();
const BOUNDS = STOPS.map((stop) => [stop.lat, stop.lng]);
const DAY_NUMBERS = [...new Set(STOPS.map((stop) => stop.dayNumber))];

/** The stop's number in its day's colour: the same badge StopNumberBadge draws on its card. */
function pinIcon(stop, isActiveDay) {
  return L.divIcon({
    className: "",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:999px;background:${stop.color.fill};border:2px solid ${stop.color.border};color:#fff;font:700 12px/1 'Plus Jakarta Sans',sans-serif;opacity:${isActiveDay ? 1 : 0.45}">${stop.stopNumber}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

/** The sample trip on a real map. Client-only: load it through LazySampleTripMap. */
export default function SampleTripMap({ activeDay }) {
  const { theme } = useTheme();
  return (
    <MapContainer bounds={BOUNDS} boundsOptions={{ padding: [28, 28] }} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer url={theme === "dark" ? TILES.dark : TILES.light} attribution={ATTRIBUTION} />
      {DAY_NUMBERS.map((dayNumber) => (
        <Polyline
          key={dayNumber}
          positions={STOPS.filter((stop) => stop.dayNumber === dayNumber).map((stop) => [stop.lat, stop.lng])}
          pathOptions={{ color: getDayColor(dayNumber).fill, weight: 3, dashArray: "6 6", opacity: dayNumber === activeDay ? 0.9 : 0.3 }}
        />
      ))}
      {STOPS.map((stop) => (
        <Marker
          key={stop.id}
          position={[stop.lat, stop.lng]}
          icon={pinIcon(stop, stop.dayNumber === activeDay)}
          title={`Day ${stop.dayNumber}, stop ${stop.stopNumber}: ${stop.title}`}
          keyboard={false}
        />
      ))}
    </MapContainer>
  );
}
