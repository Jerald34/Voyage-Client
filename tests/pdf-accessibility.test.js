import { beforeEach, describe, expect, it, vi } from "vitest";

const state = { instance: null };

class FakeDoc {
  constructor() {
    this.texts = [];
    this.pages = 1;
    this.fontSize = 16;
    this.measured = [];
    this.color = null;
    this.colored = [];
    this.internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 }, getNumberOfPages: () => this.pages };
  }
  setFontSize(size) {
    this.fontSize = size;
  }
  setFont() {}
  setTextColor(...color) {
    this.color = color;
  }
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
    for (const entry of Array.isArray(value) ? value : [value]) {
      this.texts.push(String(entry));
      this.colored.push({ text: String(entry), color: this.color });
    }
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

describe("pdf export accessibility line colour", () => {
  const checkedAt = "2026-10-01T00:00:00.000Z";
  const colourOfAccessibilityLine = () =>
    state.instance.colored.find((entry) => entry.text.startsWith("Accessibility:"))?.color;

  it("is the amber caution colour when any warning is present", async () => {
    await generateItineraryPdf(
      pdfInput({
        name: "Burnham Park",
        metadata: { accessibility: { wheelchairAccessibleEntrance: false, wheelchairAccessibleRestroom: true, source: "GOOGLE_PLACES", checkedAt } },
      })
    );

    expect(colourOfAccessibilityLine()).toEqual([146, 64, 14]);
  });

  it("is a neutral grey when the place was checked but nothing is verified", async () => {
    await generateItineraryPdf(
      pdfInput({ name: "Burnham Park", metadata: { accessibility: { source: "GOOGLE_PLACES", checkedAt } } })
    );

    expect(colourOfAccessibilityLine()).toEqual([130, 150, 160]);
  });

  it("stays green when accessibility features are confirmed", async () => {
    await generateItineraryPdf(
      pdfInput({
        name: "Burnham Park",
        metadata: { accessibility: { wheelchairAccessibleEntrance: true, source: "GOOGLE_PLACES", checkedAt } },
      })
    );

    expect(colourOfAccessibilityLine()).toEqual([21, 94, 67]);
  });
});

describe("pdf export page breaks with the accessibility line", () => {
  const checkedAt = "2026-10-01T00:00:00.000Z";
  const itemsWith = (count, metadata) =>
    Array.from({ length: count }, (_, index) => ({
      title: `Stop ${index + 1}`,
      placeSnapshot: { name: `Stop ${index + 1}`, metadata },
    }));
  const pagesFor = async (count, metadata) => {
    vi.resetModules();
    ({ generateItineraryPdf } = await import("../app/lib/pdfExport.js"));
    await generateItineraryPdf({
      title: "Trip",
      summary: "",
      days: [{ id: "day-1", dayNumber: 1, title: "Arrival", date: null, summary: "", items: itemsWith(count, metadata) }],
    });
    return state.instance.pages;
  };

  it("counts the extra line in the height estimate, so it can push an item onto the next page", async () => {
    const withLine = { accessibility: { wheelchairAccessibleEntrance: true, source: "GOOGLE_PLACES", checkedAt } };
    let grewAt = null;
    for (let count = 1; count <= 40; count += 1) {
      const without = await pagesFor(count, {});
      const with_ = await pagesFor(count, withLine);
      expect(with_).toBeGreaterThanOrEqual(without);
      if (with_ > without && grewAt === null) grewAt = count;
    }

    // Somewhere a stop that fits without the line must move to the next page once the line is counted.
    expect(grewAt).not.toBeNull();
  });
});
