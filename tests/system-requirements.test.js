import { describe, expect, it } from "vitest";
import { CLIENT_REQUIREMENTS, isBrowserSupported } from "../app/lib/systemRequirements.js";

const modernCss = { supports: (property, value) => property === "color" && value.startsWith("color-mix("), registerProperty: () => {} };

describe("isBrowserSupported", () => {
  it("accepts a browser with @property and color-mix()", () => {
    expect(isBrowserSupported({ CSS: modernCss })).toBe(true);
  });

  it("rejects a browser without @property (Firefox before 128, Safari before 16.4)", () => {
    expect(isBrowserSupported({ CSS: { supports: modernCss.supports } })).toBe(false);
  });

  it("rejects a browser without color-mix() (Chrome before 111)", () => {
    expect(isBrowserSupported({ CSS: { supports: () => false, registerProperty: () => {} } })).toBe(false);
  });

  it("rejects a browser with no CSS object at all", () => {
    expect(isBrowserSupported({})).toBe(false);
    expect(isBrowserSupported(null)).toBe(false);
  });
});

describe("CLIENT_REQUIREMENTS", () => {
  it("lists browser, device, memory, internet and browser settings, each with a minimum and a recommendation", () => {
    expect(CLIENT_REQUIREMENTS.map((row) => row.label)).toEqual(["Browser", "Device", "Memory", "Internet", "Browser settings"]);
    for (const row of CLIENT_REQUIREMENTS) {
      expect(row.minimum).toBeTruthy();
      expect(row.recommended).toBeTruthy();
    }
    expect(CLIENT_REQUIREMENTS[0].minimum).toBe("Chrome or Edge 111, Safari 16.4, Firefox 128");
  });
});
