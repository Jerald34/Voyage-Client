"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { getPlaceStatusLabel, mergePlaceStatus, normalizeBusinessStatus } from "../../../lib/trip-dashboard/placeStatus.js";
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
} from "@vis.gl/react-google-maps";
import { getReadablePlaceType } from "../../../lib/trip-dashboard/richItinerary.js";
import Polyline from "./map/MapPolylineLayer.jsx";
import {
  FitBounds,
  FocusActiveStop,
  FocusLiveMarker,
  FocusSelectedPlace,
  MapHandler,
} from "./map/MapMarkerLayer.jsx";
import { ResolveClientRoute, ResolveAgencyFallbackPoint } from "./map/MapControls.jsx";
import PlaceDetailPanel from "./map/PlaceDetailPanel.jsx";
import RouteSummaryPanel from "./map/RouteSummaryPanel.jsx";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "a1950eb4eae71842fa9590f9";

const EMPTY_MAP_CENTER = { lat: 0, lng: 0 };

export function normalizeAgencyFallbackLocation(agencyLocation) {
  if (!agencyLocation) return null;

  const city = String(agencyLocation.city ?? "").trim();
  const country = String(agencyLocation.country ?? "").trim();
  const query = [city, country].filter(Boolean).join(", ");
  if (!query) return null;

  const label = String(agencyLocation.name ?? "").trim() || query;
  const rawLat = Number(agencyLocation.lat ?? agencyLocation.latitude);
  const rawLng = Number(agencyLocation.lng ?? agencyLocation.longitude);

  return {
    id: "agency-location",
    label,
    query,
    ...(Number.isFinite(rawLat) && Number.isFinite(rawLng) ? { lat: rawLat, lng: rawLng } : {}),
  };
}

export function mapItemToPoint(item, index) {
  const snapshot = item?.placeSnapshot ?? null;
  const rawLat = Number(item?.lat ?? item?.latitude ?? item?.placeSnapshot?.latitude);
  const rawLng = Number(item?.lng ?? item?.longitude ?? item?.placeSnapshot?.longitude);
  if (Number.isFinite(rawLat) && Number.isFinite(rawLng)) {
    const rating = snapshot?.rating ?? snapshot?.metadata?.rating ?? null;
    const userRatingCount = Number(snapshot?.metadata?.userRatingCount);
    return {
      id: item?.__placeEntityId || `point-${index}`,
      lat: rawLat,
      lng: rawLng,
      title: snapshot?.name || item?.placeName || item?.title || `Itinerary item ${index + 1}`,
      description: item?.description || snapshot?.formattedAddress || item?.type || "",
      formattedAddress: snapshot?.formattedAddress || "",
      placeType: getReadablePlaceType(snapshot) || item?.type || "",
      rating: rating ? String(rating) : "",
      userRatingCount: Number.isFinite(userRatingCount) ? userRatingCount : null,
      dayLabel: item?.__dayNumber ? `Day ${item.__dayNumber}` : "",
      timeLabel: item?.startTime && item?.endTime ? `${item.startTime} - ${item.endTime}` : item?.startTime || "",
      // Keep the real snapshot id alongside the display id so a live marker for
      // the same place can be reconciled against this saved stop.
      placeSnapshotId: item?.placeSnapshotId || snapshot?.id || null,
      businessStatus: normalizeBusinessStatus(snapshot?.businessStatus),
      businessStatusCheckedAt: snapshot?.businessStatusCheckedAt ?? null,
      placeAdvisory: item?.placeAdvisory ?? null,
    };
  }

  return null;
}

/**
 * A live marker is a historical observation from the run stream. When it refers
 * to a snapshot the authenticated itinerary also has, the newer recognized
 * observation wins — a stale "operational" marker must never erase a current
 * closure. Selection ids stay stable regardless.
 */
