import AccessibilityIcon from "./AccessibilityIcon.jsx";
import { getAccessibilityBadges } from "../../lib/accessibility/placeAccessibility.js";

const TONES = {
  positive:
    "border-emerald-700/25 bg-emerald-50 text-emerald-900 dark:border-emerald-300/25 dark:bg-emerald-400/10 dark:text-emerald-100",
  // Same treatment as PlaceStatusBadge: a caution, never an alarm. Its light fill
  // and dark text are self-contained, so it reads the same in both themes.
  warning: "border-amber-700/30 bg-amber-100 text-amber-950",
  neutral: "border-border/30 bg-surface text-text-muted",
};

/**
 * Static, repeated per stop like PlaceStatusBadge. Pass `badges` (precomputed)
 * or `snapshot`. Renders nothing for a place that was never checked.
 */
export default function AccessibilityBadges({ snapshot = null, badges = null, className = "" }) {
  const list = Array.isArray(badges) ? badges : getAccessibilityBadges(snapshot);
  if (list.length === 0) return null;

  return (
    <ul aria-label="Accessibility" className={`m-0 flex list-none flex-wrap gap-1 p-0 ${className}`.trim()}>
      {list.map((badge) => (
        <li
          key={badge.key}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${TONES[badge.tone] ?? TONES.neutral}`}
        >
          <AccessibilityIcon size={12} className="flex-shrink-0" />
          {badge.label}
        </li>
      ))}
    </ul>
  );
}
