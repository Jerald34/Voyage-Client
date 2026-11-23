import { describe, expect, it } from "vitest";
import { FREE_TRIAL_DAYS, PLANS, PROFIT_PER_AGENCY, RUNNING_COST_TOTAL, formatPeso, planCosting, suggestPlan } from "../app/lib/pricing/plans.js";

describe("price list", () => {
  it("has three tiers, cheapest first", () => {
    expect(PLANS.map((plan) => [plan.id, plan.monthlyPrice, plan.teamMembers, plan.itinerariesPerMonth])).toEqual([
      ["starter", 2375, 2, 15],
      ["pro", 3380, 5, 40],
      ["agency", 9880, 15, 100],
    ]);
    expect(PLANS.filter((plan) => plan.featured).map((plan) => plan.id)).toEqual(["pro"]);
    expect(FREE_TRIAL_DAYS).toBe(14);
  });

  it("formats pesos without centavos", () => {
    expect(formatPeso(2990)).toBe("₱2,990");
    expect(formatPeso(16990)).toBe("₱16,990");
  });
});

describe("planCosting", () => {
  it("runs on ₱1,900 a month of servers, database and domain", () => {
    expect(RUNNING_COST_TOTAL).toBe(1900);
  });

  it("prices every plan at one agency's full-allowance cost plus the set profit", () => {
    expect(PLANS.map((plan) => planCosting(plan).total)).toEqual([2275, 3280, 9780]);
    for (const plan of PLANS) expect(planCosting(plan).profit).toBe(PROFIT_PER_AGENCY);
    expect(PROFIT_PER_AGENCY).toBe(100);
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
