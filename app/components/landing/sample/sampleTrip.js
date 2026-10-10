// app/components/landing/sample/sampleTrip.js
import sample from "./sampleTrip.json";
import { attachWeatherToDays, buildWeatherByDayId } from "../../../lib/weather/weatherDisplay.js";
import { formatDateRange } from "../../../lib/formatters.js";
import { getDayColor } from "../../../lib/trip-dashboard/dayColors.js";

/**
 * The landing page's sample trip: real Voyage output, frozen (see sampleTrip.json's
 * `_source`). Everything here is derived from it with the app's own helpers, so the
 * landing page shows exactly what the share page would.
 */
export const SAMPLE_TRIP = sample;
export const SAMPLE_DAYS = sample.itinerary.days;
export const SAMPLE_WEATHER_BY_DAY_ID = buildWeatherByDayId(sample.weather);
export const SAMPLE_WEATHER_ATTRIBUTION = sample.weather?.attribution ?? null;

/** Day 2 has a live forecast, so the first thing a visitor sees has weather on it. */
export const SAMPLE_DEFAULT_DAY = 2;

export const SAMPLE_DAY_OPTIONS = SAMPLE_DAYS.map((day) => ({
  value: String(day.dayNumber),
  label: `Day ${day.dayNumber}`,
}));

export function getSampleDay(dayNumber) {
  return SAMPLE_DAYS.find((day) => day.dayNumber === Number(dayNumber)) ?? SAMPLE_DAYS[0];
}

export function getSampleDayWeather(day) {
  return SAMPLE_WEATHER_BY_DAY_ID.get(day?.id) ?? null;
}

/** Stops with a saved location, numbered within their day like the share page's pins. */
export function getSampleMapStops() {
  return SAMPLE_DAYS.flatMap((day) =>
    day.items.map((item, index) => ({
      id: item.id,
      title: item.title,
      dayNumber: day.dayNumber,
      stopNumber: index + 1,
      lat: item.placeSnapshot?.latitude,
      lng: item.placeSnapshot?.longitude,
      color: getDayColor(day.dayNumber),
    })),
  ).filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng));
}

/** generateItineraryPdf's input, built the way the share page builds it. Module-level, so it is stable. */
export const SAMPLE_PDF_INPUT = {
  title: sample.itinerary.title,
  summary: sample.itinerary.summary,
  dateRange: formatDateRange(sample.trip.startDate, sample.trip.endDate),
  travelerCount: sample.trip.travelerCount,
  days: attachWeatherToDays(SAMPLE_DAYS, SAMPLE_WEATHER_BY_DAY_ID),
  agencyName: sample.brand?.name || "Voyage",
};

/** The ask_user questions Voyage really asked an agent planning a Mayon Volcano day trip (2026-10-08). */
export const SAMPLE_ASK_USER_QUESTIONS = [
  {
    id: "q1",
    header: "Transport",
    question: "How will the travelers get around?",
    multiSelect: false,
    options: [
      { label: "Private car", description: "Most stops per day" },
      { label: "Public transit", description: "Fewer stops, station-friendly" },
      { label: "Walking" },
      { label: "A mix" },
    ],
  },
  {
    id: "q2",
    header: "Pace",
    question: "What kind of pace are you looking for?",
    multiSelect: false,
    options: [
      { label: "Relaxed", description: "Fewer stops, more leisure time" },
      { label: "Moderate", description: "A good balance of activities and free time" },
      { label: "Packed", description: "As many activities as possible" },
    ],
  },
];

/** A real production share of this trip when configured (release checklist), else this page's sample. */
export function getSampleShareUrl(origin) {
  return process.env.NEXT_PUBLIC_LANDING_SAMPLE_SHARE_URL || `${origin}/#sample-trip`;
}
