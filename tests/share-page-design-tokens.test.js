import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

// jsdom replaces the global URL, so resolve from import.meta.dirname (see theme-safe-classes.test.js).
const ROOT = resolve(import.meta.dirname, "..");
const SHARE_DIR = join(ROOT, "app", "itinerary", "view", "[token]");

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(jsx?|tsx?)$/.test(name) ? [path] : [];
  });
}

function shareLines() {
  return sourceFiles(SHARE_DIR).flatMap((file) => {
    const rel = relative(ROOT, file).split(sep).join("/");
    return readFileSync(file, "utf8")
      .split("\n")
      .map((text, index) => ({ where: `${rel}:${index + 1}`, text }));
  });
}

// A Tailwind class with any variants in front ("hover:", "max-sm:", "@min-[720px]:") and an
// optional opacity ("/90") after it, so `hover:bg-secondary` and `bg-secondary/90` still
// count as `bg-secondary`. `bg-secondary-strong` is a different token and does not.
const hasClass = (text, name) => new RegExp(`(^|[\\s"'\`])(?:[^\\s"'\`:]+:)*${name}(?:/\\d+)?($|[\\s"'\`])`).test(text);

describe("public share page colours", () => {
  it("uses theme tokens instead of raw hex or rgba colours", () => {
    const offenders = shareLines()
      .filter(({ text }) => /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(/.test(text))
      .map(({ where, text }) => `${where}  ${text.trim()}`);
    expect(offenders).toEqual([]);
  });

  it("never puts white text on the light terracotta fill (about 2.8:1)", () => {
    const offenders = shareLines()
      .filter(({ text }) => hasClass(text, "bg-secondary") && hasClass(text, "text-white"))
      .map(({ where }) => where);
    expect(offenders).toEqual([]);
  });

  it("never puts white text on the contrast-safe terracotta, which has its own on-colour", () => {
    const offenders = shareLines()
      .filter(({ text }) => hasClass(text, "bg-secondary-strong") && (!hasClass(text, "text-on-secondary-strong") || hasClass(text, "text-white")))
      .map(({ where }) => where);
    expect(offenders).toEqual([]);
  });

  it("uses status tokens instead of raw red for errors", () => {
    const offenders = shareLines()
      .filter(({ text }) => /\b(text|bg|border|ring|fill|stroke)-red-\d{2,3}\b/.test(text))
      .map(({ where }) => where);
    expect(offenders).toEqual([]);
  });
});
