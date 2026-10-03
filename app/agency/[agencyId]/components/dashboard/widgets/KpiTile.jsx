"use client";
import { useId } from "react";

const UNIT_SHORT = { days: "d", h: "h" };

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
  const isUp = hasDelta && deltaVsPrior > 0;
  const isDown = hasDelta && deltaVsPrior < 0;
  const isImprovement = lowerIsBetter ? isDown : isUp;
  const isRegression = lowerIsBetter ? isUp : isDown;
  const magnitude = hasDelta ? Math.abs(deltaVsPrior).toFixed(1) : null;

  let deltaText;
  if (!hasValue) deltaText = "No data yet";
  else if (!hasDelta) deltaText = "No prior data";
  else if (!isUp && !isDown) deltaText = "No change";
  else if (lowerIsBetter) deltaText = `${magnitude}${UNIT_SHORT[unit] ?? ""} ${isUp ? "slower" : "faster"}`;
  else deltaText = `${isUp ? "+" : "−"}${magnitude}${unit === "%" ? " pts" : ""}`;

  const deltaColor = isImprovement
    ? "text-[color:var(--success)]"
    : isRegression
      ? "text-[color:var(--danger)]"
      : "text-text-muted";

  const a11yLabel = !hasValue
    ? `${label}: no data yet`
    : `${label}: ${formatted}${unit ?? ""}, ${
        hasDelta
          ? `${isUp ? "up" : isDown ? "down" : "unchanged"} ${magnitude}${unit === "%" ? " pts" : ""} vs prior period`
          : "no prior period data"
      }`;

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
