import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  fetchPublicItinerary: vi.fn(),
  listPublicComments: vi.fn(async () => ({ comments: [] })),
  postPublicComment: vi.fn(),
  fetchSharedItineraryWeather: vi.fn(),
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
    trip: {
      id: "trip-1",
      title: "Baguio Weekend",
      clientName: "Garcia",
      startDate: "2026-10-10T00:00:00.000Z",
      endDate: "2026-10-11T00:00:00.000Z",
      travelerCount: 2,
      destinationSummary: "Baguio City",
    },
    itinerary: {
      id: "iter-1",
      title: "Baguio Weekend",
      summary: null,
      version: 3,
      days: [{ id: "day-1", dayNumber: 1, date: "2026-10-10T00:00:00.000Z", title: "Arrival", summary: null, items: [] }],
    },
    creator: { id: "user-1", displayName: "Agent" },
  });
  api.fetchSharedItineraryWeather.mockResolvedValue({
    weather: {
      provider: "open-meteo",
      attribution: { text: "Weather data by Open-Meteo.com", url: "https://open-meteo.com/" },
      days: [
        {
          dayId: "day-1",
          dayNumber: 1,
          date: "2026-10-10",
          status: "OK",
          weather: { kind: "FORECAST", condition: "CLOUDY", temperatureMinC: 16, temperatureMaxC: 24, precipitationProbabilityPct: 20 },
        },
      ],
    },
  });
});

describe("public share weather", () => {
  it("shows each day's weather and credits Open-Meteo", async () => {
    render(<PublicItineraryPage />);

    expect(await screen.findByText("16–24°C · 20% rain")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Weather data by Open-Meteo.com" })).toBeInTheDocument();
    expect(api.fetchSharedItineraryWeather).toHaveBeenCalledWith("share-token-12");
  });
});
