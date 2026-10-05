import { getSnapshotPhotoUrl } from "../../../lib/trip-dashboard/richItinerary.js";
import PlaceStatusBadge from "../itinerary/PlaceStatusBadge.jsx";
import AccessibilityBadges from "../../accessibility/AccessibilityBadges.jsx";
import { getPrimaryAccessibilityBadge } from "../../../lib/accessibility/placeAccessibility.js";

export default function CompactPlaceCard({
  item,
  isSelected = false,
  onSelect,
  // Optional controls (the stop menu). They sit beside the card's button, never
  // inside it: a button can't contain another button.
  actions = null,
}) {
  const snapshot = item?.placeSnapshot ?? null;
  const photoUrl = getSnapshotPhotoUrl(snapshot);
  // Space is tight on the compact card: one badge, the most important. Inline spans, as this is inside a button.
  const primaryBadge = getPrimaryAccessibilityBadge(snapshot);
  const placeName = snapshot?.name || item?.placeName || item?.title || "Untitled";
  const timeLabel =
    item?.startTime && item?.endTime
      ? `${item.startTime} - ${item.endTime}`
      : item?.startTime || "";

  const card = (
    <button
      type="button"
      onClick={() => onSelect?.(item)}
      className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-2xl border transition-all duration-200 backdrop-blur-md ${
        isSelected
          ? "ring-2 ring-secondary/35 border-secondary/30 bg-[rgba(255,255,255,0.10)] shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
          : "border-white/10 bg-[rgba(255,255,255,0.06)] shadow-[0_14px_30px_rgba(15,23,42,0.12)] hover:border-white/15 hover:bg-[rgba(255,255,255,0.09)]"
      } ${actions ? "pr-12" : ""}`}
    >
      {/* Thumbnail */}
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={placeName}
          className="w-14 h-14 rounded-xl object-cover flex-shrink-0 shadow-sm"
        />
      ) : (
        <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center bg-[rgba(255,255,255,0.08)] text-text-soft text-lg font-semibold border border-white/10 backdrop-blur-md">
          {placeName.slice(0, 1).toUpperCase()}
        </div>
      )}

      {/* Info */}
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-[0.875rem] font-semibold text-text-primary leading-tight line-clamp-2">
          {placeName}
        </span>
        <PlaceStatusBadge
          businessStatus={snapshot?.businessStatus}
          placeAdvisory={item?.placeAdvisory}
          className="self-start"
        />
        <AccessibilityBadges badges={primaryBadge ? [primaryBadge] : []} inline className="self-start" />
        {timeLabel && (
          <span className="text-[0.75rem] text-secondary font-semibold leading-tight">
            {timeLabel}
          </span>
        )}
      </div>
    </button>
  );
  if (!actions) return card;
  return (
    <div className="relative">
      {card}
      <div className="absolute right-2 top-2">{actions}</div>
    </div>
  );
}
