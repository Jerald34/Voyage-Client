import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({
  approveClientTrip: vi.fn(),
  fetchItineraryDraft: vi.fn(async () => ({
    itinerary: {
      id: "iter-1",
      version: 2,
      title: "Baguio weekend",
      days: [{ id: "day-1", dayNumber: 1, title: "Arrival", date: "2026-10-10", items: [] }],
    },
  })),
  getUnreadCommentCount: vi.fn(async () => ({ count: 0 })),
  getUnreadCommentCountsByTrip: vi.fn(async () => ({ counts: [] })),
  // Never settles: arriving weather would rebuild the PDF mid-test.
  fetchItineraryWeather: vi.fn(() => new Promise(() => {})),
}));
const delivery = vi.hoisted(() => ({ deliverPdf: vi.fn(async () => "downloaded") }));
const pdfExport = vi.hoisted(() => ({
  generateItineraryPdf: vi.fn(async () => ({ output: () => new Blob(["%PDF-1.7"], { type: "application/pdf" }) })),
  titleToFilename: vi.fn((title) => `${title}.pdf`),
}));

vi.mock("../app/lib/api/index.js", () => api);
vi.mock("../app/lib/pdfDelivery.js", () => delivery);
vi.mock("../app/lib/pdfExport.js", () => pdfExport);
vi.mock("../app/components/icons/index.js", () => ({
  SearchIcon: () => null, CloseIcon: () => null, CheckIcon: () => null, ReplyIcon: () => null,
  ArrowLeftIcon: () => null, ArrowRightIcon: () => null, PlusIcon: () => null, TrashIcon: () => null,
  ChatIcon: () => null, ShareIcon: () => null, DownloadIcon: () => null, UsersIcon: () => null,
  PencilIcon: () => null, BookmarkIcon: () => null, MapPinIcon: () => null, ChevronDownIcon: () => null,
  ChevronRightIcon: () => null, CheckCircleIcon: () => null, XCircleIcon: () => null, RefreshIcon: () => null,
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
vi.mock("../app/components/trip-dashboard/pages/ItineraryDayView.jsx", () => ({ default: () => null }));
vi.mock("../app/components/trip-dashboard/mobile/MobileGlassSheet.jsx", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../app/components/trip-dashboard/mobile/CompactPlaceCard.jsx", () => ({ default: () => null }));
vi.mock("../app/components/theme/ThemeProvider.jsx", () => ({ useTheme: () => ({ theme: "light" }) }));
vi.mock("../app/lib/formatters.js", () => ({
  formatDayCardDate: () => "Sat, Oct 10",
  getItemTimeLabel: () => "",
  getSavedStatusClass: () => "approved",
}));

import ClientItineraryPage from "../app/components/trip-dashboard/pages/ClientItineraryPage.jsx";

const trip = { id: "t1", clientName: "Garcia", approvalStatus: "Approved", destination: "Baguio", itineraryId: "iter-1", isSaved: true };

const draftOf = (id, title) => ({
  itinerary: { id, version: 1, title, days: [{ id: `${id}-day-1`, dayNumber: 1, title: "Arrival", date: "2026-10-10", items: [] }] },
});
const defaultDraft = api.fetchItineraryDraft.getMockImplementation();

const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;

describe("dashboard itinerary PDF", () => {
  beforeEach(() => {
    delivery.deliverPdf.mockClear();
    // jsdom has no URL.createObjectURL; the fallback link needs one.
    URL.createObjectURL = vi.fn(() => "blob:fallback");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    // Unmount before restoring: the hook revokes its fallback URL on unmount.
    cleanup();
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    api.fetchItineraryDraft.mockImplementation(defaultDraft);
  });

  it("hands the prepared PDF to the device inside the tap", async () => {
    render(<ClientItineraryPage agencyTrips={[trip]} agencyId="agency-1" />);

    // Re-query inside waitFor: the header can re-render while the trip loads.
    // The PDF builds on a timer after the trip loads, which can pass waitFor's 1s
    // default when the whole suite runs in parallel.
    await waitFor(() => expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled(), { timeout: 5000 });
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));

    expect(delivery.deliverPdf).toHaveBeenCalledTimes(1);
    const [file, options] = delivery.deliverPdf.mock.calls[0];
    expect(file.name).toBe("Baguio weekend.pdf");
    expect(options).toEqual({ title: "Baguio weekend" });
  });

  it("does not claim to be generating a PDF when the itinerary failed to load", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    api.fetchItineraryDraft.mockRejectedValueOnce(new Error("itinerary unavailable"));

    render(<ClientItineraryPage agencyTrips={[trip]} agencyId="agency-1" />);

    await waitFor(() => expect(console.error).toHaveBeenCalledWith(expect.objectContaining({ message: "itinerary unavailable" })), { timeout: 5000 });
    const button = await screen.findByRole("button", { name: "Download PDF" });
    expect(button).toBeDisabled();
    expect(screen.queryByText("Generating...")).not.toBeInTheDocument();
  });

  it("never offers the previous trip's PDF while the next trip's itinerary loads", async () => {
    const second = { ...trip, id: "t2", destination: "Lisbon", itineraryId: "iter-2" };
    let finishSecond;
    api.fetchItineraryDraft.mockImplementation((_agencyId, id) =>
      id === "iter-2" ? new Promise((resolve) => { finishSecond = resolve; }) : Promise.resolve(draftOf("iter-1", "Baguio weekend")),
    );
    render(<ClientItineraryPage agencyTrips={[trip, second]} agencyId="agency-1" />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled(), { timeout: 5000 });
    pdfExport.generateItineraryPdf.mockClear();

    // The header now shows the second trip, but the first trip's itinerary lingers in state until the fetch lands.
    fireEvent.click(screen.getByRole("button", { name: "Lisbon" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Download PDF" })).toBeDisabled());
    expect(pdfExport.generateItineraryPdf).not.toHaveBeenCalled();

    finishSecond(draftOf("iter-2", "Lisbon getaway"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled(), { timeout: 5000 });
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(delivery.deliverPdf.mock.calls[0][0].name).toBe("Lisbon getaway.pdf");
  });

  it("offers a tappable link when the device refuses the hand-off", async () => {
    delivery.deliverPdf.mockResolvedValueOnce("failed");
    render(<ClientItineraryPage agencyTrips={[trip]} agencyId="agency-1" />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled(), { timeout: 5000 });
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));

    const link = await screen.findByRole("link", { name: "Open the PDF" });
    expect(link).toHaveAttribute("href", "blob:fallback");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("disables the PDF button and says so when the PDF could not be built", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    pdfExport.generateItineraryPdf.mockRejectedValueOnce(new Error("pdf unavailable"));

    render(<ClientItineraryPage agencyTrips={[trip]} agencyId="agency-1" />);

    expect(await screen.findByText(/couldn.t build the PDF/, {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeDisabled();
    expect(delivery.deliverPdf).not.toHaveBeenCalled();
  });

  describe("on the mobile layout", () => {
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

    it("offers the same link beside the PDF button when the device refuses the hand-off", async () => {
      useMobileViewport();
      delivery.deliverPdf.mockResolvedValueOnce("failed");
      render(<ClientItineraryPage agencyTrips={[trip]} agencyId="agency-1" tourMobilePaneOverride="detail" />);

      await waitFor(() => expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled(), { timeout: 5000 });
      fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));

      expect(await screen.findByRole("link", { name: "Open the PDF" })).toHaveAttribute("href", "blob:fallback");
    });

    it("disables the PDF button and says so when the PDF could not be built", async () => {
      useMobileViewport();
      vi.spyOn(console, "error").mockImplementation(() => {});
      pdfExport.generateItineraryPdf.mockRejectedValueOnce(new Error("pdf unavailable"));
      render(<ClientItineraryPage agencyTrips={[trip]} agencyId="agency-1" tourMobilePaneOverride="detail" />);

      expect(await screen.findByText(/couldn.t build the PDF/, {}, { timeout: 5000 })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Download PDF" })).toBeDisabled();
    });
  });
});
