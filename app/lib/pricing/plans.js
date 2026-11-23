/**
 * Voyage's price list (capstone panel item 15). Display only: nothing is charged, stored
 * or enforced. The landing page shows these tiers and Settings compares this month's
 * usage against them. Each price is what one agency costs to run at its full allowance plus
 * PROFIT_PER_AGENCY; RUNNING_COSTS and each plan's usageCost below are that costing, and the
 * "How prices are set" breakdown shows it. Change the costing and the prices together.
 */
export const FREE_TRIAL_DAYS = 14;

/** Every tier has the whole product; tiers differ only in team size and monthly itineraries. */
export const PLAN_INCLUDES = [
  "the AI planning agent",
  "maps and routes",
  "share links and client comments",
  "PDF and print",
  "weather and accessibility notes",
  "post-trip ratings",
];

export const PLANS = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 2375,
    // AI and Google Maps at the full 15 itineraries; Maps stays inside Google's free monthly allowance.
    usageCost: 375,
    teamMembers: 2,
    itinerariesPerMonth: 15,
    summary: "For a solo agent or a two-person shop.",
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 3380,
    usageCost: 1380,
    teamMembers: 5,
    itinerariesPerMonth: 40,
    summary: "For a growing agency team.",
    featured: true,
  },
  {
    id: "agency",
    name: "Agency",
    monthlyPrice: 9880,
    usageCost: 7880,
    teamMembers: 15,
    itinerariesPerMonth: 100,
    summary: "For established agencies with many planners.",
  },
];

/** What Voyage pays each month to keep running, the same for every plan. Pesos at ₱61 to US$1. */
export const RUNNING_COSTS = [
  { id: "railway", label: "Server and PostgreSQL database (Railway)", amount: 610 },
  { id: "vercel", label: "Website hosting (Vercel)", amount: 1220 },
  { id: "domain", label: "Domain name", amount: 70 },
];

export const PROFIT_PER_AGENCY = 100;

export const RUNNING_COST_TOTAL = RUNNING_COSTS.reduce((sum, cost) => sum + cost.amount, 0);

/** One agency on this plan at its full allowance: what it costs Voyage, and what is left of the price. */
export function planCosting(plan) {
  const total = RUNNING_COST_TOTAL + plan.usageCost;
  return { running: RUNNING_COST_TOTAL, usage: plan.usageCost, total, profit: plan.monthlyPrice - total };
}

const PESO = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0, maximumFractionDigits: 0 });

export function formatPeso(amount) {
  return PESO.format(amount);
}

// Non-numeric and non-finite usage (a missing field, NaN) counts as none, so it can't skip every tier.
const safe = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

/** The cheapest tier whose team size and monthly itineraries cover this usage, or null when none does. */
export function suggestPlan({ itineraries = 0, members = 0 } = {}) {
  const neededItineraries = safe(itineraries);
  const neededMembers = safe(members);
  return PLANS.find((plan) => plan.teamMembers >= neededMembers && plan.itinerariesPerMonth >= neededItineraries) ?? null;
}
