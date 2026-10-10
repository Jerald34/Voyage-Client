// tests/landing-classes.test.js
import { describe, expect, it } from "vitest";
import { FOCUS, FOCUS_INSET, PRIMARY_BUTTON, SECONDARY_BUTTON } from "../app/components/landing/landingClasses.js";

const classesOf = (value) => value.split(/\s+/);

describe("landing button classes", () => {
  it("gives the secondary button the same press feedback as the primary", () => {
    for (const button of [PRIMARY_BUTTON, SECONDARY_BUTTON]) {
      const classes = classesOf(button);
      expect(classes).toContain("active:scale-[0.97]");
      expect(classes).toContain("motion-reduce:active:scale-100");
    }
  });

  it("transitions the secondary button's fill and scale, and nothing else it doesn't need", () => {
    const classes = classesOf(SECONDARY_BUTTON);
    expect(classes).toContain("transition-[background-color,scale]");
    expect(classes).not.toContain("transition-colors");
  });

  it("shares one focus ring, 2px and outside or inset", () => {
    for (const button of [PRIMARY_BUTTON, SECONDARY_BUTTON]) expect(button).toContain(FOCUS);
    expect(FOCUS).toContain("focus-visible:outline-offset-2");
    expect(FOCUS_INSET).toContain("focus-visible:-outline-offset-2");
  });
});
