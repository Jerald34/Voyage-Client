"use client";
import Sparkline from "./Sparkline";

/**
 * KPI tile — 120px fixed height, label + period chip on top,
 * hero number with tabular-nums + delta chip, 32px sparkline.
 *
 * Whole tile is a button (≥44pt effective hit area). On click, the
 * parent opens the side-panel listing of contributing trips.
 *
 * A null `value` means the period has no signal (renders "—", not a fake 0);
 * a null `deltaVsPrior` means there is nothing to compare against. Set
 * `lowerIsBetter` for metrics like response time, so a rise reads as a
 * regression.
 *
 * Spec §6.4
 */
export default function KpiTile({
  label,
  value,
  unit,
  deltaVsPrior = 0,
  sparkline = [],
  subtitle,
  ariaLabel,
  onClick,
  lowerIsBetter = false,
  formatValue = (v) => v.toString()
}) {
  const hasValue = value != null;
  const hasDelta = hasValue && deltaVsPrior != null;
  const formatted = hasValue ? formatValue(value) : "—";
  const isUp = hasDelta && deltaVsPrior > 0;
  const isDown = hasDelta && deltaVsPrior < 0;
  const isImprovement = lowerIsBetter ? isDown : isUp;
  const isRegression = lowerIsBetter ? isUp : isDown;
  const deltaIcon = isUp ? "▲" : isDown ? "▼" : "•";
  const deltaColor = isImprovement
    ? "text-[color:var(--success)]"
    : isRegression
      ? "text-[color:var(--danger)]"
      : "text-text-muted";
  const deltaText = hasDelta
    ? `${Math.abs(deltaVsPrior).toFixed(1)}${unit === "%" ? " pts" : ""}`
    : hasValue
      ? "No prior data"
      : "No data yet";

  const a11yLabel =
    ariaLabel ??
    (!hasValue
      ? `${label}: no data yet`
      : `${label}: ${formatted}${unit ?? ""}, ${
          hasDelta
            ? `${isUp ? "up" : isDown ? "down" : "unchanged"} ${deltaText} vs prior period`
            : "no prior period data"
        }`);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={a11yLabel}
      className="group relative flex h-[120px] w-full flex-col justify-between dashboard-card p-4 text-left transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
      style={{ transitionTimingFunction: "var(--ease-out)", transitionDuration: "160ms" }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="dashboard-eyebrow font-extrabold">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span className="text-[28px] font-semibold leading-none tabular-nums text-text-primary">{formatted}</span>
          {unit && hasValue ? <span className="text-sm text-text-muted">{unit}</span> : null}
        </div>
        <Sparkline values={sparkline} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className={`flex items-center gap-1 tabular-nums font-bold ${deltaColor}`}>
          {hasDelta ? <span aria-hidden="true">{deltaIcon}</span> : null}
          {deltaText}
        </span>
        {subtitle ? <span className="text-text-muted">{subtitle}</span> : null}
      </div>
    </button>
  );
}
