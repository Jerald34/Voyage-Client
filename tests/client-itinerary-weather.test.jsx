import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({
  approveClientTrip: vi.fn(),
  fetchItineraryDraft: vi.fn(),
  getUnreadCommentCount: vi.fn(async () => ({ count: 0 })),
  getUnreadCommentCountsByTrip: vi.fn(async () => ({ counts: [] })),
  fetchItineraryWeather: vi.fn(),
}));

vi.mock("../app/lib/api/index.js", () => api);
vi.mock("../app/components/icons/index.js", () => ({
  SearchIcon: () => null,
  CloseIcon: () => null,
  CheckIcon: () => null,
  ReplyIcon: () => null,
  ArrowLeftIcon: () => null,
  ArrowRightIcon: () => null,
  PlusIcon: () => null,
  TrashIcon: () => null,
  ChatIcon: () => null,
  ShareIcon: () => null,
  DownloadIcon: () => null,
  UsersIcon: () => null,
  PencilIcon: () => null,
  BookmarkIcon: () => null,
  MapPinIcon: () => null,
  ChevronDownIcon: () => null,
  ChevronRightIcon: () => null,
  CheckCircleIcon: () => null,
  XCircleIcon: () => null,
  RefreshIcon: () => null,
}));
vi.mock("../app/components/ui/index.js", () => ({
  Spinner: () => null,
  EmptyState: ({ title }) => <p>{title}</p>,
  StatusBadge: ({ children }) => <span>{children}</span>,
}));
vi.mock("next/dynamic", () => ({ default: () => function DynamicStub() { return null; } }));
vi.mock("../app/components/trip-dashboard/itinerary/ItineraryLiveMap.jsx", () => ({ default: () => null }));
vi.mock("../app/components/trip-dashboard/itinerary/ShareDialog.jsx", () => ({ default: () => null }));
vi.mock("../app/components/trip-dashboard/pages/CommentsPanel.jsx", () => ({ default: () => null }));
vi.mock("../app/components/trip-dashboard/pages/ItineraryDayView.jsx", () => ({
  default: ({ dayWeather }) => <p>{dayWeather ? `day weather ${dayWeather.status}` : "no day weather"}</p>,
}));
vi.mock("../app/components/trip-dashboard/mobile/MobileGlassSheet.jsx", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../app/components/trip-dashboard/mobile/CompactPlaceCard.jsx", () => ({ default: () => null }));
vi.mock("../app/lib/pdfExport.js", () => ({ generateItineraryPdf: vi.fn(async () => ({ output: () => new Blob([]) })), titleToFilename: vi.fn((s) => s) }));
vi.mock("../app/components/theme/ThemeProvider.jsx", () => ({ useTheme: () => ({ theme: "light" }) }));
vi.mock("../app/lib/formatters.js", () => ({
  formatDayCardDate: () => "Sat, Oct 10",
  getItemTimeLabel: () => "",
  getSavedStatusClass: () => "approved",
}));

import ClientItineraryPage from "../app/components/trip-dashboard/pages/ClientItineraryPage.jsx";

const CREDIT = "Weather data by Open-Meteo.com";
const ATTRIBUTION = { text: CREDIT, url: "https://open-meteo.com/" };

function okDay(dayId, dayNumber) {
  return {
    dayId,
    dayNumber,
    date: "2026-10-10",
    status: "OK",
    weather: { kind: "FORECAST", condition: "RAIN", temperatureMinC: 16.2, temperatureMaxC: 23.4, precipitationProbabilityPct: 85 },
  };
}

function mockItinerary(days, weatherDays) {
  api.fetchItineraryDraft.mockResolvedValue({
    itinerary: {
      id: "iter-1",
      version: 2,
      title: "Baguio weekend",
      days: days.map((id, i) => ({ id, dayNumber: i + 1, title: `Day title ${i + 1}`, date: "2026-10-10", items: [] })),
    },
  });
  api.fetchItineraryWeather.mockResolvedValue({
    weather: { provider: "open-meteo", attribution: ATTRIBUTION, days: weatherDays },
  });
}

const trip = { id: "t1", clientName: "Garcia", approvalStatus: "Approved", destination: "Baguio", itineraryId: "iter-1", isSaved: true };

describe("dashboard weather", () => {
  it("shows a weather chip per day and hands the selected day's entry to the day view", async () => {
    api.fetchItineraryDraft.mockResolvedValue({
      itinerary: {
        id: "iter-1",
        version: 2,
        title: "Baguio weekend",
        days: [{ id: "day-1", dayNumber: 1, title: "Arrival", date: "2026-10-10", items: [] }],
      },
    });
    api.fetchItineraryWeather.mockResolvedValue({
      weather: {
        provider: "open-meteo",
        attribution: { text: "Weather data by Open-Meteo.com", url: "https://open-meteo.com/" },
        days: [
          {
            dayId: "day-1",
            dayNumber: 1,
            date: "2026-10-10",
            status: "OK",
            weather: { kind: "FORECAST", condition: "RAIN", temperatureMinC: 16.2, temperatureMaxC: 23.4, precipitationProbabilityPct: 85 },
          },
        ],
      },
    });

    render(<ClientItineraryPage agencyTrips={[trip]} agencyId="agency-1" />);

    expect(await screen.findByText("16–23°C · 85% rain")).toBeInTheDocument();
    expect(await screen.findByText("day weather OK")).toBeInTheDocument();
    expect(api.fetchItineraryWeather).toHaveBeenCalledWith("agency-1", "iter-1");
  });

  it("never asks for weather on the tutorial itinerary", async () => {
    api.fetchItineraryDraft.mockClear();
    api.fetchItineraryWeather.mockClear();

    render(<ClientItineraryPage agencyTrips={[{ ...trip, itineraryId: "__tutorial_itinerary_1" }]} agencyId="agency-1" />);

    await screen.findAllByText("Garcia");
    await waitFor(() => expect(api.fetchItineraryDraft).not.toHaveBeenCalled());
    expect(api.fetchItineraryWeather).not.toHaveBeenCalled();
  });

  describe("Open-Meteo credit", () => {
    const originalMatchMedia = window.matchMedia;
    afterEach(() => {
      window.matchMedia = originalMatchMedia;
    });

    function useMobileViewport() {
      window.matchMedia = (query) => ({
        matches: true,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
      });
    }

    it("shows the day summary and exactly one credit on the mobile layout", async () => {
      useMobileViewport();
      mockItinerary(["day-1"], [okDay("day-1", 1)]);

      render(<ClientItineraryPage agencyTrips={[trip]} agencyId="agency-1" tourMobilePaneOverride="detail" />);

      expect(await screen.findByLabelText("Day weather")).toBeInTheDocument();
      const credits = await screen.findAllByRole("link", { name: CREDIT });
      expect(credits).toHaveLength(1);
      expect(credits[0]).toHaveAttribute("href", "https://open-meteo.com/");
    });

    it("credits Open-Meteo on mobile when only an unselected day has weather", async () => {
      useMobileViewport();
      mockItinerary(["day-1", "day-2"], [okDay("day-2", 2)]);

      render(<ClientItineraryPage agencyTrips={[trip]} agencyId="agency-1" tourMobilePaneOverride="detail" />);

      expect(await screen.findAllByRole("link", { name: CREDIT })).toHaveLength(1);
      expect(screen.queryByLabelText("Day weather")).not.toBeInTheDocument();
    });

    it("credits Open-Meteo on desktop when only an unselected day has weather", async () => {
      mockItinerary(["day-1", "day-2"], [okDay("day-2", 2)]);

      render(<ClientItineraryPage agencyTrips={[trip]} agencyId="agency-1" />);

      expect(await screen.findByText("16–23°C · 85% rain")).toBeInTheDocument();
      expect(screen.getAllByRole("link", { name: CREDIT })).toHaveLength(1);
    });

    it("shows no credit when no day has displayable weather", async () => {
      mockItinerary(
        ["day-1", "day-2"],
        [
          { dayId: "day-1", dayNumber: 1, date: "2026-01-01", status: "PAST", weather: null },
          { dayId: "day-2", dayNumber: 2, date: null, status: "NO_DATE", weather: null },
        ],
      );

      render(<ClientItineraryPage agencyTrips={[trip]} agencyId="agency-1" />);

      await waitFor(() => expect(api.fetchItineraryWeather).toHaveBeenCalled());
      await screen.findByText("day weather PAST");
      expect(screen.queryByRole("link", { name: CREDIT })).not.toBeInTheDocument();
    });

    it("fetches weather once per itinerary load, not before the itinerary is loaded", async () => {
      api.fetchItineraryWeather.mockClear();
      mockItinerary(["day-1"], [okDay("day-1", 1)]);

      render(<ClientItineraryPage agencyTrips={[trip]} agencyId="agency-1" />);

      await screen.findByText("16–23°C · 85% rain");
      expect(api.fetchItineraryWeather).toHaveBeenCalledTimes(1);
    });

  it("fetches weather once per itinerary when switching between trips", async () => {
    api.fetchItineraryWeather.mockClear();
    const versions = { "iter-1": 2, "iter-2": 7 };
    api.fetchItineraryDraft.mockImplementation(async (_agencyId, id) => ({
      itinerary: { id, version: versions[id], title: id, days: [{ id: `${id}-day-1`, dayNumber: 1, title: "Arrival", date: "2026-10-10", items: [] }] },
    }));
    api.fetchItineraryWeather.mockResolvedValue({ weather: { provider: "open-meteo", attribution: ATTRIBUTION, days: [] } });
    const trips = [
      { ...trip, id: "t1", destination: "Baguio", itineraryId: "iter-1" },
      { ...trip, id: "t2", destination: "Cebu", itineraryId: "iter-2" },
    ];

    render(<ClientItineraryPage agencyTrips={trips} agencyId="agency-1" />);
    await waitFor(() => expect(api.fetchItineraryWeather).toHaveBeenCalledWith("agency-1", "iter-1"));

    fireEvent.click(screen.getAllByRole("button", { name: "Cebu" })[0]);
    await waitFor(() => expect(api.fetchItineraryWeather).toHaveBeenCalledWith("agency-1", "iter-2"));
    // Let the second itinerary finish loading; its version change must not trigger another request.
    await waitFor(() => expect(api.fetchItineraryDraft).toHaveBeenCalledWith("agency-1", "iter-2"));
    await new Promise((resolve) => setTimeout(resolve, 50));

    const requested = api.fetchItineraryWeather.mock.calls.map(([, id]) => id);
    expect(requested.filter((id) => id === "iter-1")).toHaveLength(1);
    expect(requested.filter((id) => id === "iter-2")).toHaveLength(1);
  });
  });
});
