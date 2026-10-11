import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { describe, expect, it } from "vitest";

// jsdom replaces the global URL, which node:url's fileURLToPath rejects, so resolve from import.meta.dirname
const css = readFileSync(resolvePath(import.meta.dirname, "../app/globals.css"), "utf8");

/** The body of the @media (prefers-reduced-motion: reduce) block. */
function getReducedMotionBlock() {
  const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
  expect(start).toBeGreaterThan(-1);

  // Find the end of this media block by balancing braces
  const afterBlockStart = css.indexOf("{", start) + 1;
  let braceDepth = 1;
  let blockEnd = afterBlockStart;
  while (braceDepth > 0 && blockEnd < css.length) {
    if (css[blockEnd] === "{") braceDepth += 1;
    if (css[blockEnd] === "}") braceDepth -= 1;
    blockEnd += 1;
  }
  return css.slice(afterBlockStart, blockEnd - 1);
}

describe("reduced-motion CSS", () => {
  it("guards that the scale reset is a separate rule from the transform reset", () => {
    const mediaBlock = getReducedMotionBlock();

    // Check that there IS a :where(*), ::before, ::after rule
    const scaleRuleMatch = mediaBlock.match(/:where\(\*\),\s*::before,\s*::after\s*{([^}]+)}/);
    expect(scaleRuleMatch, "should have :where(*), ::before, ::after rule").toBeTruthy();
    expect(scaleRuleMatch[1]).toContain("scale: none !important");

    // Check that the transform rule exists and does NOT contain scale:
    const transformRuleMatch = mediaBlock.match(/[^:]*{[^}]*transform:\s*none\s*!important[^}]*}/);
    expect(transformRuleMatch, "should have transform: none rule").toBeTruthy();
    expect(transformRuleMatch[0]).not.toContain("scale:");
  });

  it("leaves Leaflet's inline translate3d() positioning alone", () => {
    const mediaBlock = getReducedMotionBlock();

    // Every rule that resets transform must exclude the map and everything inside it, or every tile
    // and pin collapses into the map's corner.
    const transformRules = [...mediaBlock.matchAll(/([^{}]+){([^{}]*\btransform:\s*none\s*!important[^{}]*)}/g)];
    expect(transformRules.length).toBeGreaterThan(0);
    for (const [, selector] of transformRules) {
      expect(selector).toContain(":not(.leaflet-container, .leaflet-container *)");
    }
  });

  it("does not reset transforms in the shared animation and transition rule", () => {
    const mediaBlock = getReducedMotionBlock();

    const sharedRule = mediaBlock.match(/\*,\s*\*::before,\s*\*::after\s*{([^}]+)}/);
    expect(sharedRule, "should have the shared *, *::before, *::after rule").toBeTruthy();
    expect(sharedRule[1]).toContain("animation-duration: 0.01ms !important");
    expect(sharedRule[1]).not.toContain("transform");
  });

  it("turns smooth scrolling off", () => {
    const mediaBlock = getReducedMotionBlock();

    expect(css).toMatch(/html\s*{\s*scroll-behavior:\s*smooth;?\s*}/);
    expect(mediaBlock).toMatch(/html\s*{\s*scroll-behavior:\s*auto;?\s*}/);
  });
});
