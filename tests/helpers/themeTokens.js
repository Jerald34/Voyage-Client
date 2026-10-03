// Resolves the real colour tokens in app/globals.css so tests can check WCAG
// contrast numerically. jsdom has no layout and no computed colours.
import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";

// jsdom replaces the global URL, which node:url's fileURLToPath rejects, so resolve from __dirname.
const css = readFileSync(resolvePath(__dirname, "../../app/globals.css"), "utf8");

/** The declarations inside the first `<selector> { ... }` block of globals.css. */
export function declarations(selector) {
  const open = css.indexOf(`${selector} {`) + selector.length + 2;
  let depth = 1;
  let end = open;
  while (depth > 0) {
    if (css[end] === "{") depth += 1;
    if (css[end] === "}") depth -= 1;
    end += 1;
  }
  return Object.fromEntries([...css.slice(open, end).matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

const LIGHT_TOKENS = { ...declarations("@theme"), ...declarations(":root") };
export const THEMES = { light: LIGHT_TOKENS, dark: { ...LIGHT_TOKENS, ...declarations(".dark") } };

/** A CSS colour expression -> [r, g, b, a]. Handles hex, rgb()/rgba() with var() channels, var() and color-mix(..., N%, transparent). */
export function resolve(expression, tokens) {
  const value = expression.trim();
  const mix = /^color-mix\(in srgb,\s*(.+?)\s+(\d+)%,\s*transparent\)$/.exec(value);
  if (mix) {
    const [r, g, b, a] = resolve(mix[1], tokens);
    return [r, g, b, a * (Number(mix[2]) / 100)];
  }
  const single = /^var\((--[\w-]+)\)$/.exec(value);
  if (single) return resolve(tokens[single[1]], tokens);
  if (value.startsWith("#")) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
    return [r, g, b, 1];
  }
  const substituted = value.replace(/var\((--[\w-]+)\)/g, (_, name) => tokens[name]);
  const [channels, alpha] = substituted.replace(/^rgba?\(|\)$/g, "").split("/");
  const numbers = channels.split(/[\s,]+/).filter(Boolean).map(Number);
  return [numbers[0], numbers[1], numbers[2], alpha !== undefined ? Number(alpha) : (numbers[3] ?? 1)];
}

/** Paints a translucent [r, g, b, a] over an opaque [r, g, b]. */
export const over = ([r, g, b, a], [br, bg, bb]) => [r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a)];

function luminance([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** WCAG 2 contrast ratio of two opaque colours. */
export function contrastRatio(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}
