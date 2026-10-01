import { beforeEach, describe, expect, it, vi } from "vitest";

const state = { instance: null, pageBreaks: [] };

class FakeDoc {
  constructor() {
    this.texts = [];
    this.pages = 1;
    this.internal = {
      pageSize: { getWidth: () => 210, getHeight: () => 297 },
      getNumberOfPages: () => this.pages,
    };
  }
  setFontSize() {}
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

  it("prints nothing about weather when no day has it", async () => {
    await generateItineraryPdf({ title: "Trip", summary: "", days: [dayWith(null)] });

    const printed = state.instance.texts.join("\n");
    expect(printed).not.toContain("Weather");
  });
});
