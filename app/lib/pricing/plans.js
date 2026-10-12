/**
 * Voyage's price list (capstone panel item 15). Display only: nothing is charged, stored
 * or enforced. The landing page shows these tiers and Settings compares this month's
 * usage against them. The costing behind each price is in
 * Voyage-Server/docs/capstone/pricing-and-costing.md; change both together.
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
    monthlyPrice: 2990,
    teamMembers: 2,
    itinerariesPerMonth: 15,
    summary: "For a solo agent or a two-person shop.",
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 6990,
    teamMembers: 5,
    itinerariesPerMonth: 40,
    summary: "For a growing agency team.",
    featured: true,
  },
  {
    id: "agency",
    name: "Agency",
    monthlyPrice: 16990,
    teamMembers: 15,
    itinerariesPerMonth: 100,
    summary: "For established agencies with many planners.",
  },
];

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
