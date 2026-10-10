// tests/landing-content.test.js
import { describe, expect, it } from "vitest";
import * as content from "../app/components/landing/landingContent.js";

describe("landing copy", () => {
  it("never mentions pricing", () => {
    expect(JSON.stringify(content)).not.toMatch(/pric/i);
  });

  it("links the nav to sections that exist", () => {
    const sectionIds = ["what-it-does", "how-it-works", "for-agencies", "faq"];
    expect(content.LANDING_NAV.map((link) => link.href)).toEqual(sectionIds.map((id) => `#${id}`));
  });

  it("has the five 'after the plan' tabs in order", () => {
    expect(content.AFTER_THE_PLAN_TABS.map((tab) => tab.id)).toEqual(["ask", "share", "feedback", "pdf", "approve"]);
  });

  it("keeps the sample-trip callouts to five", () => {
    expect(content.SAMPLE_CALLOUTS).toHaveLength(5);
  });
});
