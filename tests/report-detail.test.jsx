import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app/lib/api/admin.js", () => ({
  fetchReportDetail: vi.fn().mockResolvedValue({
    report: { id: "r1", subject: "Crash", category: "BUG", status: "NEW", message: "It broke", reporterUser: { email: "a@b.com" }, createdAt: "2026-06-01" },
  }),
  updateReport: vi.fn().mockResolvedValue({ report: {} }),
}));

import { updateReport } from "../app/lib/api/admin.js";
import ReportDetail from "../app/components/admin/reports/ReportDetail.jsx";

describe("ReportDetail", () => {
  it("loads and shows the report message", async () => {
    render(<ReportDetail reportId="r1" onUpdated={() => {}} />);
    await waitFor(() => expect(screen.getByText("It broke")).toBeInTheDocument());
  });

  it("saves status + notes", async () => {
    render(<ReportDetail reportId="r1" onUpdated={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("button", { name: /^save$/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(updateReport).toHaveBeenCalled());
  });
});
