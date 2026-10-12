import { describe, expect, it } from "vitest";
import { FREE_TRIAL_DAYS, PLANS, formatPeso, suggestPlan } from "../app/lib/pricing/plans.js";

describe("price list", () => {
  it("has three tiers, cheapest first, matching the costing doc", () => {
    expect(PLANS.map((plan) => [plan.id, plan.monthlyPrice, plan.teamMembers, plan.itinerariesPerMonth])).toEqual([
      ["starter", 2990, 2, 15],
      ["pro", 6990, 5, 40],
      ["agency", 16990, 15, 100],
    ]);
    expect(PLANS.filter((plan) => plan.featured).map((plan) => plan.id)).toEqual(["pro"]);
    expect(FREE_TRIAL_DAYS).toBe(14);
  });

  it("formats pesos without centavos", () => {
    expect(formatPeso(2990)).toBe("₱2,990");
    expect(formatPeso(16990)).toBe("₱16,990");
  });
});

describe("suggestPlan", () => {
  it("picks the cheapest tier that covers both members and itineraries", () => {
    expect(suggestPlan({ itineraries: 0, members: 1 }).id).toBe("starter");
    expect(suggestPlan({ itineraries: 15, members: 2 }).id).toBe("starter");
    expect(suggestPlan({ itineraries: 16, members: 2 }).id).toBe("pro");
    expect(suggestPlan({ itineraries: 3, members: 6 }).id).toBe("agency");
  });

  it("treats non-finite or non-numeric usage as none", () => {
    expect(suggestPlan({ itineraries: NaN, members: undefined }).id).toBe("starter");
    expect(suggestPlan({ itineraries: "abc", members: null }).id).toBe("starter");
    expect(suggestPlan({ itineraries: "40", members: "5" }).id).toBe("pro");
  });

  it("returns null when usage is above every tier", () => {
    expect(suggestPlan({ itineraries: 101, members: 3 })).toBeNull();
    expect(suggestPlan({ itineraries: 1, members: 16 })).toBeNull();
  });
});
