"use client";

import { useEffect } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { buildClientRouteRequest } from "../ItineraryLiveMap.jsx";

function latLngToPoint(latLng) {
  if (!latLng) return null;

  const lat = typeof latLng.lat === "function" ? latLng.lat() : Number(latLng.lat);
  const lng = typeof latLng.lng === "function" ? latLng.lng() : Number(latLng.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

// The map renders one of these per itinerary day; `routeKey` tells the parent
// which day's route each result belongs to.
export function ResolveClientRoute({ routeKey = "route", points, enabled, onRoute }) {
  const routes = useMapsLibrary("routes");

  useEffect(() => {
    if (!enabled || !Array.isArray(points) || points.length <= 1) {
      onRoute(routeKey, [], "idle");
      return;
    }

    const Route = routes?.Route ?? globalThis.google?.maps?.routes?.Route;
    const TravelMode = routes?.TravelMode ?? globalThis.google?.maps?.TravelMode;

    if (!Route || !TravelMode) {
      onRoute(routeKey, [], routes ? "unavailable" : "loading");
      return;
    }

    let cancelled = false;
    onRoute(routeKey, [], "loading");

    const request = buildClientRouteRequest(points, TravelMode.DRIVING ?? "DRIVING");
    if (!request) {
      onRoute(routeKey, [], "failed");
      return;
    }

    Promise.resolve(Route.computeRoutes(request))
      .then((response) => {
        if (cancelled) return;

        const route = response?.routes?.[0];
        const routePath = route?.path;
        if (!Array.isArray(routePath) || routePath.length <= 1) {
          onRoute(routeKey, [], "failed");
          return;
        }

        onRoute(routeKey, routePath.map(latLngToPoint).filter(Boolean), "ready");
      })
      .catch(() => {
        if (cancelled) return;
        onRoute(routeKey, [], "failed");
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, onRoute, points, routeKey, routes]);

  return null;
}

export function ResolveAgencyFallbackPoint({ fallback, enabled, onResolved }) {
  const map = useMap();
  const geocoding = useMapsLibrary("geocoding");

  useEffect(() => {
    if (!enabled || !fallback) {
      onResolved(null);
      return;
    }

    if (Number.isFinite(fallback.lat) && Number.isFinite(fallback.lng)) {
      const point = {
        id: fallback.id,
        name: fallback.label,
        title: fallback.label,
        description: "Agency registered location",
        formattedAddress: fallback.query,
        lat: fallback.lat,
        lng: fallback.lng,
        source: "agency",
      };
      onResolved(point);
      if (map) {
        map.panTo({ lat: point.lat, lng: point.lng });
        map.setZoom(11);
      }
      return;
    }

    if (!geocoding || !fallback.query) return;

    let cancelled = false;
    const geocoder = new geocoding.Geocoder();
    geocoder.geocode({ address: fallback.query }, (results, status) => {
      if (cancelled) return;
      if (status !== "OK" || !Array.isArray(results) || !results[0]?.geometry?.location) {
        onResolved(null);
        return;
      }

      const location = results[0].geometry.location;
      const point = {
        id: fallback.id,
        name: fallback.label,
        title: fallback.label,
        description: "Agency registered location",
        formattedAddress: results[0].formatted_address || fallback.query,
        lat: location.lat(),
        lng: location.lng(),
        source: "agency",
      };

      onResolved(point);
      if (map) {
        map.panTo({ lat: point.lat, lng: point.lng });
        map.setZoom(11);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, fallback, geocoding, map, onResolved]);

  return null;
}
