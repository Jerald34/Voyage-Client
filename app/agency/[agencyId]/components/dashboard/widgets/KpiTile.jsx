"use client";
import { useId } from "react";

const UNIT_SHORT = { days: "d", h: "h" };
const MIN_VISIBLE_DELTA = 0.05;

/**
 * Compact KPI tile for the Insights column: label, value, and the change vs
 * the prior period in words ("+4.0 pts", "0.8d slower"), green when it is an
 * improvement and red when it is a regression. Static: not clickable.
 *
 * A null `value` means the period has no signal ("—", not a fake 0); a null
 * `deltaVsPrior` means there is nothing to compare against. Set
 * `lowerIsBetter` for times. `description` says what the number measures and
 * is announced as the tile's description.
 */
export default function KpiTile({
  label,
  value,
  unit,
  deltaVsPrior = 0,
  subtitle,
  description,
  lowerIsBetter = false,
  formatValue = (v) => v.toString(),
}) {
  const descriptionId = useId();
  const hasValue = value != null;
  const hasDelta = hasValue && deltaVsPrior != null;
  const formatted = hasValue ? formatValue(value) : "—";
  // A change under 0.05 would print as "0.0" (or a bare sign), so it reads as none.
  const hasChange = hasDelta && Math.abs(deltaVsPrior) >= MIN_VISIBLE_DELTA;
  const isUp = hasChange && deltaVsPrior > 0;
  const isDown = hasChange && deltaVsPrior < 0;
  const isImprovement = lowerIsBetter ? isDown : isUp;
  const isRegression = lowerIsBetter ? isUp : isDown;
  const magnitude = hasDelta ? Math.abs(deltaVsPrior).toFixed(1) : null;
  const pts = unit === "%" ? " pts" : "";

  // The visible change and what a screen reader hears use the same words.
  let deltaText;
  let spokenDelta;
  if (!hasValue) {
    deltaText = "No data yet";
    spokenDelta = "no data yet";
  } else if (!hasDelta) {
    deltaText = "No prior data";
    spokenDelta = "no prior period data";
  } else if (!hasChange) {
    deltaText = "No change";
    spokenDelta = "no change from the prior period";
  } else if (lowerIsBetter) {
    deltaText = `${magnitude}${UNIT_SHORT[unit] ?? ""} ${isUp ? "slower" : "faster"}`;
    spokenDelta = `${deltaText} than the prior period`;
  } else {
    deltaText = `${isUp ? "+" : "−"}${magnitude}${pts}`;
    spokenDelta = `${isUp ? "up" : "down"} ${magnitude}${pts} from the prior period`;
  }

  const deltaColor = isImprovement
    ? "text-[color:var(--success)]"
    : isRegression
      ? "text-[color:var(--danger)]"
      : "text-text-muted";

  const a11yLabel = hasValue ? `${label}: ${formatted}${unit ?? ""}, ${spokenDelta}` : `${label}: ${spokenDelta}`;

  return (
    <div
      role="group"
      aria-label={a11yLabel}
      aria-describedby={description ? descriptionId : undefined}
      className="frame-tile min-w-0 rounded-[14px] p-3"
    >
      <span className="block truncate text-[12px] font-semibold text-text-muted">{label}</span>
      <span className="mt-1 flex items-baseline gap-1">
        <span className="text-[22px] font-semibold leading-none tabular-nums text-text-primary">{formatted}</span>
        {unit && hasValue ? <span className="text-xs text-text-muted">{unit}</span> : null}
      </span>
      <span className={`mt-1.5 block truncate text-[12px] font-semibold tabular-nums ${deltaColor}`}>{deltaText}</span>
      {subtitle ? <span className="block truncate text-[12px] text-text-muted">{subtitle}</span> : null}
      {description ? (
        <span id={descriptionId} className="sr-only">
          {description}
        </span>
      ) : null}
    </div>
  );
}
