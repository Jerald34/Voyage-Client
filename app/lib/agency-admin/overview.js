// app/lib/agency-admin/overview.js
import { suggestPlan } from "../pricing/plans.js";

/** Usage at or above this share of the fitting plan's monthly itineraries earns a "Needs attention" row. */
export const NEAR_LIMIT_PERCENT = 80;

const STATUS_LABELS = {
  VERIFIED: "Verified",
  PENDING_REVIEW: "Pending review",
  SUSPENDED: "Suspended",
  REJECTED: "Rejected",
};

export function agencyStatusLabel(status) {
  return STATUS_LABELS[status] ?? "Unknown";
}

// The fields AgencyDetailsForm refuses to save empty. Business email is optional there.
const REQUIRED_DETAILS = [
  ["businessPhone", "business phone"],
  ["city", "city"],
  ["country", "country"],
];

/** The required agency fields that are still empty, as lower-case labels. */
export function missingAgencyDetails(agency) {
  return REQUIRED_DETAILS.filter(([key]) => !String(agency?.[key] ?? "").trim()).map(([, label]) => label);
}

/** This month's itineraries as a whole percent of the plan's monthly limit, or null without both. */
export function planUsagePercent(usage, plan) {
  if (!usage || !plan) return null;
  const itineraries = Number(usage.itinerariesCreated) || 0;
  return Math.round((itineraries / plan.itinerariesPerMonth) * 100);
}

/**
 * The Overview's "Needs attention" rows, most actionable first. Each row names the
 * Agency section that fixes it. `usage` is null for admins: plan usage is owner-only.
 */
export function buildAttentionItems({ agency, invitations = [], usage = null, isOwner = false }) {
  const items = [];

  if (invitations.length > 0) {
    const count = invitations.length;
    items.push({
      id: "invites",
      text: `${count} ${count === 1 ? "invitation is" : "invitations are"} still pending`,
      section: "team",
      action: "Open team",
    });
  }

  if (isOwner) {
    const missing = missingAgencyDetails(agency);
    if (missing.length > 0) {
      items.push({ id: "details", text: `Agency details are missing: ${missing.join(", ")}`, section: "profile", action: "Edit profile" });
    }
  }

  if (isOwner && usage) {
    const plan = suggestPlan({ itineraries: usage.itinerariesCreated, members: usage.activeMembers });
    if (!plan) {
      items.push({ id: "plan", text: "This month's usage is above every plan", section: "plan", action: "See plan" });
    } else if (planUsagePercent(usage, plan) >= NEAR_LIMIT_PERCENT) {
      items.push({ id: "plan", text: `Usage is at ${planUsagePercent(usage, plan)}% of the ${plan.name} plan`, section: "plan", action: "See plan" });
    }
  }

  return items;
}
