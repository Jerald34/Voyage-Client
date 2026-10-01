import { beforeEach, describe, expect, it, vi } from "vitest";

const state = { instance: null, pageBreaks: [], measured: [] };

class FakeDoc {
  constructor() {
    this.texts = [];
    this.fontSize = 16;
    this.pages = 1;
    this.internal = {
      pageSize: { getWidth: () => 210, getHeight: () => 297 },
      getNumberOfPages: () => this.pages,
    };
  }
  setFontSize(size) {
    this.fontSize = size;
  }
  setFont() {}
  setTextColor() {}
  setFillColor() {}
  setDrawColor() {}
  setLineWidth() {}
  circle() {}
  line() {}
  rect() {}
  roundedRect() {}
  addImage() {}
  setProperties() {}
  addPage() {
    this.pages += 1;
    state.pageBreaks.push(this.texts.length);
  }
  splitTextToSize(text, width) {
    const value = String(text ?? "");
    state.measured.push({ text: value, fontSize: this.fontSize });
    if (!value) return [];
    const perLine = Math.max(1, Math.floor(width / 2.2));
    const lines = [];
    for (let index = 0; index < value.length; index += perLine) lines.push(value.slice(index, index + perLine));
    return lines;
  }
  text(value) {
    const entries = Array.isArray(value) ? value : [value];
    for (const entry of entries) this.texts.push(String(entry));
  }
  getTextWidth(value) {
    return String(value ?? "").length * 2;
  }
  save() {}
  output() {
    return "blob";
  }
}

class FakeJsPDF {
  constructor() {
    const doc = new FakeDoc();
    state.instance = doc;
    return doc;
  }
}

vi.mock("jspdf", () => ({ jsPDF: FakeJsPDF, default: FakeJsPDF }));

function dayWith(weatherEntry) {
  return {
    id: "day-1",
    dayNumber: 1,
    title: "Arrival",
    date: null,
    summary: "",
    items: [],
    ...(weatherEntry ? { weatherEntry } : {}),
  };
}

let generateItineraryPdf;

beforeEach(async () => {
  state.instance = null;
  state.pageBreaks = [];
  state.measured = [];
  vi.resetModules();
  ({ generateItineraryPdf } = await import("../app/lib/pdfExport.js"));
});

describe("pdf export weather", () => {
  it("prints the day's forecast and the Open-Meteo credit", async () => {
    await generateItineraryPdf({
      title: "Trip",
      summary: "",
      days: [
        dayWith({
          status: "OK",
          weather: { kind: "FORECAST", condition: "RAIN", temperatureMinC: 16.2, temperatureMaxC: 23.4, precipitationProbabilityPct: 85 },
        }),
      ],
    });

    const printed = state.instance.texts.join("\n");
    expect(printed.replace(/\n/g, "")).toContain("Weather forecast: Rain, 16–23°C, 85% chance of rain");
    expect(printed).toContain("Weather data by Open-Meteo.com");
  });

  it("prints typical (past-years) weather with its own wording", async () => {
    await generateItineraryPdf({
      title: "Trip",
      summary: "",
      days: [
        dayWith({
          status: "OK",
          weather: { kind: "TYPICAL", condition: "CLOUDY", temperatureMinC: 20, temperatureMaxC: 28, wetYears: 3, sampleYears: 5 },
        }),
      ],
    });

    const printed = state.instance.texts.join("").replace(/\n/g, "");
    expect(printed).toContain("Typical weather (past years): Cloudy, 20–28°C, rain on 3 of the last 5 years");
    expect(printed).not.toContain("Weather forecast");
    expect(printed).toContain("Weather data by Open-Meteo.com");
  });

  it("measures the weather line at the size it is drawn in", async () => {
    await generateItineraryPdf({
      title: "Trip",
      summary: "A long summary that was last drawn at a larger size.",
      days: [
        dayWith({
          status: "OK",
          weather: { kind: "FORECAST", condition: "RAIN", temperatureMinC: 16.2, temperatureMaxC: 23.4, precipitationProbabilityPct: 85 },
        }),
      ],
    });

    const weatherMeasure = state.measured.find((entry) => entry.text.startsWith("Weather forecast"));
    expect(weatherMeasure?.fontSize).toBe(8.5);
  });

  it("never splits a day header from its weather line across a page break", async () => {
    const weather = { kind: "FORECAST", condition: "CLEAR", temperatureMinC: 22, temperatureMaxC: 30, precipitationProbabilityPct: 10 };
    const days = Array.from({ length: 14 }, (_, index) => ({
      ...dayWith({ status: "OK", weather }),
      id: `day-${index + 1}`,
      dayNumber: index + 1,
      summary: "A short day summary.",
    }));

    await generateItineraryPdf({ title: "Trip", summary: "", days });

    const texts = state.instance.texts;
    expect(state.pageBreaks.length).toBeGreaterThan(0);
    for (const firstTextOnNewPage of state.pageBreaks) {
      expect(texts[firstTextOnNewPage]).not.toMatch(/^Weather forecast/);
    }
    texts.forEach((text, index) => {
      if (/^Day \d+/.test(text)) expect(texts[index + 1]).toMatch(/^Weather forecast: Clear/);
    });
    expect(texts.filter((text) => text === "Weather data by Open-Meteo.com")).toHaveLength(1);
  });

  it("prints nothing about weather when no day has it", async () => {
    await generateItineraryPdf({ title: "Trip", summary: "", days: [dayWith(null)] });

    const printed = state.instance.texts.join("\n");
    expect(printed).not.toContain("Weather");
  });
});
