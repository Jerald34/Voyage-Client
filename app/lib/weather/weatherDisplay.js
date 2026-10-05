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

export const RAIN_ADVICE = "Plan indoor stops or bring rain gear.";

/** The server's hourly summary covers 06:00 up to 22:00 local. */
const DAYTIME_START_HOUR = 6;
const DRY_DAYTIME_TEXT = "no rain expected from 6 AM to 10 PM";
/** A wet spell this many hours or longer reads "on and off", not as one part of the day. */
const ON_AND_OFF_HOURS = 9;

const WET_WORDS = {
  DRIZZLE: "drizzle",
  RAIN: "rain",
  HEAVY_RAIN: "heavy rain",
  THUNDERSTORM: "thunderstorms",
  SNOW: "snow",
};
const SHORT_WET_WORDS = { DRIZZLE: "drizzle", RAIN: "rain", HEAVY_RAIN: "heavy rain", THUNDERSTORM: "storms", SNOW: "snow" };
/** What the stops in a wet window "may see" (heavy rain reads as plain rain there). */
const STOP_COUNT_NOUNS = { DRIZZLE: "drizzle", RAIN: "rain", HEAVY_RAIN: "rain", THUNDERSTORM: "storms", SNOW: "snow" };
/** A stop counts toward the wet window when its outlook is at least the window's band. */
const OUTLOOK_RANK = { DRY: 0, SHOWERS: 1, RAIN: 2, SNOW: 3, STORM: 4 };
const WINDOW_RANK = { DRIZZLE: 1, RAIN: 2, HEAVY_RAIN: 2, SNOW: 3, THUNDERSTORM: 4 };

/** A daytime chance of rain at or above this makes a no-wet-window day "light rain possible". */
const SHOWERS_POSSIBLE_PCT = 50;
const SHOWERS_POSSIBLE_TEXT = "Light rain possible at times";

