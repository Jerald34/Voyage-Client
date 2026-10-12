import { afterEach, describe, expect, it, vi } from "vitest";
import { loadPdfImage, loadPdfImages, pdfPhotoUrl } from "../app/lib/pdfImages.js";

const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;

afterEach(() => {
  vi.unstubAllGlobals();
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
});

/** Fakes the browser pieces jsdom lacks: fetch, createImageBitmap and a 2D canvas. */
function fakeBrowser({ bitmapWidth = 800, bitmapHeight = 400, ok = true } = {}) {
  const context = { fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() };
  const bitmap = { width: bitmapWidth, height: bitmapHeight, close: vi.fn() };
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok, blob: async () => new Blob(["img"]) })));
  vi.stubGlobal("createImageBitmap", vi.fn(async () => bitmap));
  HTMLCanvasElement.prototype.getContext = vi.fn(() => context);
  HTMLCanvasElement.prototype.toDataURL = vi.fn((type) => `data:${type};base64,AAAA`);
  return { context, bitmap };
}

describe("pdfPhotoUrl", () => {
  it("asks Cloudinary for a small JPEG", () => {
    expect(pdfPhotoUrl("https://res.cloudinary.com/demo/image/upload/v17/places/burnham.png")).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_fill,w_320,h_240,q_auto,f_jpg/v17/places/burnham.png",
    );
  });

  it("does not stack a second transform on an already-transformed URL", () => {
    const transformed = "https://res.cloudinary.com/demo/image/upload/c_fill,w_320,h_240,q_auto,f_jpg/v17/places/burnham.jpg";
    expect(pdfPhotoUrl(transformed)).toBe(transformed);
    const auto = "https://res.cloudinary.com/demo/image/upload/f_auto/v17/places/burnham.jpg";
    expect(pdfPhotoUrl(auto)).toBe(auto);
  });

  it("handles an unversioned public id and empty input", () => {
    expect(pdfPhotoUrl("https://res.cloudinary.com/demo/image/upload/voyage/places/a.jpg")).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_fill,w_320,h_240,q_auto,f_jpg/voyage/places/a.jpg",
    );
    expect(pdfPhotoUrl("")).toBe("");
    expect(pdfPhotoUrl(null)).toBeNull();
  });

  it("leaves other URLs alone", () => {
    expect(pdfPhotoUrl("https://example.com/photo.jpg")).toBe("https://example.com/photo.jpg");
  });
});

describe("loadPdfImage", () => {
  it("returns null without a URL", async () => {
    await expect(loadPdfImage("")).resolves.toBeNull();
  });

  it("returns null when the browser can't decode images", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(loadPdfImage("https://example.com/a.jpg")).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns null when the download fails", async () => {
    fakeBrowser({ ok: false });
    await expect(loadPdfImage("https://example.com/a.jpg")).resolves.toBeNull();
  });

  it("crops a photo to cover the frame and returns a JPEG", async () => {
    const { context, bitmap } = fakeBrowser({ bitmapWidth: 800, bitmapHeight: 400 });

    const image = await loadPdfImage("https://example.com/a.jpg", { width: 320, height: 240, fit: "cover", format: "jpeg" });

    expect(image).toEqual({ dataUrl: "data:image/jpeg;base64,AAAA", width: 320, height: 240, format: "JPEG" });
    const [, sx, sy, sw, sh, dx, dy, dw, dh] = context.drawImage.mock.calls[0];
    expect(sw).toBeCloseTo(533.33, 1);
    expect(sx).toBeCloseTo(133.33, 1);
    expect([sy, sh, dx, dy, dw, dh]).toEqual([0, 400, 0, 0, 320, 240]);
    expect(context.fillRect).toHaveBeenCalled(); // white under the JPEG
    expect(bitmap.close).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith("https://example.com/a.jpg", expect.objectContaining({ mode: "cors", credentials: "omit" }));
  });

  it("fits a logo inside the frame without upscaling and keeps PNG transparency", async () => {
    const { context } = fakeBrowser({ bitmapWidth: 480, bitmapHeight: 157 });

    const image = await loadPdfImage("/email/voyage-logo.png", { width: 600, height: 200, fit: "contain", format: "png" });

    expect(image).toEqual({ dataUrl: "data:image/png;base64,AAAA", width: 480, height: 157, format: "PNG" });
    expect(context.fillRect).not.toHaveBeenCalled();
  });
});

describe("loadPdfImage failure paths", () => {
  it("returns null when fetch rejects", async () => {
    fakeBrowser();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("CORS"); }));
    await expect(loadPdfImage("https://example.com/a.jpg")).resolves.toBeNull();
  });

  it("returns null when there is no 2D context, and still closes the bitmap", async () => {
    const { bitmap } = fakeBrowser();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
    await expect(loadPdfImage("https://example.com/a.jpg")).resolves.toBeNull();
    expect(bitmap.close).toHaveBeenCalled();
  });

  it("returns null when toDataURL throws", async () => {
    fakeBrowser();
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => { throw new Error("tainted"); });
    await expect(loadPdfImage("https://example.com/a.jpg")).resolves.toBeNull();
  });

  it("aborts the fetch on timeout and leaves no timer behind", async () => {
    vi.useFakeTimers();
    try {
      fakeBrowser();
      let aborted = false;
      vi.stubGlobal("fetch", vi.fn((url, { signal }) => new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => { aborted = true; reject(new DOMException("aborted", "AbortError")); });
      })));
      const pending = loadPdfImage("https://example.com/slow.jpg", { timeoutMs: 6000 });
      await vi.advanceTimersByTimeAsync(6000);
      await expect(pending).resolves.toBeNull();
      expect(aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("clears its timer after a successful load", async () => {
    vi.useFakeTimers();
    try {
      fakeBrowser();
      await expect(loadPdfImage("https://example.com/a.jpg")).resolves.not.toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("loadPdfImages", () => {
  it("loads each distinct URL once and maps failures to null", async () => {
    const load = vi.fn(async (url) => (url.includes("bad") ? null : { dataUrl: url }));

    const images = await loadPdfImages(["a.jpg", "bad.jpg", "a.jpg", "", null], { load, options: { fit: "cover" } });

    expect(load).toHaveBeenCalledTimes(2);
    expect(load).toHaveBeenCalledWith("a.jpg", { fit: "cover" });
    expect(images.get("a.jpg")).toEqual({ dataUrl: "a.jpg" });
    expect(images.get("bad.jpg")).toBeNull();
  });

  it("never runs more loads at once than the limit", async () => {
    let running = 0;
    let peak = 0;
    const load = vi.fn(async () => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 1));
      running -= 1;
      return null;
    });

    await loadPdfImages(Array.from({ length: 10 }, (_, index) => `${index}.jpg`), { load, concurrency: 3 });

    expect(load).toHaveBeenCalledTimes(10);
    expect(peak).toBeLessThanOrEqual(3);
  });
});
