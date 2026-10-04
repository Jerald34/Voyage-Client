/**
 * Pure helpers that turn the server's per-day weather entries into display text.
 * Nothing here fetches, and nothing here shows weather the server did not send.
 * PDF text sticks to WinAnsi characters (°, – and — are fine; no emoji).
 */

export const WEATHER_CONDITION_LABELS = {
  CLEAR: "Clear",
  PARTLY_CLOUDY: "Partly cloudy",
  CLOUDY: "Cloudy",
  FOG: "Foggy",
  DRIZZLE: "Drizzle",
  RAIN: "Rain",
  HEAVY_RAIN: "Heavy rain",
  THUNDERSTORM: "Thunderstorms",
  SNOW: "Snow",
  UNKNOWN: "Mixed weather",
};

const WET_CONDITIONS = new Set(["DRIZZLE", "RAIN", "HEAVY_RAIN", "THUNDERSTORM"]);

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

export function buildWeatherByDayId(weather) {
  const byDayId = new Map();
  const days = Array.isArray(weather?.days) ? weather.days : [];
  for (const entry of days) {
    if (entry?.dayId) byDayId.set(entry.dayId, entry);
  }
  return byDayId;
}

export function formatTemperatureRange(weather) {
  const low = isNumber(weather?.temperatureMinC) ? Math.round(weather.temperatureMinC) : null;
  const high = isNumber(weather?.temperatureMaxC) ? Math.round(weather.temperatureMaxC) : null;
  if (low === null && high === null) return "";
  if (low === null) return `${high}°C`;
  if (high === null) return `${low}°C`;
  return `${low}–${high}°C`;
}

export function isWetWeather(weather) {
  if (!weather) return false;
  if (WET_CONDITIONS.has(weather.condition)) return true;
  return isNumber(weather.precipitationProbabilityPct) && weather.precipitationProbabilityPct >= 60;
}

function rainText(weather, long) {
  if (weather.kind === "TYPICAL") {
    if (!isNumber(weather.wetYears) || !isNumber(weather.sampleYears)) return "";
    return long
      ? `rain on ${weather.wetYears} of the last ${weather.sampleYears} years`
      : `rain ${weather.wetYears}/${weather.sampleYears} yrs`;
  }
  if (!isNumber(weather.precipitationProbabilityPct)) return "";
  return long ? `${weather.precipitationProbabilityPct}% chance of rain` : `${weather.precipitationProbabilityPct}% rain`;
}

export function getWeatherAdvice(weather) {
  const advice = [];
  if (isWetWeather(weather)) advice.push("Plan indoor stops or bring rain gear.");
  if (isNumber(weather?.uvIndexMax) && weather.uvIndexMax >= 8) advice.push("Very high UV — bring sun protection.");
  if (isNumber(weather?.temperatureMaxC) && weather.temperatureMaxC >= 33) advice.push("Hot day — schedule outdoor stops early.");
  if (isNumber(weather?.windSpeedMaxKph) && weather.windSpeedMaxKph >= 40) advice.push("Strong wind — check boat and hiking plans.");
  return advice;
}

/**
 * Display model for one day, or null when there is nothing to show: no date,
 * no located stops, a past date, or the provider was unavailable.
 */
export function describeDayWeather(entry) {
  if (!entry || entry.status !== "OK" || !entry.weather) return null;
  const weather = entry.weather;
  const label = WEATHER_CONDITION_LABELS[weather.condition] ?? WEATHER_CONDITION_LABELS.UNKNOWN;
  const temperature = formatTemperatureRange(weather);
  const isTypical = weather.kind === "TYPICAL";
  const longRain = rainText(weather, true);
  const sentence = [label, temperature, longRain].filter(Boolean).join(", ");

  return {
    condition: weather.condition,
    label,
    temperature,
    rain: capitalize(longRain),
    isTypical,
    isWet: isWetWeather(weather),
    compactText: [temperature, rainText(weather, false)].filter(Boolean).join(" · "),
    ariaLabel: isTypical ? `Typical weather: ${sentence}` : `Forecast: ${sentence}`,
    advice: getWeatherAdvice(weather),
    pdfText: isTypical ? `Typical weather (past years): ${sentence}` : `Weather forecast: ${sentence}`,
  };
}

/** Days with their weather entry attached as `weatherEntry`, for the PDF export. */
export function attachWeatherToDays(days, weatherByDayId) {
  const safeDays = Array.isArray(days) ? days : [];
  if (!(weatherByDayId instanceof Map) || weatherByDayId.size === 0) return safeDays;
  return safeDays.map((day) => {
    const entry = day?.id ? weatherByDayId.get(day.id) : undefined;
    return entry ? { ...day, weatherEntry: entry } : day;
  });
}
