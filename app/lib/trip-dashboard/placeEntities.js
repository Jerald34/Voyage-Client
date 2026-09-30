import { normalizeBusinessStatus } from "./placeStatus.js";

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isWordCharacter(value) {
  return /[A-Za-z0-9_]/.test(value);
}

export function getItineraryPlaceEntityId(item, day, itemIndex) {
  const snapshot = item?.placeSnapshot;
  const stableId =
    item?.placeSnapshotId ||
    snapshot?.id ||
    item?.id ||
    `${day?.id ?? day?.dayNumber ?? "day"}:${itemIndex}:${normalizeKey(snapshot?.name || item?.placeName || item?.title)}`;

  return `itinerary:${stableId}`;
}

function getTimeLabel(item) {
  if (typeof item?.time === "string" && item.time.trim()) return normalizeText(item.time);
  if (item?.startTime && item?.endTime) return `${item.startTime} - ${item.endTime}`;
  if (item?.startTime) return normalizeText(item.startTime);
  if (item?.endTime) return `Ends ${normalizeText(item.endTime)}`;
  return "";
}

function addUniquePlace(places, seen, place) {
  const key = place.id || `${normalizeKey(place.name)}:${place.lat}:${place.lng}`;
  if (!place.name || !Number.isFinite(place.lat) || !Number.isFinite(place.lng) || seen.has(key)) {
    return;
  }

  seen.add(key);
  places.push(place);
}

export function buildPlaceEntities({ itinerary, liveMarkers } = {}) {
  const places = [];
  const seen = new Set();
  const days = Array.isArray(itinerary?.days) ? itinerary.days : [];
  let itineraryIndex = 0;

  for (const day of days) {
    const items = Array.isArray(day?.items) ? day.items : [];
    items.forEach((item, itemIndex) => {
      const snapshot = item?.placeSnapshot;
      const lat = toNumber(snapshot?.latitude ?? item?.latitude ?? item?.lat);
      const lng = toNumber(snapshot?.longitude ?? item?.longitude ?? item?.lng);
      const name = normalizeText(snapshot?.name || item?.placeName || item?.title);

      addUniquePlace(places, seen, {
        id: getItineraryPlaceEntityId(item, day, itemIndex),
        source: "itinerary",
        name,
        formattedAddress: normalizeText(snapshot?.formattedAddress || item?.formattedAddress || ""),
        lat,
        lng,
        dayLabel: day?.dayNumber ? `Day ${day.dayNumber}` : normalizeText(day?.title || ""),
        timeLabel: getTimeLabel(item),
        description: normalizeText(item?.description || ""),
        itineraryIndex,
        placeSnapshotId: item?.placeSnapshotId || snapshot?.id || null,
        // Provider status stays absent when unrecognized: never an "open" badge.
        businessStatus: normalizeBusinessStatus(snapshot?.businessStatus),
        businessStatusCheckedAt: snapshot?.businessStatusCheckedAt ?? null,
        // Staff-only overlay. Public payloads never carry it, so it stays null there.
        placeAdvisory: item?.placeAdvisory ?? null,
      });

      itineraryIndex += 1;
    });
  }

  const markers = Array.isArray(liveMarkers) ? liveMarkers : [];
  markers.forEach((marker, index) => {
    const lat = toNumber(marker?.lat ?? marker?.latitude);
    const lng = toNumber(marker?.lng ?? marker?.longitude);
    const name = normalizeText(marker?.name || marker?.title || marker?.formattedAddress || marker?.address || `Resolved location ${index + 1}`);

    addUniquePlace(places, seen, {
      id: `live:${marker?.id || marker?.placeSnapshotId || `${name}:${lat}:${lng}:${index}`}`,
      source: "live",
      name,
      formattedAddress: normalizeText(marker?.formattedAddress || marker?.address || ""),
      lat,
      lng,
      dayLabel: "Live result",
      timeLabel: "",
      description: "",
      itineraryIndex: null,
      placeSnapshotId: marker?.placeSnapshotId || null,
      businessStatus: normalizeBusinessStatus(marker?.businessStatus),
      businessStatusCheckedAt: marker?.businessStatusCheckedAt ?? null,
      placeAdvisory: marker?.placeAdvisory ?? null,
    });
  });

  return places;
}

export function matchPlaceMentions(content, placeEntities = []) {
  const text = String(content ?? "");
  if (!text || !Array.isArray(placeEntities) || placeEntities.length === 0) {
    return [{ type: "text", text }];
  }

  const candidates = placeEntities
    .filter((place) => normalizeText(place?.name).length > 0)
    .sort((a, b) => normalizeText(b.name).length - normalizeText(a.name).length);

  const matches = [];
  for (const place of candidates) {
    const name = normalizeText(place.name);
    const regex = new RegExp(escapeRegExp(name), "gi");
    let match;
    while ((match = regex.exec(text)) !== null) {
      const before = match.index > 0 ? text[match.index - 1] : "";
      const afterIndex = match.index + match[0].length;
      const after = afterIndex < text.length ? text[afterIndex] : "";
      if ((before && isWordCharacter(before)) || (after && isWordCharacter(after))) {
        continue;
      }
      if (matches.some((existing) => match.index < existing.end && afterIndex > existing.start)) {
        continue;
      }
      matches.push({ type: "place", text: match[0], place, start: match.index, end: afterIndex });
    }
  }

  if (matches.length === 0) {
    return [{ type: "text", text }];
  }

  matches.sort((a, b) => a.start - b.start);
  const segments = [];
  let cursor = 0;
  matches.forEach((match) => {
    if (match.start > cursor) {
      segments.push({ type: "text", text: text.slice(cursor, match.start) });
    }
    segments.push(match);
    cursor = match.end;
  });
  if (cursor < text.length) {
    segments.push({ type: "text", text: text.slice(cursor) });
  }

  return segments;
}

export function getMatchedPlaces(content, placeEntities = [], limit = 4) {
  const seen = new Set();
  return matchPlaceMentions(content, placeEntities)
    .filter((segment) => segment.type === "place" && segment.place?.id)
    .map((segment) => segment.place)
    .filter((place) => {
      if (seen.has(place.id)) return false;
      seen.add(place.id);
      return true;
    })
    .slice(0, limit);
}

export function getGoogleMapsPlaceUrl(place) {
  const lat = toNumber(place?.lat);
  const lng = toNumber(place?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  const query = encodeURIComponent(`${place?.name || "Place"} ${lat},${lng}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
