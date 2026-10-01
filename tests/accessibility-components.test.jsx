import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AccessibilityBadges from "../app/components/accessibility/AccessibilityBadges.jsx";
import TripAccessibilitySummary from "../app/components/accessibility/TripAccessibilitySummary.jsx";

const checked = (flags = {}) => ({
  metadata: { accessibility: { ...flags, source: "GOOGLE_PLACES", checkedAt: "2026-10-01T00:00:00.000Z" } },
});

describe("AccessibilityBadges", () => {
  it("lists known features from a snapshot", () => {
    render(<AccessibilityBadges snapshot={checked({ wheelchairAccessibleEntrance: true, wheelchairAccessibleRestroom: true })} />);

    const list = screen.getByRole("list", { name: "Accessibility" });
    expect(list).toHaveTextContent("Accessible entrance");
    expect(list).toHaveTextContent("Accessible restroom");
  });

  it("accepts precomputed badges and renders nothing for an unchecked place", () => {
    const { rerender, container } = render(
      <AccessibilityBadges badges={[{ key: "unverified", label: "Accessibility not verified", tone: "neutral" }]} />
    );
    expect(screen.getByText("Accessibility not verified")).toBeInTheDocument();

    rerender(<AccessibilityBadges snapshot={{ metadata: {} }} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("TripAccessibilitySummary", () => {
  it("summarizes once any stop was checked", () => {
    render(
      <TripAccessibilitySummary
        days={[{ items: [{ placeSnapshot: checked({ wheelchairAccessibleEntrance: true }) }, { placeSnapshot: { metadata: {} } }] }]}
      />
    );

    expect(screen.getByText(/1 of 2 stops have a wheelchair-accessible entrance · 1 not verified/)).toBeInTheDocument();
  });

  it("stays silent when nothing was checked", () => {
    const { container } = render(<TripAccessibilitySummary days={[{ items: [{ placeSnapshot: { metadata: {} } }] }]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
