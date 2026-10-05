import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({
  fetchPublicItinerary: vi.fn(),
  listPublicComments: vi.fn(async () => ({ comments: [] })),
  postPublicComment: vi.fn(),
  // Never settles: arriving weather would rebuild the PDF mid-test.
  fetchSharedItineraryWeather: vi.fn(() => new Promise(() => {})),
}));
const delivery = vi.hoisted(() => ({ deliverPdf: vi.fn(async () => "downloaded") }));
const pdfExport = vi.hoisted(() => ({
  generateItineraryPdf: vi.fn(async () => ({ output: () => new Blob(["%PDF-1.7"], { type: "application/pdf" }) })),
  titleToFilename: vi.fn((title) => `${title}.pdf`),
}));

vi.mock("../app/lib/api/index.js", () => api);
vi.mock("../app/lib/pdfDelivery.js", () => delivery);
vi.mock("../app/lib/pdfExport.js", () => pdfExport);
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

import PublicItineraryPage from "../app/itinerary/view/[token]/page.jsx";

function share(brand) {
  return {
    share: { token: "share-token-12", clientName: "Garcia", expiresAt: null },
    brand,
    trip: { id: "trip-1", title: "Baguio Weekend", startDate: null, endDate: null, travelerCount: 2, destinationSummary: "Baguio City" },
    itinerary: { id: "iter-1", title: "Baguio Weekend", summary: null, version: 3, days: [] },
    creator: { id: "user-1", displayName: "Agent" },
  };
}

const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;

beforeEach(() => {
  localStorage.setItem("voyage_commenter_name", "Tester");
  api.fetchPublicItinerary.mockResolvedValue(share({ type: "agency", name: "Island Hops Travel", logoUrl: null }));
  delivery.deliverPdf.mockClear();
  pdfExport.generateItineraryPdf.mockClear();
  URL.createObjectURL = vi.fn(() => "blob:fallback");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  // Unmount before restoring: the hook revokes its fallback URL on unmount.
  cleanup();
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
});

const PDF_BUTTON = { name: "Download itinerary as PDF" };

async function readyButton() {
  await waitFor(() => expect(screen.getByRole("button", PDF_BUTTON)).toBeEnabled());
  return screen.getByRole("button", PDF_BUTTON);
}

describe("public share PDF", () => {
  it("hands the prepared PDF to the device inside the tap", async () => {
    render(<PublicItineraryPage />);
    const button = await readyButton();

    fireEvent.click(button);

    // Synchronous: no await between the tap and the hand-off.
    expect(delivery.deliverPdf).toHaveBeenCalledTimes(1);
    expect(delivery.deliverPdf.mock.calls[0][0].name).toBe("Baguio Weekend.pdf");
  });

  it("brands the PDF with the agency shown in the page header", async () => {
    render(<PublicItineraryPage />);
    await readyButton();

    expect(pdfExport.generateItineraryPdf).toHaveBeenCalledWith(expect.objectContaining({ agencyName: "Island Hops Travel" }));
  });

  it("falls back to Voyage branding for personal shares", async () => {
    api.fetchPublicItinerary.mockResolvedValue(share({ type: "personal", displayName: "Ana" }));
    render(<PublicItineraryPage />);
    await readyButton();

    expect(pdfExport.generateItineraryPdf).toHaveBeenCalledWith(expect.objectContaining({ agencyName: "Voyage" }));
  });

  it("offers a tappable link when the device blocks the hand-off", async () => {
    delivery.deliverPdf.mockResolvedValueOnce("failed");
    render(<PublicItineraryPage />);

    fireEvent.click(await readyButton());

    const link = await screen.findByRole("link", { name: "Open the PDF" });
    expect(link).toHaveAttribute("href", "blob:fallback");
    expect(link).toHaveAttribute("target", "_blank");
  });
});
