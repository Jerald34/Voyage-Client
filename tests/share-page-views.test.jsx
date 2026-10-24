import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  fetchPublicItinerary: vi.fn(),
  recordPublicShareView: vi.fn(),
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
vi.mock("../app/lib/pdfExport.js", () => ({
  generateItineraryPdf: vi.fn(async () => ({ output: () => new Blob([]) })),
  titleToFilename: vi.fn((s) => s),
}));

import PublicItineraryPage from "../app/itinerary/view/[token]/page.jsx";

const VIEWED_KEY = "voyage_share_viewed:share-token-12";
const MINUTE = 60 * 1000;

function payload() {
  return {
    share: { clientName: "Garcia" },
    brand: { type: "agency", name: "Lakbay Travel", logoUrl: null },
    trip: { title: "Baguio Weekend", clientName: "Garcia", startDate: null, endDate: null, travelerCount: 2, destinationSummary: null },
    itinerary: { title: "Baguio Weekend", summary: null, version: 1, days: [] },
    revision: "rev-1",
  };
}

async function openPage() {
  const view = render(<PublicItineraryPage />);
  await screen.findByRole("heading", { level: 1, name: "Baguio Weekend" });
  return view;
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("voyage_commenter_name", "Tester");
  api.recordPublicShareView.mockReset();
  api.recordPublicShareView.mockResolvedValue(undefined);
  api.fetchPublicItinerary.mockResolvedValue(payload());
});

afterEach(() => {
  vi.useRealTimers();
});

describe("share page views", () => {
  it("records one view when the client opens the link", async () => {
    await openPage();
    await waitFor(() => expect(api.recordPublicShareView).toHaveBeenCalledTimes(1));
    expect(api.recordPublicShareView).toHaveBeenCalledWith("share-token-12");
    expect(Number(localStorage.getItem(VIEWED_KEY))).toBeGreaterThan(0);
  });

  it("does not count a reload a few minutes later", async () => {
    const first = await openPage();
    await waitFor(() => expect(api.recordPublicShareView).toHaveBeenCalledTimes(1));
    first.unmount();

    localStorage.setItem(VIEWED_KEY, String(Date.now() - 10 * MINUTE));
    await openPage();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(api.recordPublicShareView).toHaveBeenCalledTimes(1);
  });

  it("counts a fresh visit once 30 minutes have passed", async () => {
    localStorage.setItem(VIEWED_KEY, String(Date.now() - 31 * MINUTE));
    await openPage();
    await waitFor(() => expect(api.recordPublicShareView).toHaveBeenCalledTimes(1));
  });

  it("does not record a view for a link that failed to load", async () => {
    api.fetchPublicItinerary.mockRejectedValue(Object.assign(new Error("gone"), { status: 410 }));
    render(<PublicItineraryPage />);
    await screen.findByRole("heading", { name: "Link Expired" });
    expect(api.recordPublicShareView).not.toHaveBeenCalled();
  });

  it("tries again next time if recording failed", async () => {
    api.recordPublicShareView.mockRejectedValue(new Error("offline"));
    await openPage();
    await waitFor(() => expect(api.recordPublicShareView).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(localStorage.getItem(VIEWED_KEY)).toBeNull();
  });
});
