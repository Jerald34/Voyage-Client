// tests/landing-sample-section.test.jsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("../app/components/icons/index.js", async () => (await import("./helpers/iconsMock.js")).default);
vi.mock("../app/components/landing/LazySampleTripMap.jsx", () => ({
  default: ({ activeDay }) => <div data-testid="map" data-active-day={activeDay} />,
}));

import SampleTripSection from "../app/components/landing/SampleTripSection.jsx";

describe("SampleTripSection", () => {
  it("is the #sample-trip anchor with a sans h2", () => {
    const { container } = render(<SampleTripSection />);

    expect(container.querySelector("section#sample-trip")).not.toBeNull();
    const h2 = screen.getByRole("heading", { level: 2, name: "A real trip, planned by Voyage" });
    expect(h2.className).toContain("font-sans");
  });

  it("shows day 2's real forecast summary, full stop cards, five callouts and the map", () => {
    render(<SampleTripSection />);

    // The day header's WeatherChip also carries the forecast as sr-only text, so scope to the summary.
    const summary = within(screen.getByRole("region", { name: "Day weather" }));
    expect(summary.getByText(/Forecast: Afternoon rain, 1–2 PM/)).toBeInTheDocument();
    expect(summary.getByText("Put outdoor stops before 11 AM.")).toBeInTheDocument();
    expect(screen.getByText("Enjoy panoramic views of the Cordillera mountains.")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "What this sample shows" })).getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByTestId("map")).toHaveAttribute("data-active-day", "2");
  });

  it("switches the cards and the map to day 1", () => {
    render(<SampleTripSection />);

    fireEvent.click(screen.getByRole("radio", { name: "Day 1" }));
    expect(screen.getByText("Baguio Botanical Garden", { selector: "h3" })).toBeInTheDocument();
    expect(screen.queryByText(/Forecast:/)).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Day weather" })).not.toBeInTheDocument();
    expect(screen.getByTestId("map")).toHaveAttribute("data-active-day", "1");
  });
});
