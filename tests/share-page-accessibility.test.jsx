import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  fetchPublicItinerary: vi.fn(),
  listPublicComments: vi.fn(async () => ({ comments: [] })),
  postPublicComment: vi.fn(),
  fetchSharedItineraryWeather: vi.fn(async () => ({ weather: { provider: null, attribution: null, days: [] } })),
}));

vi.mock("../app/lib/api/index.js", () => api);
// components/icons/index.js contains JSX in a .js file, which vitest cannot parse.
vi.mock("../app/components/icons/index.js", () => {
  const Icon = () => null;
  return {
    PlaneIcon: Icon, HotelIcon: Icon, ForkKnifeIcon: Icon, CarIcon: Icon, MapPinIcon: Icon, ChatIcon: Icon,
    UserIcon: Icon, CheckIcon: Icon, CalendarIcon: Icon, UsersIcon: Icon, ListIcon: Icon, MapIcon: Icon, CloseIcon: Icon,
  };
});
vi.mock("../app/components/theme/ThemeToggle", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({ useParams: () => ({ token: "share-token-12" }) }));
vi.mock("next/dynamic", () => ({ default: () => function DynamicStub() { return null; } }));
vi.mock("../app/itinerary/view/[token]/components/ProposalRating.jsx", () => ({ default: () => null }));
vi.mock("../app/lib/pdfExport.js", () => ({ generateItineraryPdf: vi.fn(), titleToFilename: vi.fn((s) => s) }));

import PublicItineraryPage from "../app/itinerary/view/[token]/page.jsx";

beforeEach(() => {
  localStorage.setItem("voyage_commenter_name", "Tester");
  api.fetchPublicItinerary.mockResolvedValue({
    share: { token: "share-token-12", clientName: "Garcia", expiresAt: null },
    brand: { type: "agency", name: "Voyage Travel", logoUrl: null },
    trip: { id: "trip-1", title: "Baguio Weekend", clientName: "Garcia", startDate: null, endDate: null, travelerCount: 2, destinationSummary: "Baguio City" },
    itinerary: {
      id: "iter-1",
      title: "Baguio Weekend",
      summary: null,
      version: 1,
      days: [
        {
          id: "day-1",
          dayNumber: 1,
          date: null,
          title: "Arrival",
          summary: null,
          items: [
            {
              id: "item-1",
              sortOrder: 0,
              type: "ACTIVITY",
              title: "Burnham Park",
              description: null,
              startTime: "09:00",
              endTime: "10:00",
              clientNotes: null,
              placeSnapshot: {
                id: "snap-1",
                provider: "GOOGLE_MAPS",
                providerPlaceId: "g-1",
                name: "Burnham Park",
                formattedAddress: "Baguio City",
                latitude: 16.41,
                longitude: 120.59,
                rating: 4.5,
                websiteUrl: null,
                phoneNumber: null,
                metadata: {
                  accessibility: { wheelchairAccessibleEntrance: true, source: "GOOGLE_PLACES", checkedAt: "2026-10-01T00:00:00.000Z" },
                },
                businessStatus: null,
                businessStatusCheckedAt: null,
              },
            },
          ],
        },
      ],
    },
    creator: { id: "user-1", displayName: "Agent" },
  });
});

describe("public share accessibility", () => {
  it("shows the place's accessibility (public data) and never the traveler's needs", async () => {
    render(<PublicItineraryPage />);

    expect(await screen.findByText("Accessible entrance")).toBeInTheDocument();
    expect(screen.queryByText(/Wheelchair user/)).toBeNull();
  });
});