const STOP_OUTLOOKS = {
  DRY: { label: "Likely dry", condition: "CLEAR", tone: "dry" },
  SHOWERS: { label: "Light rain possible", condition: "DRIZZLE", tone: "wet" },
  RAIN: { label: "Rain likely", condition: "RAIN", tone: "wet" },
  SNOW: { label: "Snow likely", condition: "SNOW", tone: "wet" },
  STORM: { label: "Storms likely", condition: "THUNDERSTORM", tone: "storm" },
};

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/** 0-23 → "12 AM", "2 PM". */
export function formatHour(hour) {
  const h = ((hour % 24) + 24) % 24;
  return `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
}

/** "2–8 PM" inside one half of the day, "11 AM–2 PM" across noon. `toHour` is exclusive. */
export function formatHourRange(fromHour, toHour) {
  const from = formatHour(fromHour);
  const to = formatHour(toHour);
  return from.slice(-2) === to.slice(-2) ? `${from.slice(0, -3)}–${to}` : `${from}–${to}`;
}

/** Morning 6-12, afternoon 12-17, evening 17-22; hours outside 6-22 count toward the nearest part. */
const DAY_PARTS = [
  { long: "Morning", short: "AM" },
  { long: "Afternoon", short: "PM" },
  { long: "Evening", short: "evening" },
];

function dayPartIndex(hour) {
  if (hour < 12) return 0;
  if (hour < 17) return 1;
  return 2;
}

/** The part of the day most of the spell's hours fall in (`toHour` is exclusive); a tie goes to the earlier part. */
function partOfDay(fromHour, toHour) {
  const hoursIn = [0, 0, 0];
  for (let hour = fromHour; hour < toHour; hour += 1) hoursIn[dayPartIndex(hour)] += 1;
  if (hoursIn.every((hours) => hours === 0)) return DAY_PARTS[dayPartIndex(fromHour)];

  let busiest = 0;
  for (let index = 1; index < hoursIn.length; index += 1) {
    if (hoursIn[index] > hoursIn[busiest]) busiest = index;
  }
  return DAY_PARTS[busiest];
}

/** Counts by forecast band, not by time, so the screen copy says "may see", never "will be in". */
function countStopsInWindow(hourly) {
  const rank = WINDOW_RANK[hourly.wetWindow?.condition];
  if (!rank || !Array.isArray(hourly.stops)) return 0;
  return hourly.stops.filter((stop) => (OUTLOOK_RANK[stop?.outlook] ?? 0) >= rank).length;
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
  if (isWetWeather(weather)) advice.push(RAIN_ADVICE);
  if (isNumber(weather?.uvIndexMax) && weather.uvIndexMax >= 8) advice.push("Very high UV — bring sun protection.");
  if (isNumber(weather?.temperatureMaxC) && weather.temperatureMaxC >= 33) advice.push("Hot day — schedule outdoor stops early.");
  if (isNumber(weather?.windSpeedMaxKph) && weather.windSpeedMaxKph >= 40) advice.push("Strong wind — check boat and hiking plans.");
  return advice;
}

/** The hourly summary is usable when it says "no wet window" or gives a window with numeric hours. */
function hasUsableHourly(hourly) {
  if (!hourly || typeof hourly !== "object") return false;
  const window = hourly.wetWindow;
  if (window === null) return true;
  return Boolean(window) && typeof window === "object" && isNumber(window.fromHour) && isNumber(window.toHour);
}

/**
 * Display model for one day, or null when there is nothing to show: no date,
 * no located stops, a past date, or the provider was unavailable.
 */
export function describeDayWeather(entry) {
  if (!entry || entry.status !== "OK" || !entry.weather) return null;
  const weather = entry.weather;
  // Hourly timing exists only for forecast days; typical (past-years) days never use it.
  if (weather.kind !== "TYPICAL" && hasUsableHourly(entry.hourly)) return describeTimedDay(weather, entry.hourly);
  return describeWholeDay(weather);
}

function describeWholeDay(weather) {
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

/** The tip about WHEN to go out, from the dry hours around the wet spell (`spellEnd` is exclusive). */
function timingAdvice(first, spellEnd) {
  const dryBefore = isNumber(first) && first >= 9;
  const dryAfter = spellEnd <= 17;
  if (dryBefore && dryAfter) return `Keep outdoor stops outside ${formatHourRange(first, spellEnd)}.`;
  if (dryBefore) return `Put outdoor stops before ${formatHour(first)}.`;
  if (dryAfter) return `Put outdoor stops after ${formatHour(spellEnd)}.`;
  return RAIN_ADVICE;
}

/** Does a day with no wet window still carry a real daytime chance of showers? */
function showersPossible(hourly) {
  const peak = hourly.maxDaytimePrecipitationProbabilityPct;
  if (isNumber(peak)) return peak >= SHOWERS_POSSIBLE_PCT;
  return Array.isArray(hourly.stops) && hourly.stops.some((stop) => stop?.outlook === "SHOWERS");
}

/** A forecast day with hourly timing: say WHEN the rain comes, not just the day's worst hour. */
function describeTimedDay(weather, hourly) {
  const temperature = formatTemperatureRange(weather);
  const otherAdvice = getWeatherAdvice(weather).filter((tip) => tip !== RAIN_ADVICE);
  const window = hourly.wetWindow;

  if (!window || !WET_WORDS[window.condition]) {
    if (showersPossible(hourly)) {
      // No sustained wet spell, but the stops are tagged "light rain possible": don't call the day dry.
      const peak = hourly.maxDaytimePrecipitationProbabilityPct;
      const chance = isNumber(peak) ? `up to ${peak}% chance of rain` : "";
      const sentence = [SHOWERS_POSSIBLE_TEXT, temperature, chance].filter(Boolean).join(", ");
      return {
        condition: "CLOUDY",
        label: SHOWERS_POSSIBLE_TEXT,
        temperature,
        rain: capitalize(chance) || SHOWERS_POSSIBLE_TEXT,
        isTypical: false,
        isWet: true,
        compactText: [temperature, "showers possible"].filter(Boolean).join(" · "),
        ariaLabel: `Forecast: ${sentence}`,
        advice: [RAIN_ADVICE, ...otherAdvice],
        pdfText: `Weather forecast: ${sentence}`,
      };
    }

    // The daily code can still be wet from night rain; the daytime is what travelers see.
    const dailyIsWet = WET_CONDITIONS.has(weather.condition);
    const condition = dailyIsWet ? "CLOUDY" : weather.condition;
    const label = dailyIsWet ? "Mostly dry" : WEATHER_CONDITION_LABELS[condition] ?? WEATHER_CONDITION_LABELS.UNKNOWN;
    const sentence = [label, temperature, DRY_DAYTIME_TEXT].filter(Boolean).join(", ");
    return {
      condition,
      label,
      temperature,
      rain: capitalize(DRY_DAYTIME_TEXT),
      isTypical: false,
      isWet: false,
      compactText: [temperature, "dry"].filter(Boolean).join(" · "),
      ariaLabel: `Forecast: ${sentence}`,
      advice: otherAdvice,
      pdfText: `Weather forecast: ${sentence}`,
    };
  }

  const onAndOff = window.toHour - window.fromHour >= ON_AND_OFF_HOURS;
  const part = partOfDay(window.fromHour, window.toHour);
  const range = formatHourRange(window.fromHour, window.toHour);
  const label = onAndOff
    ? `${capitalize(WET_WORDS[window.condition])} on and off, ${range}`
    : `${part.long} ${WET_WORDS[window.condition]}, ${range}`;
  const shortTiming = onAndOff
    ? `${SHORT_WET_WORDS[window.condition]} on and off`
    : `${part.short} ${SHORT_WET_WORDS[window.condition]}`;

  const first = hourly.firstWetHour;
  // The spell runs to the last wet hour when the server says so (older servers send only the window).
  const spellEnd = Math.max(window.toHour, isNumber(hourly.lastWetHour) ? hourly.lastWetHour + 1 : window.toHour);
  const details = [];
  if (isNumber(first) && first >= 15) details.push(`dry until ${formatHour(first)}`);
  else if (isNumber(first) && first >= 12) details.push("dry morning");
  else if (isNumber(first) && first > DAYTIME_START_HOUR) details.push(`dry until ${formatHour(first)}`);
  if (isNumber(weather.precipitationMm) && weather.precipitationMm >= 1) {
    // Snow's millimetres are water equivalent, so don't call them rain.
    details.push(`about ${Math.round(weather.precipitationMm)} mm of ${window.condition === "SNOW" ? "precipitation" : "rain"}`);
  }
  const atRisk = countStopsInWindow(hourly);
  const stopsText =
    atRisk > 0 ? `${atRisk} ${atRisk === 1 ? "stop" : "stops"} may see ${STOP_COUNT_NOUNS[window.condition]}` : "";

  const sentence = [label, temperature, ...details].filter(Boolean).join(", ");
  return {
    condition: window.condition,
    label,
    temperature,
    // The stop count is for the screen, next to the stops; the PDF tags each stop instead.
    rain: capitalize([...details, stopsText].filter(Boolean).join(" · ")),
    isTypical: false,
    isWet: true,
    compactText: [temperature, shortTiming].filter(Boolean).join(" · "),
    ariaLabel: `Forecast: ${sentence}`,
    advice: [timingAdvice(first, spellEnd), ...otherAdvice],
    pdfText: `Weather forecast: ${sentence}`,
  };
}

/** One stop's weather from its day's hourly summary, or null when there is none. */
export function describeStopWeather(entry, itemId) {
  if (!entry || entry.status !== "OK" || !itemId) return null;
  const stops = Array.isArray(entry.hourly?.stops) ? entry.hourly.stops : [];
  const stop = stops.find((candidate) => candidate?.itemId === itemId);
  const outlook = stop ? STOP_OUTLOOKS[stop.outlook] : null;
  if (!outlook) return null;

  const chance =
    stop.outlook !== "DRY" && isNumber(stop.maxPrecipitationProbabilityPct)
      ? `up to ${stop.maxPrecipitationProbabilityPct}% chance of ${stop.outlook === "SNOW" ? "snow" : "rain"}`
      : "";
  return {
    outlook: stop.outlook,
    label: outlook.label,
    condition: outlook.condition,
    tone: outlook.tone,
    ariaLabel: `Weather during this stop: ${[outlook.label, chance].filter(Boolean).join(", ")}`,
    pdfText: chance ? `${outlook.label} (${chance})` : outlook.label,
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
