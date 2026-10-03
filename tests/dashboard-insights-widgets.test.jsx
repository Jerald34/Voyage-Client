import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FunnelChart, { biggestDrop } from "../app/agency/[agencyId]/components/dashboard/widgets/FunnelChart.jsx";
import RatingsPanel from "../app/agency/[agencyId]/components/dashboard/widgets/RatingsPanel.jsx";

const STAGES = [
  { key: "created", count: 6, dropOffPct: null },
  { key: "drafted", count: 6, dropOffPct: 0 },
  { key: "sent", count: 3, dropOffPct: 50 },
  { key: "viewed", count: 3, dropOffPct: 0 },
  { key: "approved", count: 2, dropOffPct: 33.3 },
];

const review = (id, overrides = {}) => ({
  id,
  rating: 5,
  reviewText: `Review ${id}`,
  respondentName: "Maria Cruz",
  tripTitle: "Bali Honeymoon",
  consentToTestimonial: false,
  submittedAt: "2026-09-30T12:00:00.000Z",
  ...overrides,
});

describe("biggestDrop", () => {
  it("names the stage change that loses the most trips", () => {
    expect(biggestDrop(STAGES)).toBe("Biggest drop: drafted to shared (50%)");
  });

  it("skips a stage it has no name for instead of throwing", () => {
    const unknown = { key: "mystery", count: 1, dropOffPct: 90 };
    expect(biggestDrop([...STAGES.slice(0, 3), unknown])).toBe("Biggest drop: drafted to shared (50%)");
    expect(biggestDrop([STAGES[0], unknown, { key: "sent", count: 1, dropOffPct: 99 }])).toBeNull();
  });

  it("says nothing when no stage loses trips", () => {
    expect(biggestDrop(STAGES.map((stage) => ({ ...stage, dropOffPct: stage.dropOffPct === null ? null : 0 })))).toBeNull();
  });
});

describe("FunnelChart", () => {
  it("summarises trip progress compactly", () => {
    render(<FunnelChart stages={STAGES} agencyId="agency-1" periodLabel="Last 30 days" />);
    const section = screen.getByRole("region", { name: "Trip progress" });

    expect(within(section).getByText("Last 30 days: 6 trips created, 2 approved.")).toBeInTheDocument();
    expect(within(section).getByRole("button", { name: "Shared with client: 3. Open trip list." })).toBeInTheDocument();
    expect(within(section).getByText("Biggest drop: drafted to shared (50%)")).toBeInTheDocument();
  });

  it("still renders a stage it has no name for", () => {
    render(<FunnelChart stages={[...STAGES, { key: "mystery", count: 1, dropOffPct: 50 }]} agencyId="agency-1" />);
    expect(screen.getByRole("button", { name: "mystery: 1. Open trip list." })).toBeInTheDocument();
  });

  it("renders nothing without stages", () => {
    const { container } = render(<FunnelChart stages={[]} agencyId="agency-1" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("RatingsPanel", () => {
  it("shows the two latest reviews and the rest on request", () => {
    render(<RatingsPanel reviews={[review("a"), review("b"), review("c")]} />);
    const section = screen.getByRole("region", { name: "Latest reviews" });

    expect(within(section).getByText("Review a")).toBeInTheDocument();
    expect(within(section).queryByText("Review c")).not.toBeInTheDocument();

    fireEvent.click(within(section).getByRole("button", { name: "All reviews (3)" }));
    expect(within(section).getByText("Review c")).toBeInTheDocument();
  });

  it("keeps a rating outside 0 to 5 within five stars", () => {
    render(<RatingsPanel reviews={[review("high", { rating: 7 }), review("low", { rating: -2 })]} />);
    expect(screen.getByText("5 out of 5 stars")).toBeInTheDocument();
    expect(screen.getByText("0 out of 5 stars")).toBeInTheDocument();
  });

  it("explains when reviews will appear", () => {
    render(<RatingsPanel reviews={[]} />);
    expect(screen.getByText("Reviews appear after trips complete.")).toBeInTheDocument();
  });

  it("uses the compact empty state in the narrow Insights column", () => {
    render(<RatingsPanel reviews={[]} />);
    const heading = screen.getByText("Reviews appear after trips complete.");
    expect(heading.className).toContain("font-sans");
    expect(heading.className).not.toContain("font-extrabold");
  });
});
