import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { describe, expect, it } from "vitest";

// jsdom replaces the global URL, which node:url's fileURLToPath rejects, so resolve from import.meta.dirname
const css = readFileSync(resolvePath(import.meta.dirname, "../app/globals.css"), "utf8");

describe("reduced-motion CSS", () => {
  it("guards that the scale reset is a separate rule from the transform reset", () => {
    // Extract the @media (prefers-reduced-motion: reduce) block
    const prefersReducedMotionStart = css.indexOf("@media (prefers-reduced-motion: reduce)");
    expect(prefersReducedMotionStart).toBeGreaterThan(-1);

    // Find the end of this media block (next @media at the same level or EOF)
    const afterBlockStart = css.indexOf("{", prefersReducedMotionStart) + 1;
    let braceDepth = 1;
    let blockEnd = afterBlockStart;
    while (braceDepth > 0 && blockEnd < css.length) {
      if (css[blockEnd] === "{") braceDepth += 1;
      if (css[blockEnd] === "}") braceDepth -= 1;
      blockEnd += 1;
    }
    const mediaBlock = css.slice(afterBlockStart, blockEnd - 1);

    // Check that there IS a :where(*), ::before, ::after rule
    const scaleRuleMatch = mediaBlock.match(/:where\(\*\),\s*::before,\s*::after\s*{([^}]+)}/);
    expect(scaleRuleMatch, "should have :where(*), ::before, ::after rule").toBeTruthy();
    expect(scaleRuleMatch[1]).toContain("scale: none !important");

    // Check that the transform rule exists and does NOT contain scale:
    const transformRuleMatch = mediaBlock.match(/[^:]*{[^}]*transform:\s*none\s*!important[^}]*}/);
    expect(transformRuleMatch, "should have transform: none rule").toBeTruthy();
    expect(transformRuleMatch[0]).not.toContain("scale:");
  });
});
