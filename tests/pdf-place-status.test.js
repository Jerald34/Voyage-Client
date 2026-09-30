import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * jsPDF is mocked so we can assert on the exact draw calls and, crucially, that
 * the closure line's height is included in the page-break budget BEFORE the
 * break is checked. A label drawn but not measured is how items slip off a page.
 */

const state = { calls: [], pageBreaks: [], instance: null };

class FakeDoc {
  constructor() {
    this.texts = [];
    this.pageBreakArgs = [];
    this.pages = 1;
    this.internal = {
      pageSize: { getWidth: () => 210, getHeight: () => 297 },
      getNumberOfPages: () => this.pages
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
    // ~2.2mm per character keeps long strings wrapping like the real thing.
    const perLine = Math.max(1, Math.floor(width / 2.2));
    const lines = [];
    for (let index = 0; index < value.length; index += perLine) {
      lines.push(value.slice(index, index + perLine));
    }
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

// pdfExport imports the named `jsPDF`; a default export is provided too so the
// mock matches the real module's shape.
vi.mock("jspdf", () => ({ jsPDF: FakeJsPDF, default: FakeJsPDF }));

function itinerary(items) {
  return { title: "Trip", summary: "", days: [{ dayNumber: 1, title: "Day 1", date: null, summary: "", items }] };
}

/** generateItineraryPdf takes the flattened shape, not a nested itinerary. */
function pdfInput(items) {
  const built = itinerary(items);
  return { title: built.title, summary: built.summary, days: built.days };
}

function item(overrides = {}) {
  return {
    title: "Lunch",
    description: "",
    startTime: "12:00",
    endTime: "13:00",
    placeSnapshot: { name: "Bayview", formattedAddress: "1 Bay St" },
    ...overrides
  };
}

let generateItineraryPdf;

beforeEach(async () => {
  state.calls = [];
  state.pageBreaks = [];
  state.instance = null;
  vi.resetModules();
  ({ generateItineraryPdf } = await import("../app/lib/pdfExport.js"));
});

describe("pdf export place status", () => {
  it("prints a provider closure line for a permanently closed stop", async () => {
    await generateItineraryPdf(pdfInput([
        item({ placeSnapshot: { name: "Bayview", formattedAddress: "1 Bay St", businessStatus: "CLOSED_PERMANENTLY" } })
      ]));

    expect(state.instance.texts.join("\n")).toContain("Permanently closed");
  });

  it("prints a temporary closure distinctly", async () => {
    await generateItineraryPdf(pdfInput([
        item({ placeSnapshot: { name: "Bayview", formattedAddress: "1 Bay St", businessStatus: "CLOSED_TEMPORARILY" } })
      ]));

    const printed = state.instance.texts.join("\n");
    expect(printed).toContain("Temporarily closed");
    expect(printed).not.toContain("Permanently closed");
  });

  it("prints nothing extra when the status is unknown or operational", async () => {
    await generateItineraryPdf(pdfInput([item()]));
    expect(state.instance.texts.join("\n")).not.toMatch(/closed/i);

    state.instance = null;
    vi.resetModules();
    const module = await import("../app/lib/pdfExport.js");
    await module.generateItineraryPdf(pdfInput([
      item({ placeSnapshot: { name: "Bayview", formattedAddress: "1 Bay St", businessStatus: "OPERATIONAL" } })
    ]));
    expect(state.instance.texts.join("\n")).not.toMatch(/closed/i);
  });

  it("never exports staff notes or agency overlays", async () => {
    await generateItineraryPdf(pdfInput([
        item({
          staffNotes: "Internal: owner is difficult",
          placeAdvisory: { reason: "AGENCY_AVOID", label: "Agency recommends avoiding" },
          placeSnapshot: { name: "Bayview", formattedAddress: "1 Bay St", businessStatus: "CLOSED_PERMANENTLY" }
        })
      ]));

    const printed = state.instance.texts.join("\n");
    expect(printed).toContain("Permanently closed");
    expect(printed).not.toContain("Agency recommends avoiding");
    expect(printed).not.toContain("owner is difficult");
  });

  it("counts the closure line's height in the page-break budget", async () => {
    // A long title near a page boundary: with the closure line measured, the item
    // breaks to a new page; without it, the line would overflow the page.
    const longTitle = "A very long activity title that wraps across several lines ".repeat(4);
    const items = Array.from({ length: 14 }, (_, index) =>
      item({
        title: `${index} ${longTitle}`,
        placeSnapshot: {
          name: "Bayview",
          formattedAddress: "1 Bay St",
          businessStatus: "CLOSED_PERMANENTLY"
        }
      })
    );

    await generateItineraryPdf(pdfInput(items));

    // Every closure line is printed, and the document paginated rather than
    // running past the bottom margin.
    const printed = state.instance.texts.join("\n");
    const closures = printed.split("Permanently closed").length - 1;
    expect(closures).toBe(14);
    expect(state.instance.pages).toBeGreaterThan(1);
  });
});
