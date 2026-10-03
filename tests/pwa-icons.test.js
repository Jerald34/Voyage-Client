import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Plus_Jakarta_Sans: () => ({ variable: "font-sans" }),
  DM_Serif_Display: () => ({ variable: "font-serif" }),
}));
vi.mock("../app/components/theme/ThemeProvider", () => ({ default: ({ children }) => children }));

import { metadata } from "../app/layout.jsx";

// jsdom replaces the global URL, which node:url's fileURLToPath rejects, so resolve from import.meta.dirname
// (a plain string; the CommonJS-style __dirname is a vite-node compatibility shim that Vitest is dropping).
const publicFile = (path) => resolve(import.meta.dirname, `../public${path}`);
const manifest = JSON.parse(readFileSync(publicFile("/manifest.json"), "utf8"));

/**
 * Bump (here, in public/manifest.json and in app/layout.jsx) whenever the icon artwork changes.
 * Also bump CACHE_VERSION in public/sw.js: the in-app /icon.svg references are cache-first,
 * so installed apps keep serving the old artwork until the service worker cache rolls over.
 */
const ICON_VERSION = "?v=2";

const withoutQuery = (url) => url.split("?")[0];

describe("PWA icons", () => {
  it("pins the app id, so installs stay the same app", () => {
    expect(manifest.id).toBe("/");
  });

  it("versions every manifest icon URL, so installed apps notice new artwork", () => {
    expect(manifest.icons.length).toBeGreaterThan(0);
    for (const icon of manifest.icons) {
      expect(icon.src.endsWith(ICON_VERSION), icon.src).toBe(true);
      expect(existsSync(publicFile(withoutQuery(icon.src))), icon.src).toBe(true);
    }
  });

  it("uses the same versioned URLs for the page's icon links", () => {
    const urls = [
      ...metadata.icons.icon.map((icon) => icon.url),
      ...metadata.icons.apple.map((icon) => icon.url),
      metadata.icons.shortcut,
    ];
    for (const url of urls) {
      expect(url.endsWith(ICON_VERSION), url).toBe(true);
      expect(existsSync(publicFile(withoutQuery(url))), url).toBe(true);
    }
  });

  it("lists only screenshots that exist", () => {
    for (const shot of manifest.screenshots ?? []) {
      expect(existsSync(publicFile(withoutQuery(shot.src))), shot.src).toBe(true);
    }
  });
});
