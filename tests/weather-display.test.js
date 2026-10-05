import { describe, expect, it } from "vitest";
import {
  attachWeatherToDays,
  buildWeatherByDayId,
  describeDayWeather,
  describeStopWeather,
  formatHour,
  formatHourRange,
  formatTemperatureRange,
  getWeatherAdvice,
  isWetWeather,
} from "../app/lib/weather/weatherDisplay.js";

const forecast = {
  date: "2026-10-10",
  kind: "FORECAST",
  condition: "RAIN",
  temperatureMinC: 16.2,
  temperatureMaxC: 23.4,
  precipitationProbabilityPct: 85,
  uvIndexMax: 5,
  windSpeedMaxKph: 14,
  sampleYears: null,
  wetYears: null,
};

const typical = {
  date: "2026-12-05",
  kind: "TYPICAL",
  condition: "PARTLY_CLOUDY",
  temperatureMinC: 15,
  temperatureMaxC: 22.7,
  precipitationProbabilityPct: 40,
  uvIndexMax: null,
  windSpeedMaxKph: 10,
  sampleYears: 5,
  wetYears: 2,
};

const ok = (weather) => ({ dayId: "day-1", dayNumber: 1, date: weather.date, status: "OK", weather });

describe("describeDayWeather", () => {
  it("builds forecast text for chips, screen readers and the PDF", () => {
    expect(describeDayWeather(ok(forecast))).toEqual({
      condition: "RAIN",
      label: "Rain",
      temperature: "16–23°C",
      rain: "85% chance of rain",
      isTypical: false,
      isWet: true,
      compactText: "16–23°C · 85% rain",
      ariaLabel: "Forecast: Rain, 16–23°C, 85% chance of rain",
      advice: ["Plan indoor stops or bring rain gear."],
      pdfText: "Weather forecast: Rain, 16–23°C, 85% chance of rain",
    });
  });

  it("labels typical weather as typical, never as a forecast", () => {
    const display = describeDayWeather(ok(typical));

    expect(display.isTypical).toBe(true);
    expect(display.compactText).toBe("15–23°C · rain 2/5 yrs");
    expect(display.rain).toBe("Rain on 2 of the last 5 years");
    expect(display.ariaLabel).toBe("Typical weather: Partly cloudy, 15–23°C, rain on 2 of the last 5 years");
    expect(display.pdfText).toBe("Typical weather (past years): Partly cloudy, 15–23°C, rain on 2 of the last 5 years");
  });

  it("returns null for anything that is not an OK entry", () => {
    expect(describeDayWeather(null)).toBeNull();
    expect(describeDayWeather({ status: "NO_DATE", weather: null })).toBeNull();
    expect(describeDayWeather({ status: "UNAVAILABLE", weather: null })).toBeNull();
  });
});

describe("weather helpers", () => {
  it("formats temperature ranges and single values", () => {
    expect(formatTemperatureRange({ temperatureMinC: 16.2, temperatureMaxC: 23.4 })).toBe("16–23°C");
    expect(formatTemperatureRange({ temperatureMinC: null, temperatureMaxC: 30 })).toBe("30°C");
    expect(formatTemperatureRange({ temperatureMinC: null, temperatureMaxC: null })).toBe("");
  });

  it("treats wet conditions or a 60% chance as wet", () => {
    expect(isWetWeather({ condition: "CLOUDY", precipitationProbabilityPct: 60 })).toBe(true);
    expect(isWetWeather({ condition: "THUNDERSTORM", precipitationProbabilityPct: 10 })).toBe(true);
    expect(isWetWeather({ condition: "CLEAR", precipitationProbabilityPct: 20 })).toBe(false);
  });

  it("gives practical advice for UV, heat and wind", () => {
    expect(
      getWeatherAdvice({ condition: "CLEAR", precipitationProbabilityPct: 0, uvIndexMax: 9, temperatureMaxC: 34, windSpeedMaxKph: 45 })
    ).toEqual([
      "Very high UV — bring sun protection.",
      "Hot day — schedule outdoor stops early.",
      "Strong wind — check boat and hiking plans.",
    ]);
  });

  it("indexes entries by day id and attaches them to days for the PDF", () => {
    const byDayId = buildWeatherByDayId({ days: [ok(forecast), { dayId: null, status: "OK" }] });

    expect([...byDayId.keys()]).toEqual(["day-1"]);
    expect(attachWeatherToDays([{ id: "day-1" }, { id: "day-2" }], byDayId)).toEqual([
      { id: "day-1", weatherEntry: ok(forecast) },
      { id: "day-2" },
    ]);
    expect(buildWeatherByDayId(null).size).toBe(0);
  });
});

const baguio = {
  date: "2026-10-08",
  kind: "FORECAST",
  condition: "THUNDERSTORM",
  temperatureMinC: 15.5,
  temperatureMaxC: 23.6,
  precipitationProbabilityPct: 99,
  precipitationMm: 19.3,
  uvIndexMax: 7,
  windSpeedMaxKph: 12,
  sampleYears: null,
  wetYears: null,
};

const baguioHourly = {
  firstWetHour: 11,
  wetWindow: { condition: "THUNDERSTORM", fromHour: 14, toHour: 20 },
  stops: [
    { itemId: "s1", outlook: "DRY", maxPrecipitationProbabilityPct: 45 },
    { itemId: "s2", outlook: "SHOWERS", maxPrecipitationProbabilityPct: 79 },
    { itemId: "s3", outlook: "STORM", maxPrecipitationProbabilityPct: 99 },
    { itemId: "s4", outlook: "STORM", maxPrecipitationProbabilityPct: 91 },
  ],
};

