import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  fetchPublicItinerary: vi.fn(),
  listPublicComments: vi.fn(async () => ({ comments: [] })),
  postPublicComment: vi.fn(),
  fetchSharedItineraryWeather: vi.fn(() => new Promise(() => {})),
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
// The real map needs WebGL. This stand-in lets a test "click a marker" and read the popup data.
vi.mock("next/dynamic", () => ({
  default: () =>
    function MapStub({ onSelectPlace, selectedPlace }) {
      return (
        <div>
          <button type="button" onClick={() => onSelectPlace("place-1-0")}>Select first stop</button>
          <output data-testid="popup-time">{selectedPlace ? selectedPlace.timeLabel : "none"}</output>
        </div>
      );
    },
}));
vi.mock("../app/itinerary/view/[token]/components/ProposalRating.jsx", () => ({ default: () => null }));
vi.mock("../app/lib/pdfExport.js", () => ({
  generateItineraryPdf: vi.fn(async () => ({ output: () => new Blob([]) })),
  titleToFilename: vi.fn((s) => s),
}));

import PublicItineraryPage from "../app/itinerary/view/[token]/page.jsx";

function mockItinerary(item) {
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
          items: [
            {
              id: "item-1",
              type: "ATTRACTION",
              title: "Kiyomizu-dera",
              startTime: null,
              endTime: null,
              placeSnapshot: { name: "Kiyomizu-dera", formattedAddress: "Kyoto", latitude: 34.99, longitude: 135.78 },
              ...item,
            },
          ],
        },
      ],
    },
  });
}

beforeEach(() => {
  localStorage.setItem("voyage_commenter_name", "Tester");
});

describe("share page map popup time", () => {
  it("reads the same as the stop card for a start and end time", async () => {
    mockItinerary({ startTime: "08:00", endTime: "10:00" });
    render(<PublicItineraryPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Select first stop" }));

    expect(screen.getByTestId("popup-time")).toHaveTextContent("8:00 AM – 10:00 AM");
    expect(screen.getByRole("article")).toHaveTextContent("8:00 AM – 10:00 AM");
  });

  it("shows 'Until X' for a stop with only an end time, on the popup as on the card", async () => {
    mockItinerary({ startTime: null, endTime: "17:30" });
    render(<PublicItineraryPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Select first stop" }));

    expect(screen.getByTestId("popup-time")).toHaveTextContent("Until 5:30 PM");
    expect(screen.getByRole("article")).toHaveTextContent("Until 5:30 PM");
  });

  it("is empty for a stop with no times", async () => {
    mockItinerary({ startTime: null, endTime: null });
    render(<PublicItineraryPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Select first stop" }));

    expect(screen.getByTestId("popup-time").textContent).toBe("");
  });
});
