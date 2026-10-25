// tests/agency-admin-rules.test.js
import { describe, expect, it } from "vitest";
import { canManageAgency } from "../app/lib/agency-admin/roles.js";
import {
  NEAR_LIMIT_PERCENT,
  agencyStatusLabel,
  buildAttentionItems,
  missingAgencyDetails,
  planUsagePercent,
} from "../app/lib/agency-admin/overview.js";
import { PLANS } from "../app/lib/pricing/plans.js";

const starter = PLANS.find((plan) => plan.id === "starter");
const complete = { businessPhone: "639001112222", city: "Baguio", country: "Philippines" };

describe("canManageAgency", () => {
  it.each([
    [{ role: "OWNER", status: "ACTIVE" }, true],
    [{ role: "ADMIN", status: "ACTIVE" }, true],
    [{ role: "STAFF", status: "ACTIVE" }, false],
    [{ role: "OWNER", status: "PENDING" }, false],
    [null, false],
    [undefined, false],
  ])("%j → %s", (membership, expected) => {
    expect(canManageAgency(membership)).toBe(expected);
  });
});

describe("agencyStatusLabel", () => {
  it.each([
    ["VERIFIED", "Verified"],
    ["PENDING_REVIEW", "Pending review"],
    ["SUSPENDED", "Suspended"],
    ["REJECTED", "Rejected"],
    [undefined, "Unknown"],
  ])("%s → %s", (status, label) => {
    expect(agencyStatusLabel(status)).toBe(label);
  });
});

describe("missingAgencyDetails", () => {
  it("lists the required fields that are empty or blank", () => {
    expect(missingAgencyDetails({ businessPhone: " ", city: "Baguio", country: "" })).toEqual(["business phone", "country"]);
  });

  it("ignores the optional business email", () => {
    expect(missingAgencyDetails({ ...complete, businessEmail: "" })).toEqual([]);
  });

  it("treats a missing agency as all fields missing", () => {
    expect(missingAgencyDetails(null)).toEqual(["business phone", "city", "country"]);
  });
});

describe("planUsagePercent", () => {
  it("is this month's itineraries over the plan's monthly limit, rounded", () => {
    expect(planUsagePercent({ itinerariesCreated: 12 }, starter)).toBe(80);
    expect(planUsagePercent({ itinerariesCreated: 5 }, starter)).toBe(33);
  });

  it("is null without usage or a plan", () => {
    expect(planUsagePercent(null, starter)).toBeNull();
    expect(planUsagePercent({ itinerariesCreated: 3 }, null)).toBeNull();
  });
});

describe("buildAttentionItems", () => {
  it("is empty when nothing needs attention", () => {
    expect(buildAttentionItems({ agency: complete, invitations: [], usage: { itinerariesCreated: 1, activeMembers: 1 }, isOwner: true })).toEqual([]);
  });

  it("counts pending invitations, singular and plural, for owners and admins", () => {
    expect(buildAttentionItems({ agency: complete, invitations: [{ id: "i1" }] })[0]).toEqual({
      id: "invites",
      text: "1 invitation is still pending",
      section: "team",
      action: "Open team",
    });
    expect(buildAttentionItems({ agency: complete, invitations: [{ id: "i1" }, { id: "i2" }] })[0].text).toBe("2 invitations are still pending");
  });

  it("flags missing details for owners only", () => {
    const agency = { ...complete, city: "" };
    expect(buildAttentionItems({ agency, isOwner: true })).toEqual([
      { id: "details", text: "Agency details are missing: city", section: "profile", action: "Edit profile" },
    ]);
    expect(buildAttentionItems({ agency, isOwner: false })).toEqual([]);
  });

  it(`flags usage at ${NEAR_LIMIT_PERCENT}% or more of the fitting plan`, () => {
    expect(buildAttentionItems({ agency: complete, usage: { itinerariesCreated: 12, activeMembers: 2 }, isOwner: true })).toEqual([
      { id: "plan", text: "Usage is at 80% of the Starter plan", section: "plan", action: "See plan" },
    ]);
    expect(buildAttentionItems({ agency: complete, usage: { itinerariesCreated: 11, activeMembers: 2 }, isOwner: true })).toEqual([]);
  });

  it("flags usage above every plan", () => {
    expect(buildAttentionItems({ agency: complete, usage: { itinerariesCreated: 500, activeMembers: 2 }, isOwner: true })).toEqual([
      { id: "plan", text: "This month's usage is above every plan", section: "plan", action: "See plan" },
    ]);
  });

  it("orders rows invitations, details, plan", () => {
    const items = buildAttentionItems({
      agency: { ...complete, country: "" },
      invitations: [{ id: "i1" }],
      usage: { itinerariesCreated: 14, activeMembers: 2 },
      isOwner: true,
    });
    expect(items.map((item) => item.id)).toEqual(["invites", "details", "plan"]);
  });
});
