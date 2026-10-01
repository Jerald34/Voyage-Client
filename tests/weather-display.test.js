import { describe, expect, it } from "vitest";
import {
  attachWeatherToDays,
  buildWeatherByDayId,
  describeDayWeather,
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
