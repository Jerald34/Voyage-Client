/**
 * Request-level verification warnings for an authenticated itinerary, shown above
 * the itinerary itself.
 *
 * The important case is NOTES_UNAVAILABLE: the read could not confirm the
 * agency's own restrictions, so staff should review before confirming. It is
 * derived from the response, not stored, so it survives a re-fetch that still
 * fails and disappears on the first read where notes load.
 *
 * Public share views never receive `placeAdvisories`, so this renders nothing there.
 */
export default function PlaceAdvisoryNotice({ advisories, className = "" }) {
  const entries = Array.isArray(advisories) ? advisories.filter((entry) => entry?.label) : [];
  if (entries.length === 0) return null;

  return (
    <div
      role="status"
      className={`rounded-lg border border-amber-700/30 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950 ${className}`.trim()}
    >
      {entries.map((entry, index) => (
        <p key={entry.reason ?? index} className={index > 0 ? "mt-1" : ""}>
          {entry.label}
        </p>
      ))}
    </div>
  );
}
