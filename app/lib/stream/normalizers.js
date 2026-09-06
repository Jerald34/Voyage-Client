/**
 * Normalizer functions for SSE stream payloads.
 * Extracted from useAgentRunStream.js for testability.
 */
import { normalizeBusinessStatus } from "../trip-dashboard/placeStatus.js";

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * Normalize a raw map marker payload from the SSE stream into a
 * consistent shape used by the map renderer.
 */
export function normalizeMapMarker(payload, index) {
  const lat = toNumber(payload?.lat ?? payload?.latitude);
  const lng = toNumber(payload?.lng ?? payload?.longitude);

  if (lat == null || lng == null) {
    return null;
  }

  const name = String(
    payload?.name ||
      payload?.title ||
      payload?.formattedAddress ||
      payload?.address ||
      `Resolved location ${index + 1}`,
  ).trim();

  const formattedAddress = String(
    payload?.formattedAddress || payload?.address || "",
  ).trim();

  return {
    id: String(
      payload?.id ||
        payload?.placeSnapshotId ||
        `${name}-${lat}-${lng}-${index}`,
    ),
    name,
    formattedAddress,
    lat,
    lng,
    provider: payload?.provider ?? null,
    // The display id above can be a synthesized fallback, so keep the snapshot id
    // separately: reconciling a live marker against a saved stop needs the real one.
    placeSnapshotId: payload?.placeSnapshotId ?? null,
    // A missing status stays undefined rather than becoming anything the UI could
    // read as "open".
    businessStatus: normalizeBusinessStatus(payload?.businessStatus),
    businessStatusCheckedAt: payload?.businessStatusCheckedAt ?? null,
  };
}

/**
 * Normalize a raw route estimate payload from the SSE stream.
 */
export function normalizeRouteEstimate(payload, index) {
  if (!payload) {
    return null;
  }

  return {
    id: String(payload?.id || `route-${index}-${Date.now()}`),
    origin: payload?.origin ?? null,
    destination: payload?.destination ?? null,
    distanceMeters: toNumber(payload?.distanceMeters),
    durationSeconds: toNumber(payload?.durationSeconds),
    staticDurationSeconds: toNumber(payload?.staticDurationSeconds),
    travelMode: payload?.travelMode ?? null,
    polyline: payload?.polyline ?? null,
  };
}
