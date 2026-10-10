// tests/landing-sample-trip.test.js
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SAMPLE_ASK_USER_QUESTIONS,
  SAMPLE_DAYS,
  SAMPLE_DAY_OPTIONS,
  SAMPLE_DEFAULT_DAY,
  SAMPLE_PDF_INPUT,
  SAMPLE_TRIP,
  getSampleDay,
  getSampleDayWeather,
  getSampleMapStops,
  getSampleShareUrl,
} from "../app/components/landing/sample/sampleTrip.js";
import { describeDayWeather, describeStopWeather } from "../app/lib/weather/weatherDisplay.js";
import { formatDateRange } from "../app/itinerary/view/[token]/components/stopDisplay.jsx";

// stopDisplay.jsx imports the app icons barrel, which Vitest cannot parse.
vi.mock("../app/components/icons/index.js", async () => (await import("./helpers/iconsMock.js")).default);

afterEach(() => vi.unstubAllEnvs());

describe("landing sample trip", () => {
  it("is the real 2-day Baguio trip with day 2 as the default", () => {
    expect(SAMPLE_TRIP.itinerary.title).toBe("2-Day Baguio Itinerary");
    expect(SAMPLE_DAYS.map((d) => d.dayNumber)).toEqual([1, 2]);
    expect(SAMPLE_DEFAULT_DAY).toBe(2);
    expect(SAMPLE_DAY_OPTIONS).toEqual([
      { value: "1", label: "Day 1" },
      { value: "2", label: "Day 2" },
    ]);
  });

  it("carries day 2's real forecast and per-stop outlooks", () => {
    const day2 = getSampleDay(2);
    const entry = getSampleDayWeather(day2);
    expect(describeDayWeather(entry).label).toBe("Afternoon rain, 1–2 PM");
    const mall = day2.items.find((item) => item.title === "SM City Baguio");
    expect(describeStopWeather(entry, mall.id).label).toBe("Rain likely");
  });

  it("shows no weather for day 1 rather than inventing any", () => {
    expect(describeDayWeather(getSampleDayWeather(getSampleDay(1)))).toBeNull();
  });

  it("holds no staff-only or private fields", () => {
    const text = JSON.stringify(SAMPLE_TRIP);
    for (const key of ["staffNotes", "createdByUserId", "agencyId", "clientEmail", "clientName", "placeAdvisory"]) {
      expect(text).not.toContain(key);
    }
  });

  it("holds plain https photo URLs, with no quote characters left from the export", () => {
    const urls = SAMPLE_DAYS.flatMap((day) =>
      day.items.flatMap((item) => {
        const metadata = item.placeSnapshot?.metadata ?? {};
        return [metadata.primaryPhotoUrl, ...(metadata.photoUrls ?? [])].filter((url) => url != null);
      }),
    );
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url.startsWith("https://")).toBe(true);
  });

  it("lists map stops with coordinates, numbered within their day", () => {
    const stops = getSampleMapStops();
    expect(stops).toHaveLength(8); // Good Shepherd Convent has no saved location
    expect(stops.find((s) => s.title === "Good Shepherd Convent")).toBeUndefined();
    expect(stops.find((s) => s.title === "SM City Baguio")).toMatchObject({ dayNumber: 2, stopNumber: 4 });
    expect(stops[0].color).toEqual({ fill: "#B4532A", border: "#7C2D12" });
  });

  it("titles map pins with the place name, as the share page's map does", () => {
    const stops = getSampleMapStops();
    // The stop is titled "Lunch at Cafe by the Ruins"; its place is "Café by the Ruins".
    expect(stops.find((s) => s.title === "Café by the Ruins")).toMatchObject({ dayNumber: 1 });
    expect(stops.find((s) => s.title === "Lunch at Cafe by the Ruins")).toBeUndefined();
  });

  it("builds the PDF input the share page would, with weather attached", () => {
    expect(SAMPLE_PDF_INPUT.title).toBe("2-Day Baguio Itinerary");
    expect(SAMPLE_PDF_INPUT.dateRange).toBe(formatDateRange(SAMPLE_TRIP.trip.startDate, SAMPLE_TRIP.trip.endDate));
    expect(SAMPLE_PDF_INPUT.dateRange).toContain("–");
    expect(SAMPLE_PDF_INPUT.agencyName).toBe("Lakbay");
    expect(SAMPLE_PDF_INPUT.days[1].weatherEntry.status).toBe("OK");
  });

  it("uses the real ask_user questions", () => {
    expect(SAMPLE_ASK_USER_QUESTIONS.map((q) => q.header)).toEqual(["Transport", "Pace"]);
  });

  it("points the share link at the configured production share, else this page's sample", () => {
    expect(getSampleShareUrl("https://voyage.test")).toBe("https://voyage.test/#sample-trip");
    vi.stubEnv("NEXT_PUBLIC_LANDING_SAMPLE_SHARE_URL", "https://voyage.test/itinerary/view/abc123");
    expect(getSampleShareUrl("https://voyage.test")).toBe("https://voyage.test/itinerary/view/abc123");
  });
});
