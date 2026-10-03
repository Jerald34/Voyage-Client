import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

// jsdom replaces the global URL, which node:url's fileURLToPath rejects, so resolve from __dirname.
const ROOT = resolve(__dirname, "..");

function sourceFiles(dir = join(ROOT, "app")) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(jsx?|tsx?)$/.test(name) ? [path] : [];
  });
}

/** Every source line's class-like tokens, each split into its variants (`dark`, `hover`) and utility. */
function* classLines() {
  for (const file of sourceFiles()) {
    const rel = relative(ROOT, file).split(sep).join("/");
    const lines = readFileSync(file, "utf8").split("\n");
    for (const [index, text] of lines.entries()) {
      const tokens = text
        .split(/[\s"'`{}]+/)
        .filter(Boolean)
        .map((token) => {
          const parts = token.split(":");
          return { token, variants: parts.slice(0, -1), utility: parts.at(-1) };
        });
      yield { where: `${rel}:${index + 1}`, rel, tokens };
    }
  }
}

describe("theme-safe colour classes", () => {
  // --color-primary is navy in light mode and near-white in dark mode, so plain
  // white text on it disappears in dark mode. Use text-on-primary.
  it("never puts plain white text on a primary fill", () => {
    const offenders = [];
    for (const { where, tokens } of classLines()) {
      const plain = new Set(tokens.filter((t) => t.variants.length === 0).map((t) => t.utility));
      if (plain.has("bg-primary") && plain.has("text-white")) offenders.push(where);
    }
    expect(offenders).toEqual([]);
  });
});
