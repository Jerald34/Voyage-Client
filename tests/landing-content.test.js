// tests/landing-content.test.js
import { describe, expect, it } from "vitest";
import * as content from "../app/components/landing/landingContent.js";

describe("landing copy", () => {
  it("keeps prices out of the landing copy (they live in lib/pricing/plans.js)", () => {
    expect(JSON.stringify(content)).not.toMatch(/₱/);
  });

  it("links the nav to sections that exist", () => {
    const sectionIds = ["what-it-does", "how-it-works", "for-agencies", "pricing", "faq"];
    expect(content.LANDING_NAV.map((link) => link.href)).toEqual(sectionIds.map((id) => `#${id}`));
  });

  it("has the five 'after the plan' tabs in order", () => {
    expect(content.AFTER_THE_PLAN_TABS.map((tab) => tab.id)).toEqual(["ask", "share", "feedback", "pdf", "approve"]);
  });

  it("keeps the sample-trip callouts to five", () => {
    expect(content.SAMPLE_CALLOUTS).toHaveLength(5);
  });

  it("says the demos are built from Voyage's own components and send nothing", () => {
    expect(content.AFTER_THE_PLAN.body).toBe(
      "The same trip, through the rest of Voyage. Everything here is built from Voyage's own components, and nothing you do here is sent anywhere.",
    );
  });
});
