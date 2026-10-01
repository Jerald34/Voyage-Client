import { beforeEach, describe, expect, it, vi } from "vitest";

const state = { instance: null };

class FakeDoc {
  constructor() {
    this.texts = [];
    this.pages = 1;
    this.fontSize = 16;
    this.measured = [];
    this.internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 }, getNumberOfPages: () => this.pages };
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
  }
  splitTextToSize(text, width) {
    const value = String(text ?? "");
    this.measured.push({ text: value, fontSize: this.fontSize });
    if (!value) return [];
    const perLine = Math.max(1, Math.floor(width / 2.2));
    const lines = [];
    for (let index = 0; index < value.length; index += perLine) lines.push(value.slice(index, index + perLine));
    return lines;
  }
  text(value) {
    for (const entry of Array.isArray(value) ? value : [value]) this.texts.push(String(entry));
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

function pdfInput(placeSnapshot) {
  return {
    title: "Trip",
    summary: "",
    days: [{ id: "day-1", dayNumber: 1, title: "Arrival", date: null, summary: "", items: [{ title: "Burnham Park", placeSnapshot }] }],
  };
}

let generateItineraryPdf;

beforeEach(async () => {
  state.instance = null;
  vi.resetModules();
  ({ generateItineraryPdf } = await import("../app/lib/pdfExport.js"));
});

describe("pdf export accessibility", () => {
  it("prints known accessibility for a checked place", async () => {
    await generateItineraryPdf(
      pdfInput({
        name: "Burnham Park",
        metadata: {
          accessibility: {
            wheelchairAccessibleEntrance: true,
            wheelchairAccessibleRestroom: true,
            source: "GOOGLE_PLACES",
            checkedAt: "2026-10-01T00:00:00.000Z",
          },
        },
      })
    );

    expect(state.instance.texts.join("")).toContain("Accessibility: accessible entrance, accessible restroom");
  });

  it("measures the accessibility line at the font size it is drawn in", async () => {
    await generateItineraryPdf(
      pdfInput({
        name: "Burnham Park",
        metadata: { accessibility: { wheelchairAccessibleEntrance: true, source: "GOOGLE_PLACES", checkedAt: "2026-10-01T00:00:00.000Z" } },
      })
    );

    const measured = state.instance.measured.find((entry) => entry.text.startsWith("Accessibility:"));
    expect(measured?.fontSize).toBe(8.5);
  });

  it("prints nothing for a place that was never checked", async () => {
    await generateItineraryPdf(pdfInput({ name: "Burnham Park", metadata: {} }));

    expect(state.instance.texts.join("\n")).not.toContain("Accessibility:");
  });
});
