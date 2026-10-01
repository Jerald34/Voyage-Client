import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// components/icons/index.js contains JSX in a .js file, which vitest cannot parse.
vi.mock("../app/components/icons/index.js", () => {
  const Icon = () => null;
  return { BuildingIcon: Icon };
});
vi.mock("next/dynamic", () => ({ default: () => function DynamicStub() { return null; } }));
vi.mock("../app/components/trip-dashboard/pages/CommentsPanel.jsx", () => ({ default: () => null }));

import { buildRichItinerarySections } from "../app/lib/trip-dashboard/richItinerary.js";
import RichItineraryMessage from "../app/components/trip-dashboard/command-center/RichItineraryMessage.jsx";
import CompactPlaceCard from "../app/components/trip-dashboard/mobile/CompactPlaceCard.jsx";
import ItineraryDayView from "../app/components/trip-dashboard/pages/ItineraryDayView.jsx";

const accessibleSnapshot = {
  id: "snap-1",
  name: "Burnham Park",
  formattedAddress: "Baguio City",
  latitude: 16.41,
  longitude: 120.59,
  metadata: {
    accessibility: { wheelchairAccessibleEntrance: true, source: "GOOGLE_PLACES", checkedAt: "2026-10-01T00:00:00.000Z" },
  },
};

const item = { id: "item-1", title: "Burnham Park", startTime: "09:00", endTime: "10:00", placeSnapshotId: "snap-1", placeSnapshot: accessibleSnapshot };
const day = { id: "day-1", dayNumber: 1, title: "Arrival", date: null, items: [item] };
const itinerary = { id: "it-1", title: "Baguio", summary: "", days: [day] };

describe("accessibility on itinerary views", () => {
  it("adds badges to rich itinerary stops", () => {
    const sections = buildRichItinerarySections({ itinerary, placeEntities: [] });

    expect(sections.days[0].stops[0].accessibilityBadges).toEqual([
      { key: "wheelchairAccessibleEntrance", label: "Accessible entrance", tone: "positive" },
    ]);
  });

  it("shows badges and the trip summary on the chat itinerary card", () => {
    render(<RichItineraryMessage itinerary={itinerary} />);

    expect(screen.getByRole("list", { name: "Accessibility" })).toHaveTextContent("Accessible entrance");
    expect(screen.getByText(/1 of 1 stops have a wheelchair-accessible entrance/)).toBeInTheDocument();
  });

  it("shows badges on the mobile place card", () => {
    render(<CompactPlaceCard item={item} />);

    expect(screen.getByText("Accessible entrance")).toBeInTheDocument();
  });

  it("shows badges and a per-day summary in the dashboard day view", () => {
    render(
      <ItineraryDayView
        agencyId="agency-1"
        selectedTripId="trip-1"
        selectedItineraryId="it-1"
        fullItinerary={itinerary}
        safeDays={[day]}
        selectedDay={day}
        selectedDayIndex={0}
        selectedDayMapItems={[]}
        activeStopIndex={-1}
        setActiveStopIndex={vi.fn()}
        tripStart={null}
        isLoadingItinerary={false}
        itineraryError={null}
        showCommentsPanel={false}
        setShowCommentsPanel={vi.fn()}
        theme="light"
      />
    );

    expect(screen.getByText("Accessible entrance")).toBeInTheDocument();
    expect(screen.getByText(/Accessibility this day:/)).toBeInTheDocument();
  });
});
