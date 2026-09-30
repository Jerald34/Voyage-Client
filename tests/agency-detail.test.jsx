import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app/lib/api/index.js", () => ({
  fetchAgencyDetail: vi.fn().mockResolvedValue({
    agency: {
      id: "a1", name: "Alpha Travel", status: "PENDING_REVIEW",
      ownerUser: { displayName: "Ana", email: "ana@x.com" },
      submittedAt: "2026-05-01", documents: [], auditEvents: [],
    },
  }),
  adminApproveAgency: vi.fn().mockResolvedValue({}),
  adminRejectAgency: vi.fn().mockResolvedValue({}),
  adminSuspendAgency: vi.fn().mockResolvedValue({}),
  adminUnsuspendAgency: vi.fn().mockResolvedValue({}),
}));

import { adminApproveAgency } from "../app/lib/api/index.js";
import AgencyDetail from "../app/components/admin/AgencyDetail.jsx";

describe("AgencyDetail", () => {
  it("loads the agency and shows owner + status", async () => {
    render(<AgencyDetail agencyId="a1" onAction={() => {}} />);
    await waitFor(() => expect(screen.getByText("Ana")).toBeInTheDocument());
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("approves a pending agency", async () => {
    render(<AgencyDetail agencyId="a1" onAction={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    await waitFor(() => expect(adminApproveAgency).toHaveBeenCalledWith("a1"));
  });
});
