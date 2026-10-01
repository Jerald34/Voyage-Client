import WeatherIcon from "./WeatherIcon.jsx";
import { describeDayWeather } from "../../lib/weather/weatherDisplay.js";

/**
 * One-line weather for a day card. Renders nothing when the server had nothing
 * to report, so undated or stop-less days stay clean. Static on purpose: it
 * repeats on every day, like the place status badge.
 */
export default function WeatherChip({ entry, className = "" }) {
  const display = describeDayWeather(entry);
  if (!display) return null;

  const tone = display.isWet
    ? "border-sky-700/25 bg-sky-50 text-sky-900 dark:border-sky-300/25 dark:bg-sky-400/10 dark:text-sky-100"
    : "border-border/30 bg-surface text-text-muted";

  return (
    <span
      title={display.ariaLabel}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-[0.7rem] font-semibold leading-tight ${display.isTypical ? "border-dashed" : ""} ${tone} ${className}`.trim()}
    >
      <WeatherIcon condition={display.condition} size={13} className="flex-shrink-0" />
      <span className="sr-only">{display.ariaLabel}</span>
      <span aria-hidden="true" className="truncate">
        {display.isTypical ? "Typical · " : ""}
        {display.compactText || display.label}
      </span>
    </span>
  );
}
