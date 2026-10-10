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

    // The summary box carries the forecast; the day header shows no chip, so each line appears once.
    expect(screen.getByRole("region", { name: "Day weather" })).toBeInTheDocument();
    expect(screen.getByText(/Forecast: Afternoon rain, 1–2 PM/)).toBeInTheDocument();
    expect(screen.getByText("Put outdoor stops before 11 AM.")).toBeInTheDocument();
    expect(screen.queryByText("16–26°C · PM rain")).not.toBeInTheDocument();
    expect(screen.getByText("Enjoy panoramic views of the Cordillera mountains.")).toBeInTheDocument();
    const callouts = screen.getByRole("list", { name: "What this sample shows" });
    expect(callouts).toHaveAttribute("role", "list");
    expect(within(callouts).getAllByRole("listitem")).toHaveLength(5);
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

  it("explains why day 1 has no forecast, and says nothing of the kind on day 2", () => {
    render(<SampleTripSection />);
    const note = "This day had passed when the sample was saved, so it has no forecast.";

    expect(screen.queryByText(note)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Day 1" }));
    const line = screen.getByText(note);
    expect(line.tagName).toBe("P");
    expect(line.className).toContain("text-text-muted");
    fireEvent.click(screen.getByRole("radio", { name: "Day 2" }));
    expect(screen.queryByText(note)).not.toBeInTheDocument();
  });
});
