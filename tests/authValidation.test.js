import { describe, it, expect } from "vitest";
import {
  sanitizeBusinessPhoneInput,
  validateBusinessPhone,
} from "../app/components/auth/authValidation.js";

describe("sanitizeBusinessPhoneInput", () => {
  it("strips non-digit characters", () => {
    expect(sanitizeBusinessPhoneInput("+63 917 123 4567")).toBe("639171234567");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeBusinessPhoneInput("")).toBe("");
  });

  it("handles null/undefined gracefully", () => {
    expect(sanitizeBusinessPhoneInput(null)).toBe("");
    expect(sanitizeBusinessPhoneInput(undefined)).toBe("");
  });
});

describe("validateBusinessPhone", () => {
  it("returns error for empty string", () => {
    expect(validateBusinessPhone("")).toBe("Business phone is required");
  });

  it("returns error for a single digit", () => {
    expect(validateBusinessPhone("1")).toBe("Enter a valid phone number (7–15 digits)");
  });

  it("returns error for 3-digit string", () => {
    expect(validateBusinessPhone("000")).toBe("Enter a valid phone number (7–15 digits)");
  });

  it("returns error for 6-digit string (one short of minimum)", () => {
    expect(validateBusinessPhone("123456")).toBe("Enter a valid phone number (7–15 digits)");
  });

  it("returns error for a 16-digit string (one over maximum)", () => {
    expect(validateBusinessPhone("1234567890123456")).toBe(
      "Enter a valid phone number (7–15 digits)"
    );
  });

  it("accepts a 7-digit minimum number", () => {
    expect(validateBusinessPhone("1234567")).toBeNull();
  });

  it("accepts a 15-digit maximum number", () => {
    expect(validateBusinessPhone("123456789012345")).toBeNull();
  });

  it("accepts a valid PH number: 639171234567 (12 digits)", () => {
    expect(validateBusinessPhone("639171234567")).toBeNull();
  });

  it("accepts a 10-digit local number", () => {
    expect(validateBusinessPhone("1234567890")).toBeNull();
  });
});