export function normalizeLiveMarker(marker, index, savedStatusBySnapshotId) {
  const rawLat = Number(marker?.lat ?? marker?.latitude);
  const rawLng = Number(marker?.lng ?? marker?.longitude);

  if (!Number.isFinite(rawLat) || !Number.isFinite(rawLng)) {
    return null;
  }

  const placeSnapshotId = marker?.placeSnapshotId || null;
  const saved = placeSnapshotId ? savedStatusBySnapshotId?.get(placeSnapshotId) : undefined;
  const { businessStatus, businessStatusCheckedAt } = mergePlaceStatus(saved, {
    businessStatus: marker?.businessStatus,
    businessStatusCheckedAt: marker?.businessStatusCheckedAt ?? null
  });

  return {
    id: `live:${marker?.id || marker?.placeSnapshotId || `live-marker-${index}`}`,
    name: marker?.name || marker?.formattedAddress || marker?.address || `Resolved location ${index + 1}`,
    formattedAddress: marker?.formattedAddress || marker?.address || "",
    lat: rawLat,
    lng: rawLng,
    placeSnapshotId,
    businessStatus,
    businessStatusCheckedAt,
    placeAdvisory: saved?.placeAdvisory ?? null,
  };
}

export function getMapPinGlyph(index) {
  return String(index + 1);
}

/**
 * A closed stop keeps its numbered place in the itinerary but gets a distinct
 * glyph so it reads as "needs attention" at a glance rather than disappearing.
 */
export function getClosedPinGlyph(index) {
  return `${index + 1}!`;
}

/** Accessible pin title: the place name plus its closure label when there is one. */
export function getPinTitle(point, index) {
  const name = point?.title || point?.name || `Stop ${index + 1}`;
  const label = getPlaceStatusLabel({
    businessStatus: point?.businessStatus,
    placeAdvisory: point?.placeAdvisory
  });
  return label ? `${name} — ${label}` : name;
}

