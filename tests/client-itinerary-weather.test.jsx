import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

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
vi.mock("../app/lib/pdfExport.js", () => ({ generateItineraryPdf: vi.fn(), titleToFilename: vi.fn((s) => s) }));
vi.mock("../app/components/theme/ThemeProvider.jsx", () => ({ useTheme: () => ({ theme: "light" }) }));
vi.mock("../app/lib/formatters.js", () => ({
  formatDayCardDate: () => "Oct 10, 2026 - Oct 11, 2026",
  getItemTimeLabel: () => "",
  getSavedStatusClass: () => "approved",
}));

import ClientItineraryPage from "../app/components/trip-dashboard/pages/ClientItineraryPage.jsx";

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
});
