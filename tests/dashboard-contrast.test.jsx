import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import HeroContinueCard from "../app/agency/[agencyId]/components/dashboard/widgets/HeroContinueCard.jsx";
import MyWorkColumn from "../app/agency/[agencyId]/components/dashboard/widgets/MyWorkColumn.jsx";
import PeriodSwitcher from "../app/agency/[agencyId]/components/dashboard/widgets/PeriodSwitcher.jsx";

const trip = (statusChip, tripId = statusChip) => ({
  tripId,
  tripTitle: `Trip ${statusChip}`,
  clientName: "Reyes",
  statusChip,
  updatedAt: new Date().toISOString(),
  lastActivityPreview: null,
});

/** The colour a chip was given, read from its inline style attribute. */
const chipColor = (element) => /(?:^|;\s*)color:\s*([^;]+)/.exec(element.getAttribute("style") ?? "")?.[1].trim();

describe("PeriodSwitcher contrast", () => {
  it("uses the strong accent pair for the selected period, readable in light and dark", () => {
    render(<PeriodSwitcher value="30d" onChange={() => {}} />);

    const active = screen.getByRole("radio", { name: "30d" });
    expect(active.className).toContain("bg-secondary-strong");
    expect(active.className).toContain("text-on-secondary-strong");
    expect(active.className).not.toMatch(/bg-secondary(?!-)/);
    expect(active.className).not.toContain("text-white");
  });

  it("transitions only the colours it changes", () => {
    render(<PeriodSwitcher value="30d" onChange={() => {}} />);

    const { className } = screen.getByRole("radio", { name: "7d" });
    expect(className).toContain("transition-[background-color,color]");
    expect(className).not.toContain("transition-all");
  });
});

describe("MyWorkColumn status chips", () => {
  function renderChips(statuses) {
    render(<MyWorkColumn hero={null} recent={statuses.map((status) => trip(status))} pipeline={null} agencyId="a1" onOpenTrip={() => {}} />);
  }

  it("is at least 12px", () => {
    renderChips(["DRAFT", "IN_REVIEW", "APPROVED_INTERNAL"]);

    for (const label of ["Draft", "In review", "Approved"]) {
      expect(screen.getByText(label).className).toContain("text-[12px]");
      expect(screen.getByText(label).className).not.toContain("text-[11px]");
    }
  });

  it("colours text for 4.5:1 on its tint", () => {
    renderChips(["DRAFT", "IN_REVIEW", "ARCHIVED"]);

    // Amber text on a 12% amber tint is only ~4.3:1, so a draft reads in the body colour.
    expect(chipColor(screen.getByText("Draft"))).toBe("rgb(var(--color-text-rgb))");
    expect(chipColor(screen.getByText("In review"))).toBe("var(--color-secondary-strong)");
    expect(chipColor(screen.getByText("Archived"))).toBe("rgb(var(--color-text-muted-rgb))");
  });
});

describe("HeroContinueCard status chip", () => {
  it("is at least 12px", () => {
    render(<HeroContinueCard trip={trip("IN_REVIEW")} onContinue={() => {}} />);

    const chip = screen.getByText("In review");
    expect(chip.className).toContain("text-[12px]");
    expect(chip.className).not.toContain("text-[0.7rem]");
  });

  it.each([
    ["DRAFT", "Draft", "rgb(var(--color-text-rgb))"],
    ["IN_REVIEW", "In review", "var(--color-secondary-strong)"],
    ["APPROVED_INTERNAL", "Approved", "var(--success)"],
    ["ARCHIVED", "Archived", "rgb(var(--color-text-muted-rgb))"],
  ])("colours %s text for 4.5:1 on its tint", (status, label, color) => {
    render(<HeroContinueCard trip={trip(status)} onContinue={() => {}} />);

    expect(chipColor(screen.getByText(label))).toBe(color);
  });
});