const timed = (weather, hourly) => ({ ...ok(weather), hourly });

describe("formatHour / formatHourRange", () => {
  it("writes 12-hour clock hours and shares the meridiem inside one half of the day", () => {
    expect(formatHour(0)).toBe("12 AM");
    expect(formatHour(12)).toBe("12 PM");
    expect(formatHour(14)).toBe("2 PM");
    expect(formatHourRange(14, 20)).toBe("2–8 PM");
    expect(formatHourRange(7, 10)).toBe("7–10 AM");
    expect(formatHourRange(11, 14)).toBe("11 AM–2 PM");
  });
});

describe("describeDayWeather with hourly timing", () => {
  it("says when the storms come instead of reporting the day's worst hour", () => {
    expect(describeDayWeather(timed(baguio, baguioHourly))).toEqual({
      condition: "THUNDERSTORM",
      label: "Afternoon thunderstorms, 2–8 PM",
      temperature: "16–24°C",
      rain: "Dry until 11 AM · about 19 mm of rain · 2 stops fall in the storm window",
      isTypical: false,
      isWet: true,
      compactText: "16–24°C · PM storms",
      ariaLabel: "Forecast: Afternoon thunderstorms, 2–8 PM, 16–24°C, dry until 11 AM, about 19 mm of rain",
      advice: ["Put outdoor stops before 11 AM."],
      pdfText: "Weather forecast: Afternoon thunderstorms, 2–8 PM, 16–24°C, dry until 11 AM, about 19 mm of rain",
    });
  });

  it("names morning and evening spells, and long spells as on and off", () => {
    const at = (condition, fromHour, toHour) =>
      describeDayWeather(timed(baguio, { firstWetHour: fromHour, wetWindow: { condition, fromHour, toHour }, stops: [] }));

    expect(at("DRIZZLE", 7, 10)).toMatchObject({ label: "Morning drizzle, 7–10 AM", compactText: "16–24°C · AM drizzle" });
    expect(at("RAIN", 18, 21)).toMatchObject({ label: "Evening rain, 6–9 PM", compactText: "16–24°C · evening rain" });
    expect(at("RAIN", 8, 20)).toMatchObject({ label: "Rain on and off, 8 AM–8 PM", compactText: "16–24°C · rain on and off" });
    // Wet from early morning: the generic tip, not "before 7 AM".
    expect(at("DRIZZLE", 7, 10).advice).toEqual(["Plan indoor stops or bring rain gear."]);
  });

  it("calls a day whose only rain falls at night mostly dry", () => {
    expect(describeDayWeather(timed(baguio, { firstWetHour: null, wetWindow: null, stops: [] }))).toEqual({
      condition: "CLOUDY",
      label: "Mostly dry",
      temperature: "16–24°C",
      rain: "No rain expected from 6 AM to 10 PM",
      isTypical: false,
      isWet: false,
      compactText: "16–24°C · dry",
      ariaLabel: "Forecast: Mostly dry, 16–24°C, no rain expected from 6 AM to 10 PM",
      advice: [],
      pdfText: "Weather forecast: Mostly dry, 16–24°C, no rain expected from 6 AM to 10 PM",
    });
  });

  it("keeps a dry day's own condition when the daily code is dry too", () => {
    const sunny = { ...baguio, condition: "PARTLY_CLOUDY" };
    expect(describeDayWeather(timed(sunny, { firstWetHour: null, wetWindow: null, stops: [] }))).toMatchObject({
      condition: "PARTLY_CLOUDY",
      label: "Partly cloudy",
    });
  });

  it("ignores hourly data on typical days", () => {
    expect(describeDayWeather({ ...ok(typical), hourly: baguioHourly }).compactText).toBe("15–23°C · rain 2/5 yrs");
  });
});

describe("describeStopWeather", () => {
  it("describes each timed stop from the day's hourly summary", () => {
    const entry = timed(baguio, baguioHourly);

    expect(describeStopWeather(entry, "s1")).toEqual({
      outlook: "DRY",
      label: "Likely dry",
      condition: "CLEAR",
      tone: "dry",
      ariaLabel: "Weather during this stop: Likely dry",
      pdfText: "Likely dry",
    });
    expect(describeStopWeather(entry, "s3")).toEqual({
      outlook: "STORM",
      label: "Storms likely",
      condition: "THUNDERSTORM",
      tone: "storm",
      ariaLabel: "Weather during this stop: Storms likely, up to 99% chance of rain",
      pdfText: "Storms likely (up to 99% chance of rain)",
    });
    expect(describeStopWeather(entry, "s2")).toMatchObject({ label: "Light rain possible", condition: "DRIZZLE", tone: "wet" });
  });

  it("returns null without hourly data, for an unknown stop, or for a day that is not OK", () => {
    expect(describeStopWeather(ok(baguio), "s1")).toBeNull();
    expect(describeStopWeather(timed(baguio, baguioHourly), "missing")).toBeNull();
    expect(describeStopWeather({ ...timed(baguio, baguioHourly), status: "PAST" }, "s1")).toBeNull();
    expect(describeStopWeather(null, "s1")).toBeNull();
  });
});
