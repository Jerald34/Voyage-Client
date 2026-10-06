import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AgencyStatusPill from "../app/components/admin/AgencyStatusPill.jsx";

describe("AgencyStatusPill", () => {
  it.each([
    ["PENDING_REVIEW", "Pending", "text-text-primary"],
    ["VERIFIED", "Approved", "text-status-success"],
    ["REJECTED", "Rejected", "text-status-danger"],
    ["SUSPENDED", "Suspended", "text-status-warning"],
  ])("shows %s as %s", (status, label, tone) => {
    render(<AgencyStatusPill status={status} />);
    const pill = screen.getByText(label);
    expect(pill.className).toContain(tone);
  });

  it("draws Pending as a peach tint with primary text and a terracotta dot, not peach-on-peach", () => {
    render(<AgencyStatusPill status="PENDING_REVIEW" />);
    const pill = screen.getByText("Pending");
    expect(pill.className).toContain("bg-accent/20");
    expect(pill.className).not.toContain("text-accent");
    const dot = pill.querySelector("[aria-hidden='true']");
    expect(dot.className).toContain("bg-secondary");
    expect(dot.className).not.toContain("bg-secondary-strong");
  });

  it("falls back to the raw status with a neutral tone", () => {
    render(<AgencyStatusPill status="ARCHIVED" />);
    expect(screen.getByText("ARCHIVED").className).toContain("text-text-muted");
  });
});
