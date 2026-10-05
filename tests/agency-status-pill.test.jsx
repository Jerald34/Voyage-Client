import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AgencyStatusPill from "../app/components/admin/AgencyStatusPill.jsx";

describe("AgencyStatusPill", () => {
  it.each([
    ["PENDING_REVIEW", "Pending", "text-accent"],
    ["VERIFIED", "Approved", "text-status-success"],
    ["REJECTED", "Rejected", "text-status-danger"],
    ["SUSPENDED", "Suspended", "text-status-warning"],
  ])("shows %s as %s", (status, label, tone) => {
    render(<AgencyStatusPill status={status} />);
    const pill = screen.getByText(label);
    expect(pill.className).toContain(tone);
  });

  it("falls back to the raw status with a neutral tone", () => {
    render(<AgencyStatusPill status="ARCHIVED" />);
    expect(screen.getByText("ARCHIVED").className).toContain("text-text-muted");
  });
});
