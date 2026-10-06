"use client";

import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";

export function FitBounds({ points, sidebarWidth, bottomPadding = 0 }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !points.length) return;

    const bounds = new google.maps.LatLngBounds();
    points.forEach((point) => bounds.extend(point));

    map.fitBounds(bounds, {
      top: 60,
      right: 60,
      bottom: bottomPadding > 0 ? bottomPadding + 20 : 60,
      left: sidebarWidth > 0 ? sidebarWidth + 40 : 60,
    });
  }, [map, points, sidebarWidth, bottomPadding]);

  return null;
}

export function FocusActiveStop({ points, activeIndex, sidebarWidth }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !Number.isInteger(activeIndex) || activeIndex < 0) return;
    // activeIndex is a list position; a stop with no location has no point, so
    // match on the point's own list position rather than its array slot.
    const activePoint = points.find((point) => point.itemIndex === activeIndex);
    if (!activePoint) return;

    map.panTo(activePoint);
    if (sidebarWidth > 0) map.panBy(-(sidebarWidth / 2), 0);
    const currentZoom = map.getZoom();
    if (currentZoom < 14) {
      map.setZoom(14);
    }
  }, [activeIndex, map, points, sidebarWidth]);

  return null;
}

export function FocusLiveMarker({ liveMarkers }) {
  const map = useMap();
  const latestMarker = liveMarkers[liveMarkers.length - 1] || null;

  useEffect(() => {
    if (!map || !latestMarker) return;
    map.panTo({ lat: latestMarker.lat, lng: latestMarker.lng });
    map.setZoom(15);
  }, [latestMarker, map]);

  return null;
}

export function FocusSelectedPlace({ selectedPlace, sidebarWidth, bottomPadding = 0 }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !selectedPlace) return;
    map.panTo({ lat: selectedPlace.lat, lng: selectedPlace.lng });
    if (sidebarWidth > 0) map.panBy(-(sidebarWidth / 2), 0);
    if (bottomPadding > 0) {
      map.panBy(0, Math.min(260, Math.round(bottomPadding * 0.5)));
    }
    const currentZoom = map.getZoom();
    if (!currentZoom || currentZoom < 15) {
      map.setZoom(15);
    }
  }, [bottomPadding, map, selectedPlace, sidebarWidth]);

  return null;
}

export function MapHandler({ selectedPlaceId, viewportPoints, setSelectedPoint, sidebarWidth, bottomPadding = 0 }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedPlaceId) {
      setSelectedPoint(null);
      return;
    }

    const point = viewportPoints.find((p) => p.id === selectedPlaceId);
    if (point) {
      setSelectedPoint(point);
      if (map) {
        map.panTo({ lat: point.lat, lng: point.lng });
        if (sidebarWidth > 0) map.panBy(-(sidebarWidth / 2), 0);
        if (bottomPadding > 0) {
          map.panBy(0, Math.min(260, Math.round(bottomPadding * 0.5)));
        }
        const currentZoom = map.getZoom();
        if (!currentZoom || currentZoom < 14) {
          map.setZoom(14);
        }
      }
    }
  }, [bottomPadding, selectedPlaceId, viewportPoints, map, setSelectedPoint, sidebarWidth]);

  return null;
}
