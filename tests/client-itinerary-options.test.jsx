import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import ClientItineraryPage from "../app/components/trip-dashboard/pages/ClientItineraryPage.jsx";

// ── Module mocks ─────────────────────────────────────────────────────────────

// Icons use JSX in a .js file — mock them as simple null-returning components
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
  PrinterIcon: () => null,
  UsersIcon: () => null,
  PencilIcon: () => null,
  BookmarkIcon: () => null,
  MapPinIcon: () => null,
  ChevronDownIcon: () => null,
  ChevronRightIcon: () => null,
  CheckCircleIcon: () => null,
  XCircleIcon: () => null,
}));

// UI components that have no bearing on this test
vi.mock("../app/components/ui/index.js", () => ({
  Spinner: () => null,
  EmptyState: ({ title }) => {
    const React = require("react");
    return React.createElement("p", null, title);
  },
  StatusBadge: ({ children }) => {
    const React = require("react");
    return React.createElement("span", null, children);
  },
}));

// next/dynamic is not available in vitest
vi.mock("next/dynamic", () => ({
  default: (_fn, _opts) => {
    return function DynamicStub() { return null; };
  },
}));

// Heavy map component
vi.mock("../app/components/trip-dashboard/itinerary/ItineraryLiveMap.jsx", () => ({
  default: () => null,
}));

// ShareDialog not needed for this test
vi.mock("../app/components/trip-dashboard/itinerary/ShareDialog.jsx", () => ({
  default: () => null,
}));

// CommentsPanel not needed
vi.mock("../app/components/trip-dashboard/pages/CommentsPanel.jsx", () => ({
  default: () => null,
}));

// ItineraryDayView not needed
vi.mock("../app/components/trip-dashboard/pages/ItineraryDayView.jsx", () => ({
  default: () => null,
}));

// MobileGlassSheet not needed
vi.mock("../app/components/trip-dashboard/mobile/MobileGlassSheet.jsx", () => ({
  default: ({ children }) => {
    const React = require("react");
    return React.createElement("div", null, children);
  },
}));

// CompactPlaceCard not needed
vi.mock("../app/components/trip-dashboard/mobile/CompactPlaceCard.jsx", () => ({
  default: () => null,
}));

// PDF export
vi.mock("../app/lib/pdfExport.js", () => ({
  generateItineraryPdf: vi.fn(),
  titleToFilename: vi.fn((s) => s),
}));

// ThemeProvider
vi.mock("../app/components/theme/ThemeProvider.jsx", () => ({
  useTheme: () => ({ theme: "dark" }),
}));

// formatters (only formatDayCardDate used in CIP)
vi.mock("../app/lib/formatters.js", () => ({
  formatDayCardDate: () => "",
  getItemTimeLabel: () => "",
  getSavedStatusClass: () => "approved",
}));

// API module: the page imports approveClientTrip, so the mock must export it
const approveClientTripMock = vi.fn().mockResolvedValue({ trip: { status: "APPROVED_INTERNAL" } });

vi.mock("../app/lib/api/index.js", () => ({
  approveClientTrip: (...args) => approveClientTripMock(...args),
  fetchItineraryDraft: vi.fn().mockResolvedValue(null),
  getUnreadCommentCount: vi.fn().mockResolvedValue({ count: 0 }),
  getUnreadCommentCountsByTrip: vi.fn().mockResolvedValue({ counts: [] }),
  fetchItineraryWeather: vi.fn().mockResolvedValue({ weather: { provider: null, attribution: null, days: [] } }),
}));

// ── Test data ────────────────────────────────────────────────────────────────

// Two Baguio trips are options; Tokyo is a different trip.
const baguioOld = { id: "t1", clientName: "Alice", approvalStatus: "In review", destination: "Baguio City", itineraryId: "iter-1", isSaved: true, createdAt: "2026-10-01T00:00:00Z" };
const baguioNew = { id: "t3", clientName: "Alice", approvalStatus: "In review", destination: "Baguio City", itineraryId: "iter-3", isSaved: true, createdAt: "2026-10-12T02:00:00Z" };
const tokyo = { id: "t2", clientName: "Alice", approvalStatus: "Approved", destination: "Tokyo", itineraryId: "iter-2", isSaved: true, createdAt: "2026-10-05T00:00:00Z" };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Options on ClientItineraryPage", () => {
  it("numbers trips to the same place as options", async () => {
    render(<ClientItineraryPage agencyTrips={[baguioNew, tokyo, baguioOld]} agencyId="agency-1" />);

    expect((await screen.findAllByRole("button", { name: "Option 1 · Baguio City" })).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Option 2 · Baguio City" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Tokyo" }).length).toBeGreaterThan(0);
  });

  it("lists the options side by side, oldest first, with other places after", async () => {
    render(<ClientItineraryPage agencyTrips={[baguioNew, tokyo, baguioOld]} agencyId="agency-1" />);

    // The page renders one tab strip for the narrow layout and one for the wide layout.
    await screen.findAllByRole("button", { name: "Option 1 · Baguio City" });
    const strips = document.querySelectorAll('[data-tour-target="cip-trip-selector"]');
    expect(strips.length).toBeGreaterThan(0);
    for (const strip of strips) {
      const labels = within(strip).getAllByRole("button").map((button) => button.textContent);
      expect(labels).toEqual(["Option 1 · Baguio City", "Option 2 · Baguio City", "Tokyo"]);
    }
  });

  it("copies the selected trip from Another option", async () => {
    const onDuplicateTrip = vi.fn();
    render(<ClientItineraryPage agencyTrips={[baguioNew, tokyo, baguioOld]} agencyId="agency-1" onDuplicateTrip={onDuplicateTrip} />);

    fireEvent.click((await screen.findAllByRole("button", { name: "Option 1 · Baguio City" }))[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Make another option for Alice" })[0]);

    expect(onDuplicateTrip).toHaveBeenCalledWith("t1");
  });

  it("has no Another option when the page can't copy", async () => {
    render(<ClientItineraryPage agencyTrips={[baguioOld]} agencyId="agency-1" />);
    await screen.findAllByText("Alice");
    expect(screen.queryByRole("button", { name: /another option/i })).not.toBeInTheDocument();
  });
});
