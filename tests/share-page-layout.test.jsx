import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const api = vi.hoisted(() => ({
  fetchPublicItinerary: vi.fn(),
  listPublicComments: vi.fn(async () => ({ comments: [] })),
  postPublicComment: vi.fn(),
  fetchSharedItineraryWeather: vi.fn(() => new Promise(() => {})),
}));

vi.mock("../app/lib/api/index.js", () => api);
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
    share: { token: "share-token-12" },
    brand: { type: "agency", name: "Island Hops Travel", logoUrl: null },
    trip: { title: "Kyoto Autumn Escape", startDate: null, endDate: null, travelerCount: 2, destinationSummary: "Kyoto, Japan" },
    itinerary: {
      title: "Kyoto Autumn Escape",
      summary: null,
      version: 1,
      days: [
        {
          id: "day-1",
          dayNumber: 1,
          date: null,
          title: "Eastern Higashiyama",
          summary: null,
          items: [{ id: "item-1", type: "ATTRACTION", title: "Kiyomizu-dera", startTime: "08:00", endTime: "10:00", placeSnapshot: null }],
        },
      ],
    },
  });
});

describe("public share layout", () => {
  it("lets the trip title use the column instead of the global 12ch heading cap", async () => {
    render(<PublicItineraryPage />);

    const title = await screen.findByRole("heading", { level: 1, name: "Kyoto Autumn Escape" });
    expect(title.className).toContain("max-w-none");
  });

  it("switches between itinerary and map with the app's segmented control", async () => {
    render(<PublicItineraryPage />);

    const switcher = await screen.findByRole("tablist", { name: "Itinerary view" });
    const mapTab = screen.getByRole("tab", { name: "Map" });
    expect(screen.getByRole("tab", { name: "Itinerary" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(mapTab);

    expect(mapTab).toHaveAttribute("aria-selected", "true");
    expect(switcher).toBeInTheDocument();
  });

  it("shows each stop as an in-app style card with its time", async () => {
    render(<PublicItineraryPage />);

    expect(await screen.findByRole("article")).toHaveTextContent("Kiyomizu-dera");
    expect(screen.getByText("8:00 AM – 10:00 AM")).toBeInTheDocument();
  });

  it("sets day titles in the dashboard's sans, not a serif (Design decision 6)", async () => {
    render(<PublicItineraryPage />);

    const dayTitle = await screen.findByRole("heading", { level: 2, name: "Eastern Higashiyama" });
    expect(dayTitle.className).toContain("font-sans");
    expect(dayTitle.className).toContain("font-semibold");
    expect(dayTitle.className).not.toContain("font-serif");
  });
});
