import { beforeEach, describe, expect, it, vi } from "vitest";

const state = { instance: null };

class FakeDoc {
  constructor() {
    this.entries = [];
    this.images = [];
    this.pages = 1;
    this.currentPage = 1;
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
  addImage(dataUrl, format, x, y, width, height) {
    this.images.push({ dataUrl, format, x, y, width, height, page: this.currentPage });
  }
  addPage() {
    this.pages += 1;
    this.currentPage = this.pages;
  }
  setPage(page) {
    this.currentPage = page;
  }
  splitTextToSize(text, width) {
    const value = String(text ?? "");
    if (!value) return [];
    const perLine = Math.max(1, Math.floor(width / 2.2));
    const lines = [];
    for (let index = 0; index < value.length; index += perLine) lines.push(value.slice(index, index + perLine));
    return lines;
  }
  text(value, x, y) {
    for (const entry of Array.isArray(value) ? value : [value]) {
      this.entries.push({ text: String(entry), x, y, page: this.currentPage });
    }
  }
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

const texts = () => state.instance.entries.map((entry) => entry.text);
const photo = (name) => ({ dataUrl: `data:image/jpeg;base64,${name}`, width: 320, height: 240, format: "JPEG" });
const voyageLogo = { dataUrl: "data:image/png;base64,voyage", width: 480, height: 157, format: "PNG" };
const CLOUDINARY = "https://res.cloudinary.com/demo/image/upload/v1/places/burnham.jpg";
const CLOUDINARY_SMALL = "https://res.cloudinary.com/demo/image/upload/c_fill,w_320,h_240,q_auto,f_jpg/v1/places/burnham.jpg";

/** A loadImages stand-in: answers from `images`, records what was asked. */
function recordingLoader(images = {}) {
  const calls = [];
  const loadImages = async (urls, options) => {
    calls.push({ urls, options });
    return new Map(urls.map((url) => [url, images[url] ?? null]));
  };
  return { loadImages, calls };
}

function stop(overrides = {}) {
  return {
    id: "s1",
    title: "Burnham Park",
    startTime: "09:00",
    endTime: "10:30",
    placeSnapshot: { name: "Burnham Park", formattedAddress: "Baguio" },
    ...overrides,
  };
}

function day(overrides = {}) {
  return { id: "d1", dayNumber: 1, title: "Arrival", date: null, summary: "", items: [stop()], ...overrides };
}

let generateItineraryPdf;

beforeEach(async () => {
  state.instance = null;
  vi.resetModules();
  ({ generateItineraryPdf } = await import("../app/lib/pdfExport.js"));
});

describe("itinerary PDF: branded timeline", () => {
  it("prints who the trip is for next to the dates and travelers", async () => {
    const { loadImages } = recordingLoader();
    await generateItineraryPdf({
      title: "Baguio getaway",
      dateRange: "Oct 8 – Oct 10",
      travelerCount: 4,
      clientName: "Reyes family",
      days: [day()],
      loadImages,
    });

    expect(texts()).toContain("Oct 8 – Oct 10   •   4 travelers   •   Prepared for Reyes family");
  });

  it("puts the date and the day's plan in the day bar", async () => {
    const { loadImages } = recordingLoader();
    await generateItineraryPdf({ title: "Trip", days: [day({ date: "2026-10-08" })], loadImages });

    expect(texts()).toContain("Day 1  ·  Thu, Oct 8, 2026  —  Arrival");
  });

  it("adds an at-a-glance table for trips longer than a day", async () => {
    const { loadImages } = recordingLoader();
    await generateItineraryPdf({
      title: "Trip",
      days: [
        day({ items: [stop(), stop({ id: "s2" })] }),
        day({ id: "d2", dayNumber: 2, title: "Old town", date: "2026-10-09", items: [stop({ id: "s3" })] }),
      ],
      loadImages,
    });

    const printed = texts();
    expect(printed).toContain("At a glance");
    expect(printed).toContain("Oct 9");
    expect(printed).toContain("Old town");
    expect(printed.indexOf("At a glance")).toBeLessThan(printed.indexOf("Day 1  —  Arrival"));
    expect(printed).not.toContain("Weather");
  });

  it("skips the table for a one-day trip", async () => {
    const { loadImages } = recordingLoader();
    await generateItineraryPdf({ title: "Trip", days: [day()], loadImages });

    expect(texts()).not.toContain("At a glance");
  });

  it("adds a weather column when a day has weather", async () => {
    const { loadImages } = recordingLoader();
    const weatherEntry = {
      status: "OK",
      weather: { kind: "FORECAST", condition: "RAIN", temperatureMinC: 16.2, temperatureMaxC: 23.4, precipitationProbabilityPct: 85 },
    };
    await generateItineraryPdf({ title: "Trip", days: [day({ weatherEntry }), day({ id: "d2", dayNumber: 2 })], loadImages });

    expect(texts()).toContain("Weather");
    expect(texts().some((text) => text.startsWith("16–23°C"))).toBe(true);
  });

  it("numbers every page as N of M and brands each footer", async () => {
    const { loadImages } = recordingLoader();
    const days = Array.from({ length: 6 }, (_, index) =>
      day({ id: `d${index + 1}`, dayNumber: index + 1, items: Array.from({ length: 5 }, (_, s) => stop({ id: `s${index}-${s}` })) }),
    );
    await generateItineraryPdf({ title: "Trip", agencyName: "Island Hops Travel", days, loadImages });

    const pages = state.instance.pages;
    expect(pages).toBeGreaterThan(1);
    for (let page = 1; page <= pages; page += 1) {
      const onPage = state.instance.entries.filter((entry) => entry.page === page).map((entry) => entry.text);
      expect(onPage).toContain(`Page ${page} of ${pages}`);
      expect(onPage).toContain("Island Hops Travel  ·  Planned with Voyage");
    }
  });

  it("prints each stop's photo beside it, from a small Cloudinary copy", async () => {
    const { loadImages, calls } = recordingLoader({ [CLOUDINARY_SMALL]: photo("burnham") });
    await generateItineraryPdf({
      title: "Trip",
      days: [day({ items: [stop({ placeSnapshot: { name: "Burnham Park", metadata: { primaryPhotoUrl: CLOUDINARY } } })] })],
      loadImages,
    });

    expect(calls[1]).toEqual({ urls: [CLOUDINARY_SMALL], options: expect.objectContaining({ fit: "cover", format: "jpeg" }) });
    const drawn = state.instance.images.find((image) => image.dataUrl === "data:image/jpeg;base64,burnham");
    expect(drawn).toMatchObject({ format: "JPEG", width: 26, height: 19.5 });
    expect(drawn.x).toBe(210 - 20 - 26);
  });

  it("prints the stop without a photo when the photo can't load", async () => {
    const { loadImages } = recordingLoader();
    await generateItineraryPdf({
      title: "Trip",
      days: [day({ items: [stop({ placeSnapshot: { name: "Burnham Park", metadata: { primaryPhotoUrl: CLOUDINARY } } })] })],
      loadImages,
    });

    expect(state.instance.images.filter((image) => image.format === "JPEG")).toHaveLength(0);
    expect(texts()).toContain("Burnham Park");
  });

  it("uses the Voyage wordmark for a Voyage-branded PDF", async () => {
    const { loadImages, calls } = recordingLoader({ "/email/voyage-logo.png": voyageLogo });
    await generateItineraryPdf({ title: "Trip", agencyName: "Voyage", days: [day()], loadImages });

    expect(calls[0].urls).toEqual(["/email/voyage-logo.png"]);
    expect(state.instance.images.some((image) => image.dataUrl === voyageLogo.dataUrl)).toBe(true);
    expect(texts()).not.toContain("VOYAGE");
  });

  it("falls back to the Voyage name when the wordmark can't load", async () => {
    const { loadImages } = recordingLoader();
    await generateItineraryPdf({ title: "Trip", days: [day()], loadImages });

    expect(texts()).toContain("VOYAGE");
  });

  it("uses an agency's own logo and name when it has a logo", async () => {
    const logoUrl = "https://cdn.example.com/hillside.png";
    const { loadImages, calls } = recordingLoader({ [logoUrl]: { ...voyageLogo, dataUrl: "data:image/png;base64,hillside" } });
    await generateItineraryPdf({ title: "Trip", agencyName: "Island Hops Travel", logoUrl, days: [day()], loadImages });

    expect(calls[0].urls).toEqual([logoUrl]);
    expect(state.instance.images.some((image) => image.dataUrl === "data:image/png;base64,hillside")).toBe(true);
    expect(texts()).toContain("ISLAND HOPS TRAVEL");
  });

  it("prints an agency's name with no logo request when it has no logo", async () => {
    const { loadImages, calls } = recordingLoader();
    await generateItineraryPdf({ title: "Trip", agencyName: "Island Hops Travel", days: [day()], loadImages });

    expect(calls[0].urls).toEqual([]);
    expect(texts()).toContain("ISLAND HOPS TRAVEL");
  });

  it("doesn't repeat the place name when it matches the stop's title", async () => {
    const { loadImages } = recordingLoader();
    await generateItineraryPdf({
      title: "Trip",
      days: [day({ items: [stop(), stop({ id: "s2", title: "Lunch", placeSnapshot: { name: "Bayview", formattedAddress: "1 Bay St" } })] })],
      loadImages,
    });

    expect(texts().filter((text) => text === "Burnham Park")).toHaveLength(1);
    expect(texts()).toContain("Lunch");
    expect(texts()).toContain("Bayview");
  });

  it("keeps each day bar on the same page as its first stop", async () => {
    const photoStop = (id, title) =>
      stop({ id, title, placeSnapshot: { name: title, metadata: { primaryPhotoUrl: CLOUDINARY } } });
    // Vary day 1's length so day 2's bar lands at every height near the foot of a page.
    for (let count = 1; count <= 14; count += 1) {
      state.instance = null;
      const { loadImages } = recordingLoader({ [CLOUDINARY_SMALL]: photo("burnham") });
      await generateItineraryPdf({
        title: "Trip",
        days: [
          day({ items: Array.from({ length: count }, (_, index) => photoStop(`a${index}`, `Stop ${index}`)) }),
          day({ id: "d2", dayNumber: 2, title: "Old town", items: [photoStop("b0", "First of day two")] }),
        ],
        loadImages,
      });

      const entries = state.instance.entries;
      const bar = entries.find((entry) => entry.text === "Day 2  —  Old town");
      const firstStop = entries.find((entry) => entry.text === "First of day two");
      expect(bar.page, `day 1 with ${count} stops`).toBe(firstStop.page);
    }
  });

  it("breaks a time range that doesn't fit after its dash, never inside a time", async () => {
    const { loadImages } = recordingLoader();
    await generateItineraryPdf({ title: "Trip", days: [day({ items: [stop({ startTime: "11:00", endTime: "12:30" })] })], loadImages });

    expect(texts()).toContain("11:00 AM –");
    expect(texts()).toContain("12:30 PM");
  });

  it("still builds the PDF, without images, when the image loader fails", async () => {
    const loadImages = async () => {
      throw new Error("offline");
    };
    await generateItineraryPdf({ title: "Trip", days: [day()], loadImages });

    expect(state.instance.images).toHaveLength(0);
    expect(texts()).toContain("VOYAGE");
    expect(texts()).toContain("Burnham Park");
  });
});
