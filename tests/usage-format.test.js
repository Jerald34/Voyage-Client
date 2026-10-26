import { describe, expect, it } from "vitest";
import { deltaPct, fmtInt, fmtPct, fmtShortDate, fmtUsd, roleTagLine } from "../app/components/admin/usage/usageFormat.js";

describe("usage formatters", () => {
  it("formats money by size so small costs stay readable", () => {
    expect(fmtUsd(0)).toBe("$0.00");
    expect(fmtUsd(0.00042)).toBe("$0.0004");
    expect(fmtUsd(0.023)).toBe("$0.023");
    expect(fmtUsd(4.8231)).toBe("$4.82");
  });

  it("never prints a zero-looking amount for a cost that is not zero", () => {
    expect(fmtUsd(0.00004)).toBe("<$0.0001");
    expect(fmtUsd(0.0000001)).toBe("<$0.0001");
    expect(fmtUsd(0.0001)).toBe("$0.0001");
    expect(fmtUsd(0)).toBe("$0.00");
    expect(fmtUsd(null)).toBe("$0.00");
  });

  it("uses a fixed number of decimals within each size and thousands separators", () => {
    expect(fmtUsd(0.5)).toBe("$0.500");
    expect(fmtUsd(0.01)).toBe("$0.010");
    expect(fmtUsd(0.005)).toBe("$0.0050");
    expect(fmtUsd(1)).toBe("$1.00");
    expect(fmtUsd(12.3)).toBe("$12.30");
    expect(fmtUsd(1234.5)).toBe("$1,234.50");
    expect(fmtUsd(1234567.891)).toBe("$1,234,567.89");
  });

  it("does not show a rounded-up value at the wrong precision at a size boundary", () => {
    expect(fmtUsd(0.9996)).toBe("$1.00");
    expect(fmtUsd(0.00999)).toBe("$0.010");
  });

  it("formats counts, percents and dates", () => {
    expect(fmtInt(1313790.4)).toBe("1,313,790");
    expect(fmtPct(0.4467)).toBe("45%");
    expect(fmtShortDate("2026-10-03")).toBe("Oct 3");
  });

  it("gives a change ratio, or null when there was nothing before", () => {
    expect(deltaPct(1.38, 1)).toBeCloseTo(0.38, 9);
    expect(deltaPct(5, 0)).toBeNull();
  });

  it("builds the user tag line", () => {
    expect(roleTagLine({ roleTag: "OWNER", agencyName: "Hops Travel" })).toBe("Owner · Hops Travel");
    expect(roleTagLine({ roleTag: "PERSONAL", agencyName: null })).toBe("Personal");
    expect(roleTagLine({ roleTag: null, agencyName: "Hops Travel" })).toBe("Hops Travel");
    expect(roleTagLine({ roleTag: null, agencyName: null })).toBe("");
  });
});
