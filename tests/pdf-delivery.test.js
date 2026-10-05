import { describe, expect, it, vi } from "vitest";
import { choosePdfDelivery, deliverPdf, isAppleMobile } from "../app/lib/pdfDelivery.js";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36";
const MAC_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";

const file = new File(["%PDF-1.7"], "kyoto-itinerary.pdf", { type: "application/pdf" });

function fakeEnv({
  userAgent = MAC_SAFARI,
  platform = "MacIntel",
  maxTouchPoints = 0,
  share,
  canShare,
  anchorSupportsDownload = true,
  openResult = {},
} = {}) {
  const link = { click: vi.fn(), remove: vi.fn(), style: {} };
  if (anchorSupportsDownload) link.download = "";
  const env = {
    navigator: { userAgent, platform, maxTouchPoints, share, canShare },
    document: { createElement: vi.fn(() => link), body: { appendChild: vi.fn() } },
    window: { open: vi.fn(() => openResult), setTimeout: vi.fn() },
    URL: { createObjectURL: vi.fn(() => "blob:pdf"), revokeObjectURL: vi.fn() },
  };
  return { env, link };
}

const shareable = () => ({ share: vi.fn(async () => {}), canShare: vi.fn(() => true) });

describe("isAppleMobile", () => {
  it("recognises iPhone and iPadOS (which reports a desktop Mac user agent)", () => {
    expect(isAppleMobile({ userAgent: IPHONE })).toBe(true);
    expect(isAppleMobile({ userAgent: MAC_SAFARI, platform: "MacIntel", maxTouchPoints: 5 })).toBe(true);
    expect(isAppleMobile({ userAgent: MAC_SAFARI, platform: "MacIntel", maxTouchPoints: 0 })).toBe(false);
    expect(isAppleMobile({ userAgent: ANDROID, platform: "Linux armv8l", maxTouchPoints: 5 })).toBe(false);
  });
});

describe("choosePdfDelivery", () => {
  it("uses the share sheet on iPhone/iPad, the only path that also works from the home-screen app", () => {
    const { env } = fakeEnv({ userAgent: IPHONE, platform: "iPhone", maxTouchPoints: 5, ...shareable() });
    expect(choosePdfDelivery(env, file)).toBe("share");
  });

  it("opens the PDF in a tab on iOS without file sharing (iOS 14 and older, in-app browsers)", () => {
    const { env } = fakeEnv({ userAgent: IPHONE, platform: "iPhone", maxTouchPoints: 5 });
    expect(choosePdfDelivery(env, file)).toBe("open");
  });

  it("downloads on Android and desktop, even where sharing is available", () => {
    expect(choosePdfDelivery(fakeEnv({ userAgent: ANDROID, platform: "Linux armv8l", maxTouchPoints: 5, ...shareable() }).env, file)).toBe("download");
    expect(choosePdfDelivery(fakeEnv().env, file)).toBe("download");
  });

  it("falls back to sharing, then to a tab, when links cannot download", () => {
    expect(choosePdfDelivery(fakeEnv({ anchorSupportsDownload: false, ...shareable() }).env, file)).toBe("share");
    expect(choosePdfDelivery(fakeEnv({ anchorSupportsDownload: false }).env, file)).toBe("open");
  });

  it("treats a canShare that throws as no sharing", () => {
    const { env } = fakeEnv({
      userAgent: IPHONE,
      platform: "iPhone",
      maxTouchPoints: 5,
      share: vi.fn(),
      canShare: vi.fn(() => {
        throw new TypeError("files not supported");
      }),
    });
    expect(choosePdfDelivery(env, file)).toBe("open");
  });
});

describe("deliverPdf", () => {
  const iphone = (overrides = {}) =>
    fakeEnv({ userAgent: IPHONE, platform: "iPhone", maxTouchPoints: 5, ...shareable(), ...overrides });

  it("calls the share sheet before returning, inside the tap's activation", async () => {
    const { env } = iphone();
    const pending = deliverPdf(file, { title: "Kyoto" }, env);

    expect(env.navigator.share).toHaveBeenCalledWith({ files: [file], title: "Kyoto" });
    await expect(pending).resolves.toBe("shared");
  });

  it("reports a dismissed share sheet as cancelled and a refused one as failed", async () => {
    const abort = Object.assign(new Error("dismissed"), { name: "AbortError" });
    const refused = Object.assign(new Error("no activation"), { name: "NotAllowedError" });

    await expect(deliverPdf(file, {}, iphone({ share: vi.fn(async () => { throw abort; }) }).env)).resolves.toBe("cancelled");
    await expect(deliverPdf(file, {}, iphone({ share: vi.fn(async () => { throw refused; }) }).env)).resolves.toBe("failed");
  });

  it("downloads through an attached link and frees the blob URL later", async () => {
    const { env, link } = fakeEnv({ userAgent: ANDROID, platform: "Linux armv8l", maxTouchPoints: 5, ...shareable() });

    await expect(deliverPdf(file, {}, env)).resolves.toBe("downloaded");

    expect(env.navigator.share).not.toHaveBeenCalled();
    expect(env.document.body.appendChild).toHaveBeenCalledWith(link);
    expect(link).toMatchObject({ href: "blob:pdf", download: "kyoto-itinerary.pdf" });
    expect(link.click).toHaveBeenCalledTimes(1);
    expect(link.remove).toHaveBeenCalledTimes(1);
    expect(env.window.setTimeout).toHaveBeenCalledWith(expect.any(Function), 60_000);
    env.window.setTimeout.mock.calls[0][0]();
    expect(env.URL.revokeObjectURL).toHaveBeenCalledWith("blob:pdf");
  });

  it("opens the PDF in a new tab and reports a blocked tab as failed", async () => {
    const { env } = fakeEnv({ userAgent: IPHONE, platform: "iPhone", maxTouchPoints: 5 });
    await expect(deliverPdf(file, {}, env)).resolves.toBe("opened");
    expect(env.window.open).toHaveBeenCalledWith("blob:pdf", "_blank");

    const blocked = fakeEnv({ userAgent: IPHONE, platform: "iPhone", maxTouchPoints: 5, openResult: null });
    await expect(deliverPdf(file, {}, blocked.env)).resolves.toBe("failed");
  });
});
