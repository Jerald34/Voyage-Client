import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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

// The page switches to its phone layout when this hook says so; tests flip it.
const viewport = vi.hoisted(() => ({ isMobile: false }));
vi.mock("../app/components/trip-dashboard/mobile/useMobileViewport.js", () => ({
  default: () => viewport.isMobile,
}));

// API module. The agency-wide count (9) is deliberately different from every
// per-trip count, so a badge showing 9 is the agency total leaking into a trip.
vi.mock("../app/lib/api/index.js", () => ({
  approveClientTrip: vi.fn(),
  fetchItineraryDraft: vi.fn().mockResolvedValue(null),
  getUnreadCommentCount: vi.fn().mockResolvedValue({ count: 9 }),
  getUnreadCommentCountsByTrip: vi.fn().mockResolvedValue({ counts: [{ tripId: "t1", count: 2 }, { tripId: "t2", count: 7 }] }),
  fetchItineraryWeather: vi.fn().mockResolvedValue({ weather: { provider: null, attribution: null, days: [] } }),
}));

// ── Test data ────────────────────────────────────────────────────────────────

// Trips need isSaved: true + itineraryId to pass getSavedItineraryTrips filter
const trip = { id: "t1", clientName: "Alice", approvalStatus: "In review", destination: "Tokyo", itineraryId: "iter-1", isSaved: true };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ClientItineraryPage comment badge", () => {
  it("counts only the open trip's unread comments, not the whole agency's", async () => {
    viewport.isMobile = false;
    render(<ClientItineraryPage agencyTrips={[trip]} agencyId="agency-1" />);
    await waitFor(() => {
      const buttons = screen.getAllByRole("button", { name: /^Comments(, \d+ unread)?$/ });
      expect(buttons.some((button) => within(button).queryByText("2"))).toBe(true);
    });
    for (const button of screen.getAllByRole("button", { name: /^Comments(, \d+ unread)?$/ })) {
      expect(within(button).queryByText("9")).toBeNull();
    }
  });

  it("shows the open trip's count on the phone's icon-only Comments button, and announces it", async () => {
    viewport.isMobile = true;
    try {
      render(<ClientItineraryPage agencyTrips={[trip]} agencyId="agency-1" />);
      // On a phone the page starts on the client list; open Alice to reach the trip header.
      fireEvent.click(await screen.findByText("Alice"));

      const button = await screen.findByRole("button", { name: "Comments, 2 unread" });
      const badge = within(button).getByText("2");
      // The count is already in the button's name, so the visual badge is hidden from screen readers.
      expect(badge.getAttribute("aria-hidden")).toBe("true");
      expect(screen.queryByRole("button", { name: /9 unread/ })).toBeNull();
    } finally {
      viewport.isMobile = false;
    }
  });
});
