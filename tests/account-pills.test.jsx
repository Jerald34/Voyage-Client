import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccountTypePill, AccountStatusPill, SuperAdminChip } from "../app/components/admin/AccountPills.jsx";

describe("account pills", () => {
  it("labels every account type and gives each its own tone", () => {
    const { rerender } = render(<AccountTypePill type="PERSONAL" />);
    const personal = screen.getByText("Personal").className;
    expect(personal).toContain("text-secondary-strong");

    rerender(<AccountTypePill type="AGENCY_USER" />);
    const agency = screen.getByText("Agency").className;
    expect(agency).toContain("text-primary");
    expect(agency).not.toBe(personal);

    rerender(<AccountTypePill type="PENDING" />);
    const pending = screen.getByText("Setup incomplete").className;
    expect(pending).toContain("text-text-muted");
    expect(pending).toContain("border-dashed");
  });

  it("falls back to the raw value for an account type it does not know", () => {
    render(<AccountTypePill type="GUEST" />);
    expect(screen.getByText("GUEST")).toBeInTheDocument();
  });

  it("shows Active in the success family and Disabled in the danger family", () => {
    const { rerender } = render(<AccountStatusPill status="ACTIVE" />);
    expect(screen.getByText("Active").className).toContain("text-status-success");
    rerender(<AccountStatusPill status="DISABLED" />);
    expect(screen.getByText("Disabled").className).toContain("text-status-danger");
  });

  it("renders the Super admin chip as plain text so it never relies on colour", () => {
    render(<SuperAdminChip />);
    expect(screen.getByText("Super admin")).toBeInTheDocument();
  });
});
