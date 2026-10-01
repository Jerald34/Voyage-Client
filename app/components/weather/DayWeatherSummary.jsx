import WeatherAttribution from "./WeatherAttribution.jsx";
import WeatherIcon from "./WeatherIcon.jsx";
import { describeDayWeather } from "../../lib/weather/weatherDisplay.js";

/** Day view summary: condition, temperature, rain, practical advice and credit. */
export default function DayWeatherSummary({ entry, attribution = null, className = "" }) {
  const display = describeDayWeather(entry);
  if (!display) return null;

  return (
    <section
      aria-label="Day weather"
      className={`flex items-start gap-3 rounded-md border border-border/15 bg-surface/60 px-3.5 py-3 ${className}`.trim()}
    >
      <span
        className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${display.isWet ? "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-100" : "bg-secondary/10 text-secondary"}`}
      >
        <WeatherIcon condition={display.condition} size={17} />
      </span>
      <div className="grid min-w-0 gap-1">
        <p className="m-0 text-[0.85rem] font-bold text-text-primary">
          {display.isTypical ? "Typical weather" : "Forecast"}: {display.label}
          {display.temperature ? <span className="font-semibold text-text-muted"> · {display.temperature}</span> : null}
        </p>
        {display.isTypical ? (
          <p className="m-0 text-[0.72rem] text-text-muted">Based on the same dates in past years — not a forecast.</p>
        ) : null}
        {display.rain ? <p className="m-0 text-[0.8rem] text-text-muted">{display.rain}</p> : null}
        {display.advice.length > 0 ? (
          <ul className="m-0 grid list-disc gap-0.5 pl-4 text-[0.8rem] text-text-muted">
            {display.advice.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        ) : null}
        <WeatherAttribution attribution={attribution} />
      </div>
    </section>
  );
}
