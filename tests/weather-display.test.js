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
  lastWetHour: 20,
  maxDaytimePrecipitationProbabilityPct: 99,
  wetWindow: { condition: "THUNDERSTORM", fromHour: 14, toHour: 20 },
  stops: [
    { itemId: "s1", outlook: "DRY", maxPrecipitationProbabilityPct: 45 },
    { itemId: "s2", outlook: "SHOWERS", maxPrecipitationProbabilityPct: 79 },
    { itemId: "s3", outlook: "STORM", maxPrecipitationProbabilityPct: 99 },
    { itemId: "s4", outlook: "STORM", maxPrecipitationProbabilityPct: 91 },
  ],
};

const timed = (weather, hourly) => ({ ...ok(weather), hourly });

/** A day (no rain amount) whose single wet spell runs fromHour to toHour (exclusive). */
const at = (condition, fromHour, toHour) =>
  describeDayWeather(
    timed(
      { ...baguio, precipitationMm: null },
      { firstWetHour: fromHour, lastWetHour: toHour - 1, wetWindow: { condition, fromHour, toHour }, stops: [] },
    ),
  );

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
      rain: "Dry until 11 AM · about 19 mm of rain · 2 stops may see storms",
      isTypical: false,
      isWet: true,
      compactText: "16–24°C · PM storms",
      ariaLabel: "Forecast: Afternoon thunderstorms, 2–8 PM, 16–24°C, dry until 11 AM, about 19 mm of rain",
      advice: ["Put outdoor stops before 11 AM."],
      pdfText: "Weather forecast: Afternoon thunderstorms, 2–8 PM, 16–24°C, dry until 11 AM, about 19 mm of rain",
    });
  });

  it("names morning and evening spells, and long spells as on and off", () => {
    expect(at("DRIZZLE", 7, 10)).toMatchObject({ label: "Morning drizzle, 7–10 AM", compactText: "16–24°C · AM drizzle" });
    expect(at("RAIN", 18, 21)).toMatchObject({ label: "Evening rain, 6–9 PM", compactText: "16–24°C · evening rain" });
    expect(at("RAIN", 8, 20)).toMatchObject({ label: "Rain on and off, 8 AM–8 PM", compactText: "16–24°C · rain on and off" });
    // Dry from 10 AM on, so the generic tip gives way to a specific one (and never says "before 7 AM").
    expect(at("DRIZZLE", 7, 10).advice).toEqual(["Put outdoor stops after 10 AM."]);
  });

  it("names a spell by the part of the day most of its hours fall in", () => {
    // Across noon.
    expect(at("RAIN", 11, 14)).toMatchObject({ label: "Afternoon rain, 11 AM–2 PM", compactText: "16–24°C · PM rain" });
    expect(at("RAIN", 10, 18)).toMatchObject({ label: "Afternoon rain, 10 AM–6 PM" });
    expect(at("RAIN", 9, 17)).toMatchObject({ label: "Afternoon rain, 9 AM–5 PM" });
    // A tie goes to the earlier part: 2-8 PM is three afternoon hours and three evening hours.
    expect(at("RAIN", 14, 20)).toMatchObject({ label: "Afternoon rain, 2–8 PM" });
    expect(at("RAIN", 9, 15)).toMatchObject({ label: "Morning rain, 9 AM–3 PM" });
    // Hours outside 6 AM-10 PM count toward the nearest part.
    expect(at("RAIN", 4, 7)).toMatchObject({ label: "Morning rain, 4–7 AM" });
  });

  it("calls a spell of nine hours or more on and off, but eight hours still has a part of the day", () => {
    expect(at("RAIN", 9, 18)).toMatchObject({ label: "Rain on and off, 9 AM–6 PM", compactText: "16–24°C · rain on and off" });
    expect(at("HEAVY_RAIN", 6, 21)).toMatchObject({ label: "Heavy rain on and off, 6 AM–9 PM" });
    expect(at("RAIN", 9, 17).label).toBe("Afternoon rain, 9 AM–5 PM");
  });

  it("names a snow spell", () => {
    const snowy = { ...baguio, condition: "SNOW", precipitationMm: null };
    const entry = timed(snowy, {
      firstWetHour: 9,
      lastWetHour: 14,
      wetWindow: { condition: "SNOW", fromHour: 9, toHour: 15 },
      stops: [
        { itemId: "s1", outlook: "SNOW", maxPrecipitationProbabilityPct: 80 },
        { itemId: "s2", outlook: "STORM", maxPrecipitationProbabilityPct: 95 },
        { itemId: "s3", outlook: "RAIN", maxPrecipitationProbabilityPct: 70 },
        { itemId: "s4", outlook: "DRY", maxPrecipitationProbabilityPct: 10 },
      ],
    });

    expect(describeDayWeather(entry)).toEqual({
      condition: "SNOW",
      label: "Morning snow, 9 AM–3 PM",
      temperature: "16–24°C",
      rain: "Dry until 9 AM · 2 stops may see snow",
      isTypical: false,
      isWet: true,
      compactText: "16–24°C · AM snow",
      ariaLabel: "Forecast: Morning snow, 9 AM–3 PM, 16–24°C, dry until 9 AM",
      advice: ["Keep outdoor stops outside 9 AM–3 PM."],
      pdfText: "Weather forecast: Morning snow, 9 AM–3 PM, 16–24°C, dry until 9 AM",
    });
  });

  it("measures snow as precipitation, not rain", () => {
    const hourly = (condition) => ({
      firstWetHour: 14,
      wetWindow: { condition, fromHour: 14, toHour: 17 },
      stops: [],
    });
    const snow = describeDayWeather(timed({ ...baguio, condition: "SNOW", precipitationMm: 6.2 }, hourly("SNOW")));
    const rain = describeDayWeather(timed({ ...baguio, precipitationMm: 6.2 }, hourly("RAIN")));

    expect(snow.rain).toBe("Dry morning · about 6 mm of precipitation");
    expect(snow.ariaLabel).toBe("Forecast: Afternoon snow, 2–5 PM, 16–24°C, dry morning, about 6 mm of precipitation");
    expect(snow.pdfText).toBe("Weather forecast: Afternoon snow, 2–5 PM, 16–24°C, dry morning, about 6 mm of precipitation");
    // Rain windows keep "of rain".
    expect(rain.rain).toBe("Dry morning · about 6 mm of rain");
    expect(rain.ariaLabel).toMatch(/about 6 mm of rain$/);
  });

  it("counts the stops that may see the window's weather, by band", () => {
    const withStops = (condition, outlooks) =>
      describeDayWeather(
        timed(
          { ...baguio, precipitationMm: null },
          {
            firstWetHour: 14,
            wetWindow: { condition, fromHour: 14, toHour: 20 },
            stops: outlooks.map((outlook, i) => ({ itemId: `s${i}`, outlook, maxPrecipitationProbabilityPct: 50 })),
          },
        ),
      ).rain;

    expect(withStops("THUNDERSTORM", ["STORM"])).toBe("Dry morning · 1 stop may see storms");
    expect(withStops("RAIN", ["RAIN", "STORM", "SHOWERS"])).toBe("Dry morning · 2 stops may see rain");
    expect(withStops("HEAVY_RAIN", ["RAIN"])).toBe("Dry morning · 1 stop may see rain");
    expect(withStops("DRIZZLE", ["SHOWERS", "RAIN", "DRY"])).toBe("Dry morning · 2 stops may see drizzle");
    expect(withStops("RAIN", ["DRY", "SHOWERS"])).toBe("Dry morning");
  });

  it("tells travelers which hours are dry, on whichever side of the rain they fall", () => {
    // Dry only before the rain (Baguio); the server's lastWetHour is optional.
    expect(describeDayWeather(timed(baguio, baguioHourly)).advice).toEqual(["Put outdoor stops before 11 AM."]);
    const { lastWetHour, ...withoutLastWetHour } = baguioHourly;
    expect(describeDayWeather(timed(baguio, withoutLastWetHour)).advice).toEqual(["Put outdoor stops before 11 AM."]);

    // Dry only after a morning spell.
    expect(at("RAIN", 7, 11).advice).toEqual(["Put outdoor stops after 11 AM."]);
    // Dry on both sides of a midday spell.
    expect(at("RAIN", 11, 14).advice).toEqual(["Keep outdoor stops outside 11 AM–2 PM."]);
    expect(at("RAIN", 9, 11).advice).toEqual(["Keep outdoor stops outside 9–11 AM."]);
    // The "after" tip stops at 5 PM, and the "before" tip starts at 9 AM.
    expect(at("RAIN", 13, 17).advice).toEqual(["Keep outdoor stops outside 1–5 PM."]);
    expect(at("RAIN", 14, 18).advice).toEqual(["Put outdoor stops before 2 PM."]);
    expect(at("RAIN", 8, 18).advice).toEqual(["Plan indoor stops or bring rain gear."]);
    // Wet most of the day: nothing is dry, so the generic tip stays.
    expect(at("RAIN", 8, 20).advice).toEqual(["Plan indoor stops or bring rain gear."]);
  });

  it("ends the spell at the last wet hour when the server sends it", () => {
    const hourly = (lastWetHour) => ({
      firstWetHour: 11,
      lastWetHour,
      wetWindow: { condition: "RAIN", fromHour: 11, toHour: 14 },
      stops: [],
    });

    // Without it the spell ends with the window.
    expect(describeDayWeather(timed(baguio, hourly(undefined))).advice).toEqual(["Keep outdoor stops outside 11 AM–2 PM."]);
    // Rain drizzles on until 6 PM: nothing is dry after the window, only before it.
    expect(describeDayWeather(timed(baguio, hourly(18))).advice).toEqual(["Put outdoor stops before 11 AM."]);
    // A last wet hour earlier than the window never shrinks the spell.
    expect(describeDayWeather(timed(baguio, hourly(12))).advice).toEqual(["Keep outdoor stops outside 11 AM–2 PM."]);
  });

  it("describes the dry hours before the rain by how late it starts", () => {
    expect(at("RAIN", 13, 16).rain).toBe("Dry morning");
    expect(at("RAIN", 12, 15).rain).toBe("Dry morning");
    expect(at("RAIN", 15, 18).rain).toBe("Dry until 3 PM");
    // An evening spell: the whole day before it is dry, not just the morning.
    expect(at("RAIN", 19, 22)).toMatchObject({
      label: "Evening rain, 7–10 PM",
      rain: "Dry until 7 PM",
      ariaLabel: "Forecast: Evening rain, 7–10 PM, 16–24°C, dry until 7 PM",
    });
    expect(at("RAIN", 9, 12).rain).toBe("Dry until 9 AM");
    // Wet from the first daytime hour: nothing to say.
    expect(at("RAIN", 6, 9).rain).toBe("");
  });

  it("keeps the UV tip while swapping the rain tip for a specific one", () => {
    const sunburnt = { ...baguio, uvIndexMax: 9, precipitationMm: null };
    expect(describeDayWeather(timed(sunburnt, baguioHourly)).advice).toEqual([
      "Put outdoor stops before 11 AM.",
      "Very high UV — bring sun protection.",
    ]);
  });

  it("only mentions rain amounts of 1 mm or more", () => {
    const hourly = { firstWetHour: 14, wetWindow: { condition: "RAIN", fromHour: 14, toHour: 17 }, stops: [] };
    const light = describeDayWeather(timed({ ...baguio, precipitationMm: 0.4 }, hourly));
    const missing = describeDayWeather(timed({ ...baguio, precipitationMm: undefined }, hourly));
    const some = describeDayWeather(timed({ ...baguio, precipitationMm: 1 }, hourly));

    for (const display of [light, missing]) {
      expect(display.rain).toBe("Dry morning");
      expect(display.ariaLabel).not.toMatch(/mm/);
      expect(display.pdfText).not.toMatch(/mm/);
    }
    expect(some.rain).toBe("Dry morning · about 1 mm of rain");
  });

  it("falls back to the whole-day wording when the hourly summary is malformed", () => {
    const wholeDay = describeDayWeather(ok(forecast));

    expect(describeDayWeather(timed(forecast, {}))).toEqual(wholeDay);
    expect(describeDayWeather(timed(forecast, { firstWetHour: 11, stops: [] }))).toEqual(wholeDay);
    expect(describeDayWeather(timed(forecast, { wetWindow: { condition: "RAIN", fromHour: 14 }, stops: [] }))).toEqual(wholeDay);
    expect(
      describeDayWeather(timed(forecast, { wetWindow: { condition: "RAIN", fromHour: "14", toHour: "20" }, stops: [] })),
    ).toEqual(wholeDay);
    expect(describeDayWeather(timed(forecast, "oops"))).toEqual(wholeDay);
    expect(wholeDay.label).toBe("Rain");
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

  it("does not call a day dry when light rain is likely at times", () => {
    const hourly = { firstWetHour: null, wetWindow: null, maxDaytimePrecipitationProbabilityPct: 70, stops: [] };

    expect(describeDayWeather(timed(baguio, hourly))).toEqual({
      condition: "CLOUDY",
      label: "Light rain possible at times",
      temperature: "16–24°C",
      rain: "Up to 70% chance of rain",
      isTypical: false,
      isWet: true,
      compactText: "16–24°C · showers possible",
      ariaLabel: "Forecast: Light rain possible at times, 16–24°C, up to 70% chance of rain",
      advice: ["Plan indoor stops or bring rain gear."],
      pdfText: "Weather forecast: Light rain possible at times, 16–24°C, up to 70% chance of rain",
    });
    // The 50% line is inclusive, and a clear daily code does not hide it.
    expect(
      describeDayWeather(timed({ ...baguio, condition: "CLEAR" }, { ...hourly, maxDaytimePrecipitationProbabilityPct: 50 })),
    ).toMatchObject({ label: "Light rain possible at times", rain: "Up to 50% chance of rain" });
    // The UV tip stays after the rain one.
    expect(describeDayWeather(timed({ ...baguio, uvIndexMax: 9 }, hourly)).advice).toEqual([
      "Plan indoor stops or bring rain gear.",
      "Very high UV — bring sun protection.",
    ]);
  });

  it("falls back to the stops' outlooks when the server sends no daytime peak", () => {
    const hourly = {
      firstWetHour: null,
      wetWindow: null,
      stops: [
        { itemId: "s1", outlook: "DRY", maxPrecipitationProbabilityPct: 10 },
        { itemId: "s2", outlook: "SHOWERS", maxPrecipitationProbabilityPct: 55 },
      ],
    };

    expect(describeDayWeather(timed(baguio, hourly))).toMatchObject({
      condition: "CLOUDY",
      label: "Light rain possible at times",
      rain: "Light rain possible at times",
      isWet: true,
      compactText: "16–24°C · showers possible",
      ariaLabel: "Forecast: Light rain possible at times, 16–24°C",
      pdfText: "Weather forecast: Light rain possible at times, 16–24°C",
      advice: ["Plan indoor stops or bring rain gear."],
    });
  });

  it("stays dry when the daytime peak is low, whatever the stop tags say", () => {
    const stops = [{ itemId: "s1", outlook: "SHOWERS", maxPrecipitationProbabilityPct: 30 }];
    const display = describeDayWeather(
      timed(baguio, { firstWetHour: null, wetWindow: null, maxDaytimePrecipitationProbabilityPct: 49, stops }),
    );

    expect(display).toMatchObject({ label: "Mostly dry", isWet: false, compactText: "16–24°C · dry", advice: [] });
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

  it("describes a snow stop", () => {
    const entry = timed(baguio, {
      ...baguioHourly,
      stops: [{ itemId: "s5", outlook: "SNOW", maxPrecipitationProbabilityPct: 80 }],
    });

    expect(describeStopWeather(entry, "s5")).toEqual({
      outlook: "SNOW",
      label: "Snow likely",
      condition: "SNOW",
      tone: "wet",
      ariaLabel: "Weather during this stop: Snow likely, up to 80% chance of snow",
      pdfText: "Snow likely (up to 80% chance of snow)",
    });
    // Every other outlook keeps "chance of rain".
    expect(describeStopWeather(timed(baguio, baguioHourly), "s2").pdfText).toBe("Light rain possible (up to 79% chance of rain)");
  });

  it("returns null without hourly data, for an unknown stop, or for a day that is not OK", () => {
    expect(describeStopWeather(ok(baguio), "s1")).toBeNull();
    expect(describeStopWeather(timed(baguio, baguioHourly), "missing")).toBeNull();
    expect(describeStopWeather({ ...timed(baguio, baguioHourly), status: "PAST" }, "s1")).toBeNull();
    expect(describeStopWeather(null, "s1")).toBeNull();
  });
});
