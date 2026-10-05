import { act, render, screen, waitFor } from "@testing-library/react";
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
vi.mock("../app/lib/pdfExport.js", () => ({
  generateItineraryPdf: vi.fn(async () => ({ output: () => new Blob([]) })),
  titleToFilename: vi.fn((s) => s),
}));

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

  it("keeps the weather chip pill-sized: justify-self-start in the day header's grid, not the vertical-only self-start", async () => {
    render(<PublicItineraryPage />);

    const chip = (await screen.findByText("16–24°C · 20% rain")).closest("span[title]");
    expect(chip.className).toContain("justify-self-start");
    expect(chip.className).not.toMatch(/(^|\s)self-start(\s|$)/);
  });

  it("shows no credit when every entry is past, undated or unlocated", async () => {
    api.fetchSharedItineraryWeather.mockResolvedValue({
      weather: {
        provider: "open-meteo",
        attribution: { text: "Weather data by Open-Meteo.com", url: "https://open-meteo.com/" },
        days: [
          { dayId: "day-1", dayNumber: 1, date: "2026-01-01", status: "PAST", weather: null },
          { dayId: "day-2", dayNumber: 2, date: null, status: "NO_DATE", weather: null },
          { dayId: "day-3", dayNumber: 3, date: "2026-10-12", status: "NO_LOCATION", weather: null },
        ],
      },
    });

    render(<PublicItineraryPage />);

    expect((await screen.findAllByText("Baguio Weekend")).length).toBeGreaterThan(0);
    await waitFor(() => expect(api.fetchSharedItineraryWeather).toHaveBeenCalled());
    expect(screen.queryByRole("link", { name: "Weather data by Open-Meteo.com" })).not.toBeInTheDocument();
  });

  it("stays quiet when the weather request fails: itinerary renders, no chip, no credit", async () => {
    api.fetchSharedItineraryWeather.mockRejectedValue(new Error("weather service down"));

    render(<PublicItineraryPage />);

    expect((await screen.findAllByText("Baguio Weekend")).length).toBeGreaterThan(0);
    await waitFor(() => expect(api.fetchSharedItineraryWeather).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.queryByText(/°C/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Weather data by Open-Meteo.com" })).not.toBeInTheDocument();
  });

  it("tags each timed stop with the weather during it", async () => {
    const base = await api.fetchPublicItinerary();
    api.fetchPublicItinerary.mockResolvedValue({
      ...base,
      itinerary: {
        ...base.itinerary,
        days: [
          {
            ...base.itinerary.days[0],
            items: [
              { id: "item-1", type: "ACTIVITY", title: "Burnham Park", startTime: "14:00", endTime: "16:00", placeSnapshot: null },
            ],
          },
        ],
      },
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
            weather: { kind: "FORECAST", condition: "THUNDERSTORM", temperatureMinC: 16, temperatureMaxC: 24, precipitationProbabilityPct: 99 },
            hourly: {
              firstWetHour: 14,
              wetWindow: { condition: "THUNDERSTORM", fromHour: 14, toHour: 20 },
              stops: [{ itemId: "item-1", outlook: "STORM", maxPrecipitationProbabilityPct: 99 }],
            },
          },
        ],
      },
    });

    render(<PublicItineraryPage />);

    expect(await screen.findByText("Storms likely")).toBeInTheDocument();
    expect(screen.getByText("16–24°C · PM storms")).toBeInTheDocument();
  });
});
