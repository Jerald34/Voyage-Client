import WeatherIcon from "./WeatherIcon.jsx";
import { describeStopWeather } from "../../lib/weather/weatherDisplay.js";

// The accessibility badges' treatments: dry reads positive, storms a caution (never an alarm).
// The storm tone's light fill and dark text are self-contained, so it reads the same in both themes.
const TONES = {
  dry: "border-emerald-700/25 bg-emerald-50 text-emerald-900 dark:border-emerald-300/25 dark:bg-emerald-400/10 dark:text-emerald-100",
  wet: "border-sky-700/25 bg-sky-50 text-sky-900 dark:border-sky-300/25 dark:bg-sky-400/10 dark:text-sky-100",
  storm: "border-amber-700/30 bg-amber-100 text-amber-950",
};

/**
 * The weather during one stop, from its day's hourly forecast. Spans only, so it
 * can sit inside the mobile card's button. Renders nothing without hourly data.
 */
export default function StopWeatherTag({ entry, itemId, className = "" }) {
  const display = describeStopWeather(entry, itemId);
  if (!display) return null;

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-[0.7rem] font-semibold leading-tight ${TONES[display.tone] ?? TONES.wet} ${className}`.trim()}
    >
      <WeatherIcon condition={display.condition} size={12} className="flex-shrink-0" />
      <span className="sr-only">{display.ariaLabel}</span>
      <span aria-hidden="true" className="truncate">
        {display.label}
      </span>
    </span>
  );
}
