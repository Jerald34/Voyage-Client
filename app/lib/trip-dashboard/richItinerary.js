import { getItineraryPlaceEntityId } from "./placeEntities.js";
import { getPlaceStatusLabel, normalizeBusinessStatus } from "./placeStatus.js";
import { getAccessibilityBadges } from "../accessibility/placeAccessibility.js";

function normalizeText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function titleCaseType(value) {
  return normalizeText(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getTimeLabel(item) {
  if (typeof item?.time === "string" && item.time.trim()) return normalizeText(item.time);
  if (item?.startTime && item?.endTime) return `${normalizeText(item.startTime)} - ${normalizeText(item.endTime)}`;
  if (item?.startTime) return normalizeText(item.startTime);
  if (item?.endTime) return `Ends ${normalizeText(item.endTime)}`;
  return "Time pending";
}

function getPlaceName(item) {
  return normalizeText(item?.placeSnapshot?.name || item?.placeName || item?.title || "Untitled stop");
}

function getHighlights(item) {
  if (Array.isArray(item?.highlights)) {
    return item.highlights.map(normalizeText).filter(Boolean);
  }
  if (Array.isArray(item?.metadata?.highlights)) {
    return item.metadata.highlights.map(normalizeText).filter(Boolean);
  }
  return [];
}

export function getSnapshotPhotoUrl(placeSnapshot) {
  const metadata = placeSnapshot?.metadata ?? {};
  if (typeof metadata.primaryPhotoUrl === "string" && metadata.primaryPhotoUrl.trim()) {
    return metadata.primaryPhotoUrl.trim();
  }
  if (Array.isArray(metadata.photoUrls) && typeof metadata.photoUrls[0] === "string" && metadata.photoUrls[0].trim()) {
    return metadata.photoUrls[0].trim();
  }
  if (typeof placeSnapshot?.primaryPhotoUrl === "string" && placeSnapshot.primaryPhotoUrl.trim()) {
    return placeSnapshot.primaryPhotoUrl.trim();
  }
  if (typeof placeSnapshot?.photoUrl === "string" && placeSnapshot.photoUrl.trim()) {
    return placeSnapshot.photoUrl.trim();
  }
  return "";
}

export function getReadablePlaceType(placeSnapshot) {
  const metadata = placeSnapshot?.metadata ?? {};
  const googleTypes = Array.isArray(metadata.googleTypes) ? metadata.googleTypes : [];
  const firstType = googleTypes.find((type) => !["point_of_interest", "establishment"].includes(String(type)));
  return titleCaseType(firstType || placeSnapshot?.type || metadata.type || "");
}

export function buildRichItinerarySections({ itinerary, placeEntities } = {}) {
  const selectablePlaces = new Map(
    (Array.isArray(placeEntities) ? placeEntities : [])
      .filter((place) => place?.id && Number.isFinite(toNumber(place.lat)) && Number.isFinite(toNumber(place.lng)))
      .map((place) => [place.id, place]),
  );
  const days = Array.isArray(itinerary?.days) ? itinerary.days : [];

  return {
    title: normalizeText(itinerary?.title || itinerary?.trip?.title || "Generated itinerary"),
    summary: normalizeText(itinerary?.summary || itinerary?.trip?.summary || itinerary?.trip?.destination || ""),
    days: days.map((day, dayIndex) => {
      const items = Array.isArray(day?.items) ? day.items : [];
      return {
        id: day?.id || `day-${dayIndex + 1}`,
        title: normalizeText(day?.title || ""),
        label: day?.dayNumber ? `Day ${day.dayNumber}` : `Day ${dayIndex + 1}`,
        stops: items.map((item, itemIndex) => {
          const placeId = getItineraryPlaceEntityId(item, day, itemIndex);
          const place = selectablePlaces.get(placeId) ?? null;
          const snapshot = item?.placeSnapshot ?? null;
          const title = normalizeText(item?.title || getPlaceName(item));
          const placeName = getPlaceName(item);
          const userRatingCount = snapshot?.metadata?.userRatingCount;
          const rating = snapshot?.rating ?? snapshot?.metadata?.rating ?? null;

          return {
            id: item?.id || `${day?.id || dayIndex}:${itemIndex}`,
            placeId,
            title,
            placeName,
            timeLabel: getTimeLabel(item),
            photoUrl: getSnapshotPhotoUrl(snapshot),
            rating: rating ? normalizeText(rating) : "",
            userRatingCount: Number.isFinite(Number(userRatingCount)) ? Number(userRatingCount) : null,
            placeType: getReadablePlaceType(snapshot),
            // `statusLabel` keeps its existing mapped/location-pending meaning.
            statusLabel: place ? "Mapped" : "Location pending",
            // Closure is a SEPARATE axis and gets its own label, so neither
            // meaning overwrites the other.
            businessStatus: normalizeBusinessStatus(snapshot?.businessStatus),
            businessStatusCheckedAt: snapshot?.businessStatusCheckedAt ?? null,
            placeAdvisory: item?.placeAdvisory ?? null,
            closureLabel: getPlaceStatusLabel({
              businessStatus: normalizeBusinessStatus(snapshot?.businessStatus),
              placeAdvisory: item?.placeAdvisory ?? null
            }),
            accessibilityBadges: getAccessibilityBadges(snapshot),
            description: normalizeText(item?.description || snapshot?.formattedAddress || ""),
            highlights: getHighlights(item),
            isSelectable: Boolean(place),
          };
        }),
      };
    }),
  };
}
