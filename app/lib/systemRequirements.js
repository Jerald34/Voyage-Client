/**
 * Minimum system requirements (capstone panel item 14). One source for the Settings panel,
 * the unsupported-browser banner and the manuscript table in
 * Voyage-Server/docs/capstone/system-requirements.md; change them together.
 */
export const MINIMUM_BROWSERS = "Chrome or Edge 111, Safari 16.4, Firefox 128";

export const CLIENT_REQUIREMENTS = [
  { label: "Browser", minimum: MINIMUM_BROWSERS, recommended: "The latest version of any of them" },
  {
    label: "Device",
    minimum: "A phone at least 360 px wide, or any laptop or desktop",
    recommended: "A laptop or desktop for planning",
  },
  { label: "Memory", minimum: "4 GB", recommended: "8 GB" },
  { label: "Internet", minimum: "5 Mbps", recommended: "10 Mbps or faster, for maps, photos and live agent replies" },
  { label: "Browser settings", minimum: "JavaScript and cookies on", recommended: "JavaScript and cookies on" },
];

/**
 * True when the browser has the two newest CSS features Voyage's styles rely on:
 * `@property` (CSS.registerProperty: Firefox 128, Safari 16.4) and `color-mix()`
 * (Chrome and Edge 111). Feature checks, not the browser's name, which can lie.
 */
export function isBrowserSupported(env = typeof window === "undefined" ? undefined : window) {
  const css = env?.CSS;
  if (!css || typeof css.supports !== "function") return false;
  return typeof css.registerProperty === "function" && css.supports("color", "color-mix(in srgb, red, blue)");
}