function getRouteCoordinate(point) {
  const lat = Number(point?.lat ?? point?.latitude);
  const lng = Number(point?.lng ?? point?.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

function getRoutePointLabel(point, fallback) {
  return String(point?.name || point?.title || point?.formattedAddress || point?.address || fallback).trim();
}

function getRoutePointQuery(point) {
  const label = getRoutePointLabel(point, "");
  if (label) return label;

  const coordinate = getRouteCoordinate(point);
  return coordinate ? `${coordinate.lat},${coordinate.lng}` : "";
}

export function buildRouteEndpointPoints(route) {
  const originCoordinate = getRouteCoordinate(route?.origin);
  const destinationCoordinate = getRouteCoordinate(route?.destination);

  if (!originCoordinate || !destinationCoordinate) {
    return [];
  }

  return [
    {
      id: "route-origin",
      glyph: "A",
      ...originCoordinate,
      name: getRoutePointLabel(route.origin, "Point A"),
      title: getRoutePointLabel(route.origin, "Point A"),
      formattedAddress: route.origin?.formattedAddress || route.origin?.address || "",
      source: "route",
    },
    {
      id: "route-destination",
      glyph: "B",
      ...destinationCoordinate,
      name: getRoutePointLabel(route.destination, "Point B"),
      title: getRoutePointLabel(route.destination, "Point B"),
      formattedAddress: route.destination?.formattedAddress || route.destination?.address || "",
      source: "route",
    },
  ];
}

function routeTravelModeForMaps(value) {
  const mode = String(value || "").toUpperCase();
  if (mode === "WALK") return "walking";
  if (mode === "BICYCLE") return "bicycling";
  if (mode === "TRANSIT") return "transit";
  return "driving";
}

export function buildDirectionsUrl(route) {
  const origin = getRoutePointQuery(route?.origin);
  const destination = getRoutePointQuery(route?.destination);

  if (!origin || !destination) {
    return "";
  }

  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=${routeTravelModeForMaps(route?.travelMode)}`;
}

function decodeEncodedPolyline(polyline) {
  const coordinates = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < polyline.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = polyline.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = polyline.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += deltaLng;

    coordinates.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return coordinates;
}

export function normalizeRoutePolyline(polyline) {
  if (!polyline) return [];

  if (typeof polyline === "string") {
    return decodeEncodedPolyline(polyline);
  }

  if (polyline && typeof polyline === "object" && !Array.isArray(polyline)) {
    const nestedPolyline =
      polyline.coordinates ??
      polyline.points ??
      polyline.path ??
      polyline.geometry?.coordinates ??
      null;

    if (nestedPolyline) {
      return normalizeRoutePolyline(nestedPolyline);
    }
  }

  if (!Array.isArray(polyline)) return [];

  return polyline
    .map((point) => {
      if (Array.isArray(point) && point.length >= 2) {
        const first = Number(point[0]);
        const second = Number(point[1]);
        if (Number.isFinite(first) && Number.isFinite(second)) {
          // Google Maps uses {lat, lng}
          return { lat: first, lng: second };
        }
        return null;
      }

      if (point && typeof point === "object") {
        const lat = Number(point.lat ?? point.latitude);
        const lng = Number(point.lng ?? point.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return { lat, lng };
        }
      }

      return null;
    })
    .filter(Boolean);
}

export function buildRouteSegmentsFromItems(items = []) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item, index) => {
      const routeFromPrevious = item?.routeFromPrevious;
      const polyline = normalizeRoutePolyline(
        routeFromPrevious?.polyline ?? routeFromPrevious?.encodedPolyline ?? routeFromPrevious?.path ?? routeFromPrevious,
      );

      if (polyline.length <= 1) {
        return null;
      }

      return {
        id: `route-${item?.id || item?.__placeEntityId || index}`,
        points: polyline,
      };
    })
    .filter(Boolean);
}

export function shouldFitViewportBounds(points = [], isAgencyFallback = false) {
  if (!Array.isArray(points) || points.length === 0) return false;
  return !isAgencyFallback;
}

export function shouldRequestClientRoute({
  pointCount = 0,
  routeSegmentCount = 0,
} = {}) {
  return pointCount > 1 && routeSegmentCount === 0;
}

export function shouldShowPlannedPathFallback() {
  return false;
}

function pointToLatLngLiteral(point) {
  return { lat: point.lat, lng: point.lng };
}

export function buildClientRouteRequest(points, travelMode) {
  if (!Array.isArray(points) || points.length <= 1) {
    return null;
  }

  const originCoordinate = getRouteCoordinate(points[0]);
  const destinationCoordinate = getRouteCoordinate(points[points.length - 1]);
  const origin = originCoordinate ? pointToLatLngLiteral(originCoordinate) : null;
  const destination = destinationCoordinate ? pointToLatLngLiteral(destinationCoordinate) : null;
  if (!origin || !destination) {
    return null;
  }

  const intermediates = points.slice(1, -1).slice(0, 25)
    .map((point) => getRouteCoordinate(point))
    .filter(Boolean)
    .map((point) => ({
      location: pointToLatLngLiteral(point),
    }));

  return {
    origin,
    destination,
    intermediates,
    travelMode: travelMode ?? "DRIVING",
    fields: ["path"],
  };
}

// Triggering rebuild to clear stale map hook state
export default function ItineraryLiveMap({
  items = [],
  agencyLocation = null,
  liveMarkers = [],
  routeEstimates = [],
  activeIndex = -1,
  onHoverItem,
  selectedPlaceId = "",
  selectedPlace = null,
  onSelectPlace,
  theme = "light",
  sidebarWidth = 520,
  mapBottomPadding = 0,
}) {
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [agencyFallbackPoint, setAgencyFallbackPoint] = useState(null);
  const [clientRoutePolyline, setClientRoutePolyline] = useState([]);
  const [clientRouteStatus, setClientRouteStatus] = useState("idle");
  const isDark = theme === "dark";

  const points = useMemo(() => items.map((item, index) => mapItemToPoint(item, index)).filter(Boolean), [items]);
  // Current authenticated status per snapshot, used to reconcile historical live
  // markers that refer to the same place.
  const savedStatusBySnapshotId = useMemo(() => {
    const map = new Map();
    for (const point of points) {
      if (point?.placeSnapshotId && !map.has(point.placeSnapshotId)) {
        map.set(point.placeSnapshotId, {
          businessStatus: point.businessStatus,
          businessStatusCheckedAt: point.businessStatusCheckedAt,
          placeAdvisory: point.placeAdvisory ?? null
        });
      }
    }
    return map;
  }, [points]);
  const liveMarkerPoints = useMemo(
    () =>
      Array.isArray(liveMarkers)
        ? liveMarkers
            .map((marker, index) => normalizeLiveMarker(marker, index, savedStatusBySnapshotId))
            .filter(Boolean)
        : [],
    [liveMarkers],
  );
  const latestRouteEstimate = useMemo(() => (
    Array.isArray(routeEstimates) && routeEstimates.length > 0 ? routeEstimates[routeEstimates.length - 1] : null
  ), [routeEstimates]);
  const latestRoutePolyline = useMemo(() => {
    return normalizeRoutePolyline(latestRouteEstimate?.polyline);
  }, [latestRouteEstimate]);
  const latestRouteEndpointPoints = useMemo(() => buildRouteEndpointPoints(latestRouteEstimate), [latestRouteEstimate]);
  const routeSegments = useMemo(() => buildRouteSegmentsFromItems(items), [items]);
  const agencyFallback = useMemo(() => normalizeAgencyFallbackLocation(agencyLocation), [agencyLocation]);
  const shouldResolveClientRoute = shouldRequestClientRoute({
    pointCount: points.length,
    routeSegmentCount: routeSegments.length,
  });

  const resolvedViewportPoints = useMemo(
    () => [...points, ...liveMarkerPoints, ...latestRouteEndpointPoints],
    [points, liveMarkerPoints, latestRouteEndpointPoints],
  );
  const shouldUseAgencyFallback = resolvedViewportPoints.length === 0 && Boolean(agencyFallbackPoint);
  const viewportPoints = useMemo(
    () => (shouldUseAgencyFallback ? [agencyFallbackPoint] : resolvedViewportPoints),
    [agencyFallbackPoint, resolvedViewportPoints, shouldUseAgencyFallback],
  );
  const center = viewportPoints[0] || EMPTY_MAP_CENTER;

  useEffect(() => {
    if (!selectedPlace) return;
    setSelectedPoint({
      id: selectedPlace.id,
      lat: selectedPlace.lat,
      lng: selectedPlace.lng,
      title: selectedPlace.name,
      name: selectedPlace.name,
      description: selectedPlace.description,
      formattedAddress: selectedPlace.formattedAddress,
      placeSnapshotId: selectedPlace.placeSnapshotId ?? null,
      businessStatus: selectedPlace.businessStatus,
      businessStatusCheckedAt: selectedPlace.businessStatusCheckedAt ?? null,
      placeAdvisory: selectedPlace.placeAdvisory ?? null,
    });
  }, [selectedPlace]);


  const handleMarkerClick = useCallback((point) => {
    setSelectedPoint(point);
    onSelectPlace?.(point.id);
  }, [onSelectPlace]);
  const handleClientRoute = useCallback((polyline, status) => {
    setClientRoutePolyline(polyline);
    setClientRouteStatus(status);
  }, []);

  return (
    <div className={`absolute inset-0 ${isDark ? "bg-[#111827]" : "bg-[#f8fafc]"}`}>
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <GoogleMap
          defaultCenter={center}
          defaultZoom={center.lat !== 0 ? 13 : 2}
          mapId={isDark ? "dark_map_id_placeholder" : MAP_ID}
          colorScheme={isDark ? "DARK" : "LIGHT"}
          style={{ width: "100%", height: "100%" }}
          disableDefaultUI={false}
          gestureHandling="greedy"
          mapTypeControlOptions={{ position: 3 }}
          fullscreenControlOptions={{ position: 3 }}
          streetViewControlOptions={{ position: 9 }}
          zoomControlOptions={{ position: 9 }}
        >
          <MapHandler
            selectedPlaceId={selectedPlaceId}
            viewportPoints={viewportPoints}
            setSelectedPoint={setSelectedPoint}
            sidebarWidth={sidebarWidth}
            bottomPadding={mapBottomPadding}
          />
          <ResolveAgencyFallbackPoint
            fallback={agencyFallback}
            enabled={resolvedViewportPoints.length === 0}
            onResolved={setAgencyFallbackPoint}
          />
          <ResolveClientRoute
            points={points}
            enabled={shouldResolveClientRoute}
            onRoute={handleClientRoute}
          />
          {shouldFitViewportBounds(viewportPoints, shouldUseAgencyFallback) && (
            <FitBounds points={viewportPoints} sidebarWidth={sidebarWidth} bottomPadding={mapBottomPadding} />
          )}
          <FocusActiveStop points={points} activeIndex={activeIndex} sidebarWidth={sidebarWidth} />
          <FocusLiveMarker liveMarkers={liveMarkerPoints} />
          <FocusSelectedPlace selectedPlace={selectedPlace} sidebarWidth={sidebarWidth} bottomPadding={mapBottomPadding} />

          {/* Planned path fallback */}
          {shouldShowPlannedPathFallback({
            pointCount: points.length,
            routeSegmentCount: routeSegments.length,
            clientRouteStatus,
          }) && (
            <Polyline
              points={points}
              color="#3b82f6"
              weight={3}
              opacity={0.4}
              dashArray={true}
            />
          )}

          {/* Client-side road route fallback */}
          {clientRoutePolyline.length > 1 && (
            <Polyline
              points={clientRoutePolyline}
              color="#d77a61"
              weight={5}
              opacity={0.82}
              zIndex={20}
            />
          )}

          {/* Stored per-stop route paths */}
          {routeSegments.map((segment) => (
            <Polyline
              key={segment.id}
              points={segment.points}
              color="#d77a61"
              weight={5}
              opacity={0.82}
              zIndex={20}
            />
          ))}

          {/* Latest route estimate overlay */}
          {latestRoutePolyline.length > 1 && (
            <Polyline
              points={latestRoutePolyline}
              color="#2563eb"
              weight={6}
              opacity={0.95}
              zIndex={40}
            />
          )}

          {/* Itinerary Markers */}
          {points.map((point, index) => {
            const isActive = activeIndex === index || selectedPlaceId === point.id;
            // A closed stop stays visible and selectable; only its styling differs.
            const isClosed = Boolean(
              getPlaceStatusLabel({
                businessStatus: point.businessStatus,
                placeAdvisory: point.placeAdvisory
              })
            );
            return (
              <AdvancedMarker
                key={`point-${index}-${point.lat}-${point.lng}`}
                position={{ lat: point.lat, lng: point.lng }}
                title={getPinTitle(point, index)}
                onMouseEnter={() => onHoverItem?.(index)}
                onClick={() => {
                  handleMarkerClick(point);
                  onHoverItem?.(index);
                }}
              >
                <Pin
                  background={isActive ? "#2563eb" : isClosed ? "#fef3c7" : "#ffffff"}
                  borderColor={isActive ? "#1e3a8a" : isClosed ? "#92400e" : "#1e293b"}
                  glyphColor={isActive ? "#ffffff" : isClosed ? "#92400e" : "#1e293b"}
                  glyph={isClosed ? getClosedPinGlyph(index) : getMapPinGlyph(index)}
                  scale={isActive ? 1.2 : 1.0}
                />
              </AdvancedMarker>
            );
          })}

          {/* Live Resolution Markers */}
          {liveMarkerPoints.map((marker) => (
            <AdvancedMarker
              key={marker.id}
              position={{ lat: marker.lat, lng: marker.lng }}
              onClick={() => handleMarkerClick(marker)}
            >
              <Pin
                background={selectedPlaceId === marker.id ? "#2563eb" : "#d77a61"}
                borderColor="#b05b45"
                glyphColor="#ffffff"
                scale={selectedPlaceId === marker.id ? 1.22 : 1.1}
              />
            </AdvancedMarker>
          ))}

          {/* Latest route endpoints */}
          {latestRouteEndpointPoints.map((point) => (
            <AdvancedMarker
              key={point.id}
              position={{ lat: point.lat, lng: point.lng }}
              onClick={() => handleMarkerClick(point)}
            >
              <Pin
                background="#2563eb"
                borderColor="#1e3a8a"
                glyphColor="#ffffff"
                glyph={point.glyph}
                scale={1.15}
              />
            </AdvancedMarker>
          ))}

          {/* Agency fallback marker */}
          {shouldUseAgencyFallback && (
            <AdvancedMarker
              key={agencyFallbackPoint.id}
              position={{ lat: agencyFallbackPoint.lat, lng: agencyFallbackPoint.lng }}
              onClick={() => handleMarkerClick(agencyFallbackPoint)}
            >
              <Pin
                background="#0f3440"
                borderColor="#ffffff"
                glyphColor="#ffffff"
                scale={1.1}
              />
            </AdvancedMarker>
          )}

          {/* Glassmorphism detail card — anchored above the selected pin */}
          {selectedPoint && (
            <AdvancedMarker
              position={{ lat: selectedPoint.lat, lng: selectedPoint.lng }}
              zIndex={600}
            >
              <div style={{ marginBottom: "52px", width: "280px" }}>
                <div className="relative grid gap-2 p-4 rounded-[20px] bg-white/[0.11] backdrop-blur-xl border border-white/[0.22] shadow-[0_8px_32px_rgba(0,0,0,0.32)]">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedPoint(null); }}
                    aria-label="Close"
                    className={`absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 border-0 text-[18px] leading-none cursor-pointer hover:bg-white/20 transition-all flex items-center justify-center ${isDark ? "text-white/70 hover:text-white" : "text-[#1e293b]/60 hover:text-[#1e293b]"}`}
                  >×</button>

                  <div className="pr-8">
                    {selectedPoint.dayLabel ? (
                      <span className={`text-[10px] font-extrabold tracking-[0.1em] uppercase block mb-0.5 ${isDark ? "text-white/45" : "text-[#1e293b]/50"}`}>
                        {selectedPoint.dayLabel}
                      </span>
                    ) : null}
                    <h4 className={`m-0 text-[15px] font-bold leading-snug ${isDark ? "text-white" : "text-[#1e293b]"}`}>
                      {selectedPoint.title || selectedPoint.name}
                    </h4>
                  </div>

                  {(selectedPoint.rating || selectedPoint.placeType) && (
                    <p className={`m-0 text-[12px] ${isDark ? "text-white/60" : "text-[#475569]"}`}>
                      {selectedPoint.rating ? `★ ${selectedPoint.rating}` : ""}
                      {selectedPoint.rating && selectedPoint.placeType ? " · " : ""}
                      {selectedPoint.placeType || ""}
                    </p>
                  )}

                  {selectedPoint.timeLabel && (
                    <p className="m-0 text-[12px] font-bold text-[#ea7a5e]">
                      {selectedPoint.timeLabel}
                    </p>
                  )}

                  {(selectedPoint.formattedAddress || selectedPoint.description) && (
                    <p className={`m-0 text-[12px] leading-[1.45] ${isDark ? "text-white/55" : "text-[#475569]"}`}>
                      {selectedPoint.formattedAddress || selectedPoint.description}
                    </p>
                  )}
                </div>
              </div>
            </AdvancedMarker>
          )}

        </GoogleMap>
      </APIProvider>

      {!viewportPoints.length ? (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 grid gap-1.5 w-[min(320px,calc(100%-48px))] text-center p-6 border border-[rgba(226,232,240,0.8)] rounded-[20px] bg-white/95 backdrop-blur-[8px] text-[#0f172a] z-[500] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),_0_8px_10px_-6px_rgba(0,0,0,0.1)] pointer-events-none">
          <strong className="text-base font-semibold">
            {GOOGLE_MAPS_API_KEY ? "Map coordinates pending" : "Map unavailable"}
          </strong>
          <span className="text-[#64748b] text-[13px] leading-[1.5]">
            {GOOGLE_MAPS_API_KEY
              ? "Locations will appear after the backend resolves itinerary places."
              : "Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env to enable the map."}
          </span>
        </div>
      ) : null}

      <PlaceDetailPanel place={selectedPlace} onClose={() => onSelectPlace?.("")} />
      <RouteSummaryPanel route={latestRouteEstimate} />
    </div>
  );
}
