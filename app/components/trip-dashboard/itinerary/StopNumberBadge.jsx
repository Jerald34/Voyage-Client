import { getDayColor } from "../../../lib/trip-dashboard/dayColors.js";

/**
 * A stop's number within its day, in the day's colour: the same number and
 * colour its pin shows on the map.
 */
export default function StopNumberBadge({ dayNumber, stopNumber, className = "" }) {
  if (!Number.isInteger(stopNumber) || stopNumber < 1) return null;
  const color = getDayColor(dayNumber);

  return (
    <span
      className={`inline-flex h-6 min-w-6 flex-shrink-0 items-center justify-center rounded-full px-1.5 text-[0.72rem] font-bold leading-none tabular-nums ${
        color ? "text-white" : "border border-border/30 bg-surface-elevated text-text-primary"
      } ${className}`}
      style={color ? { backgroundColor: color.fill } : undefined}
    >
      <span aria-hidden="true">{stopNumber}</span>
      <span className="sr-only">Stop {stopNumber}</span>
    </span>
  );
}
