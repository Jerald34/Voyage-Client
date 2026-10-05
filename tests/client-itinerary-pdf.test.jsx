import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

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

vi.mock("../app/lib/api/index.js", () => api);
vi.mock("../app/lib/pdfDelivery.js", () => delivery);
vi.mock("../app/lib/pdfExport.js", () => ({
  generateItineraryPdf: vi.fn(async () => ({ output: () => new Blob(["%PDF-1.7"], { type: "application/pdf" }) })),
  titleToFilename: vi.fn((title) => `${title}.pdf`),
}));
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
  formatDayCardDate: () => "Oct 10, 2026 - Oct 11, 2026",
  getItemTimeLabel: () => "",
  getSavedStatusClass: () => "approved",
}));

import ClientItineraryPage from "../app/components/trip-dashboard/pages/ClientItineraryPage.jsx";

const trip = { id: "t1", clientName: "Garcia", approvalStatus: "Approved", destination: "Baguio", itineraryId: "iter-1", isSaved: true };

describe("dashboard itinerary PDF", () => {
  it("hands the prepared PDF to the device inside the tap", async () => {
    render(<ClientItineraryPage agencyTrips={[trip]} agencyId="agency-1" />);

    // Re-query inside waitFor: the header can re-render while the trip loads.
    await waitFor(() => expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));

    expect(delivery.deliverPdf).toHaveBeenCalledTimes(1);
    const [file, options] = delivery.deliverPdf.mock.calls[0];
    expect(file.name).toBe("Baguio weekend.pdf");
    expect(options).toEqual({ title: "Baguio weekend" });
  });
});
