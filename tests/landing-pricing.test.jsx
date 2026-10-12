import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PricingSection from "../app/components/landing/PricingSection.jsx";

describe("PricingSection", () => {
  it("shows three tiers with monthly peso prices, team size and itinerary allowance", () => {
    render(<PricingSection onStartPlanning={vi.fn()} />);

    const section = screen.getByRole("region", { name: "Pricing" });
    const tiers = within(section).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
    expect(tiers).toEqual(["Starter", "Pro", "Agency"]);
    expect(within(section).getByText("₱2,990")).toBeInTheDocument();
    expect(within(section).getByText("₱6,990")).toBeInTheDocument();
    expect(within(section).getByText("₱16,990")).toBeInTheDocument();
    expect(within(section).getByText("Up to 5 team members")).toBeInTheDocument();
    expect(within(section).getByText("40 new itineraries a month")).toBeInTheDocument();
    expect(within(section).getByText(/14-day free trial/)).toBeInTheDocument();
  });

  it("starts every free trial through the normal sign-up", () => {
    const onStartPlanning = vi.fn();
    render(<PricingSection onStartPlanning={onStartPlanning} />);

    for (const button of screen.getAllByRole("button", { name: "Start free trial" })) fireEvent.click(button);
    expect(onStartPlanning).toHaveBeenCalledTimes(3);
  });
});
