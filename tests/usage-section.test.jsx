import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app/lib/api/admin.js", () => ({
  fetchUsage: vi.fn().mockResolvedValue({
    period: "day", groupBy: "user",
    series: [{ bucket: "2026-06-01", totalTokens: 140 }],
    rows: [{ id: "u1", label: "Ana", promptTokens: 100, outputTokens: 40, totalTokens: 140, costUsd: 0.003, runCount: 1 }],
    totals: { totalTokens: 140, costUsd: 0.003, runCount: 1, cachedTokens: 20 },
  }),
}));

import UsageSection from "../app/components/admin/usage/UsageSection.jsx";

describe("UsageSection", () => {
  it("loads and renders usage data", async () => {
    render(<UsageSection />);
    await waitFor(() => expect(screen.getAllByText("Ana").length).toBeGreaterThan(0));
    expect(screen.getByText(/total tokens/i)).toBeInTheDocument();
  });
});
