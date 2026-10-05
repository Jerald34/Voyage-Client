import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// jsdom replaces the global URL, so resolve from import.meta.dirname (see theme-safe-classes.test.js).
const ROOT = resolve(import.meta.dirname, "..");

function sourceFiles(dir) {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) return sourceFiles(rel);
    return /\.(jsx?|tsx?|css)$/.test(name) ? [rel] : [];
  });
}

// UTF-8 text read as Windows-1252 and saved again: "—" becomes "â€”", "é" becomes "Ã©",
// a non-breaking space becomes "Â ". These pairs don't occur in real copy.
const MOJIBAKE = /â€|Ã[\u0080-¿]|Â[ -¿]/;

describe("source text encoding", () => {
  it("has no double-encoded characters in app/", () => {
    const offenders = sourceFiles("app").flatMap((rel) =>
      readFileSync(join(ROOT, rel), "utf8")
        .split("\n")
        .flatMap((line, index) => (MOJIBAKE.test(line) ? [`${rel}:${index + 1}: ${line.trim()}`] : [])),
    );
    expect(offenders).toEqual([]);
  });
});
