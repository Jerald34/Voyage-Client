import { describe, expect, it } from "vitest";
import {
  ACCOUNT_TYPE_LABELS,
  MEMBERSHIP_ROLE_LABELS,
  SIGN_IN_LABELS,
  displayName,
  formatDate,
} from "../app/components/admin/accountLabels.js";

describe("account labels", () => {
  it("names each account type the way the admin filter does", () => {
    expect(ACCOUNT_TYPE_LABELS).toEqual({
      PERSONAL: "Personal",
      AGENCY_USER: "Agency",
      PENDING: "Setup incomplete",
    });
  });

  it("names membership roles and sign-in methods in plain words", () => {
    expect(MEMBERSHIP_ROLE_LABELS).toEqual({ OWNER: "Owner", ADMIN: "Admin", STAFF: "Staff" });
    expect(SIGN_IN_LABELS).toEqual({ PASSWORD: "Email & password", GOOGLE: "Google", APPLE: "Apple" });
  });

  it("names an account by its display name, falling back to its email", () => {
    expect(displayName({ displayName: "Ana Reyes", email: "ana@alpha.com" })).toBe("Ana Reyes");
    expect(displayName({ displayName: "", email: "ana@alpha.com" })).toBe("ana@alpha.com");
    expect(displayName({ displayName: null, email: "ana@alpha.com" })).toBe("ana@alpha.com");
    expect(displayName({})).toBe("");
  });

  it("formats dates like the agency table and shows a dash when there is none", () => {
    expect(formatDate("2026-05-01T12:00:00.000Z")).toBe("May 1, 2026");
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });
});
