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

// A picture, not a control. With drag and touch-zoom on, Leaflet sets touch-action:none and traps
// a vertical swipe on a phone; its keyboard handler adds a tab stop with no name. Attribution stays.
const STATIC_MAP = {
  dragging: false,
  touchZoom: false,
  doubleClickZoom: false,
  boxZoom: false,
  keyboard: false,
  zoomControl: false,
  scrollWheelZoom: false,
};
const MAP_STYLE = { background: "var(--color-surface)" }; // Leaflet's own #ddd flashes in dark mode
const BOUNDS_OPTIONS = { padding: [28, 28] };
const ACTIVE_Z_OFFSET = 1000;

/** The stop's number in its day's colour: the same badge StopNumberBadge draws on its card. */
function pinIcon(stop, isActiveDay) {
  return L.divIcon({
    className: "",
    html: `<span aria-hidden="true" style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:999px;background:${stop.color.fill};border:2px solid ${stop.color.border};color:#fff;font:700 12px/1 var(--font-sans),sans-serif;opacity:${isActiveDay ? 1 : 0.45}">${stop.stopNumber}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

// The sample is frozen, so everything below is built once rather than on every render.
const STOPS = getSampleMapStops();

const PINS = STOPS.map((stop) => ({
  id: stop.id,
  dayNumber: stop.dayNumber,
  position: [stop.lat, stop.lng],
  title: `Day ${stop.dayNumber}, stop ${stop.stopNumber}: ${stop.title}`,
  icons: { active: pinIcon(stop, true), inactive: pinIcon(stop, false) },
}));

const BOUNDS = PINS.map((pin) => pin.position);

const ROUTES = [...new Set(STOPS.map((stop) => stop.dayNumber))].map((dayNumber) => {
  const style = { color: getDayColor(dayNumber).fill, weight: 3, dashArray: "6 6" };
  return {
    dayNumber,
    positions: PINS.filter((pin) => pin.dayNumber === dayNumber).map((pin) => pin.position),
    paths: { active: { ...style, opacity: 0.9 }, inactive: { ...style, opacity: 0.3 } },
  };
});

/** The sample trip on a real map. Client-only: load it through LazySampleTripMap. */
export default function SampleTripMap({ activeDay }) {
  const { theme } = useTheme();
  // Leaflet stacks paths in the order they were added, so the active route goes last. The key holds the
  // route's state: the two routes that change are re-added in this order, which keeps the active one on top.
  const routes = [
    ...ROUTES.filter((route) => route.dayNumber !== activeDay),
    ...ROUTES.filter((route) => route.dayNumber === activeDay),
  ];

  return (
    <MapContainer
      {...STATIC_MAP}
      bounds={BOUNDS}
      boundsOptions={BOUNDS_OPTIONS}
      style={MAP_STYLE}
      className="h-full w-full"
    >
      <TileLayer url={theme === "dark" ? TILES.dark : TILES.light} attribution={ATTRIBUTION} />
      {routes.map((route) => {
        const isActive = route.dayNumber === activeDay;
        return (
          <Polyline
            key={`${route.dayNumber}-${isActive ? "active" : "inactive"}`}
            positions={route.positions}
            pathOptions={isActive ? route.paths.active : route.paths.inactive}
            interactive={false}
          />
        );
      })}
      {PINS.map((pin) => {
        const isActive = pin.dayNumber === activeDay;
        return (
          <Marker
            key={pin.id}
            position={pin.position}
            icon={isActive ? pin.icons.active : pin.icons.inactive}
            zIndexOffset={isActive ? ACTIVE_Z_OFFSET : 0}
            title={pin.title}
            keyboard={false}
          />
        );
      })}
    </MapContainer>
  );
}
