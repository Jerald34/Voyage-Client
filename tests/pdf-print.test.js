import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const delivery = vi.hoisted(() => ({ deliverPdf: vi.fn(async () => "shared"), isAppleMobile: vi.fn(() => false) }));
vi.mock("../app/lib/pdfDelivery.js", () => delivery);

import { printPdf } from "../app/lib/pdfPrint.js";

const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
const FIREFOX = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0";

const file = new File(["%PDF-1.7"], "kyoto-itinerary.pdf", { type: "application/pdf" });

// A stand-in for the page: just enough of a frame to see what the helper does to it.
function fakeEnv({ userAgent = CHROME, print, openResult = {} } = {}) {
  const frames = [];
  const env = {
    navigator: { userAgent },
    document: {
      createElement: vi.fn(() => {
        const listeners = {};
        const frame = {
          style: {},
          setAttribute: vi.fn(),
          addEventListener: vi.fn((type, handler) => { listeners[type] = handler; }),
          remove: vi.fn(),
          contentWindow: { focus: vi.fn(), print: print ?? vi.fn() },
          fireLoad: () => listeners.load?.(),
        };
        frames.push(frame);
        return frame;
      }),
      body: { appendChild: vi.fn() },
    },
    window: {
      open: vi.fn(() => openResult),
      setTimeout: (...args) => setTimeout(...args),
      clearTimeout: (...args) => clearTimeout(...args),
    },
    URL: { createObjectURL: vi.fn(() => "blob:pdf"), revokeObjectURL: vi.fn() },
  };
  return { env, frames };
}

beforeEach(() => {
  vi.useFakeTimers();
  delivery.deliverPdf.mockClear();
  delivery.isAppleMobile.mockReturnValue(false);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("printPdf", () => {
  it("loads the PDF into a hidden frame and prints it once the frame has loaded", async () => {
    const { env, frames } = fakeEnv();
    const pending = printPdf(file, { title: "Kyoto" }, env);

    const [frame] = frames;
    expect(frame.src).toBe("blob:pdf");
    expect(env.document.body.appendChild).toHaveBeenCalledWith(frame);
    expect(frame.setAttribute).toHaveBeenCalledWith("aria-hidden", "true");
    expect(frame.setAttribute).toHaveBeenCalledWith("tabindex", "-1");
    // Nothing is printed before the PDF is in the frame.
    expect(frame.contentWindow.print).not.toHaveBeenCalled();

    frame.fireLoad();
    await vi.advanceTimersByTimeAsync(0);

    expect(frame.contentWindow.focus).toHaveBeenCalled();
    expect(frame.contentWindow.print).toHaveBeenCalledTimes(1);
    await expect(pending).resolves.toBe("printed");
    expect(env.window.open).not.toHaveBeenCalled();
    expect(delivery.deliverPdf).not.toHaveBeenCalled();
  });

  it("waits a moment after load in Firefox, whose PDF viewer is not ready to print yet", async () => {
    const { env, frames } = fakeEnv({ userAgent: FIREFOX });
    const pending = printPdf(file, {}, env);
    const [frame] = frames;

    frame.fireLoad();
    await vi.advanceTimersByTimeAsync(500);
    expect(frame.contentWindow.print).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    expect(frame.contentWindow.print).toHaveBeenCalledTimes(1);
    await expect(pending).resolves.toBe("printed");
  });

  it("opens the PDF in a tab when the frame refuses to print", async () => {
    const print = vi.fn(() => {
      throw new Error("blocked");
    });
    const { env, frames } = fakeEnv({ print });
    const pending = printPdf(file, {}, env);

    frames[0].fireLoad();
    await vi.advanceTimersByTimeAsync(0);

    expect(env.window.open).toHaveBeenCalledWith("blob:pdf", "_blank");
    await expect(pending).resolves.toBe("opened");
  });

  it("opens the PDF in a tab when the frame never loads, and reports a blocked tab as failed", async () => {
    const { env } = fakeEnv({ openResult: null });
    const pending = printPdf(file, {}, env);

    await vi.advanceTimersByTimeAsync(15_000);

    expect(env.window.open).toHaveBeenCalledWith("blob:pdf", "_blank");
    await expect(pending).resolves.toBe("failed");
  });

  it("does not time out once the frame has loaded", async () => {
    const { env, frames } = fakeEnv();
    const pending = printPdf(file, {}, env);

    frames[0].fireLoad();
    await vi.advanceTimersByTimeAsync(20_000);

    expect(env.window.open).not.toHaveBeenCalled();
    await expect(pending).resolves.toBe("printed");
  });

  it("removes the frame and frees the blob URL a minute later", async () => {
    const { env, frames } = fakeEnv();
    const pending = printPdf(file, {}, env);
    frames[0].fireLoad();
    await vi.advanceTimersByTimeAsync(0);
    await pending;

    await vi.advanceTimersByTimeAsync(59_000);
    expect(frames[0].remove).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1_000);
    expect(frames[0].remove).toHaveBeenCalledTimes(1);
    expect(env.URL.revokeObjectURL).toHaveBeenCalledWith("blob:pdf");
  });

  it("clears away the previous print frame before it makes a new one", async () => {
    const first = fakeEnv();
    const firstPending = printPdf(file, {}, first.env);
    first.frames[0].fireLoad();
    await vi.advanceTimersByTimeAsync(0);
    await firstPending;

    const second = fakeEnv();
    printPdf(file, {}, second.env);

    expect(first.frames[0].remove).toHaveBeenCalledTimes(1);
    expect(first.env.URL.revokeObjectURL).toHaveBeenCalledWith("blob:pdf");
  });

  it("leaves iPhone and iPad to the share sheet, which has Print in it", async () => {
    delivery.isAppleMobile.mockReturnValue(true);
    const { env, frames } = fakeEnv();

    await expect(printPdf(file, { title: "Kyoto" }, env)).resolves.toBe("shared");

    expect(delivery.deliverPdf).toHaveBeenCalledWith(file, { title: "Kyoto" }, env);
    expect(frames).toHaveLength(0);
  });
});
