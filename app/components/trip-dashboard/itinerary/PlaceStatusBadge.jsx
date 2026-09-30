import { getPlaceStatusLabel } from "../../../lib/trip-dashboard/placeStatus.js";

/**
 * A small, static warning label shown beside a place name.
 *
 * Deliberately not animated: it is informational, appears wherever a place is
 * listed, and a reader may see dozens at once. It renders nothing at all when
 * there is nothing to warn about — an unknown status is unverified, never "open",
 * so there is no positive counterpart badge.
 *
 * `placeAdvisory` is a staff-only overlay; pass it only on authorized views.
 */
export default function PlaceStatusBadge({ businessStatus, placeAdvisory, className = "" }) {
  const label = getPlaceStatusLabel({ businessStatus, placeAdvisory });
  if (!label) return null;
  return (
    <span
      role="status"
      className={`inline-flex rounded-md border border-amber-700/30 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-950 ${className}`.trim()}
    >
      {label}
    </span>
  );
}
