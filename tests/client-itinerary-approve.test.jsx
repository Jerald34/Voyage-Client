import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

// API module — approveClientTrip is the function under test
const approveClientTripMock = vi.fn().mockResolvedValue({ trip: { status: "APPROVED_INTERNAL" } });

vi.mock("../app/lib/api/index.js", () => ({
  approveClientTrip: (...args) => approveClientTripMock(...args),
  fetchItineraryDraft: vi.fn().mockResolvedValue(null),
  getUnreadCommentCount: vi.fn().mockResolvedValue({ count: 0 }),
  getUnreadCommentCountsByTrip: vi.fn().mockResolvedValue({ counts: [] }),
}));

// ── Test data ────────────────────────────────────────────────────────────────

// Trips need isSaved: true + itineraryId to pass getSavedItineraryTrips filter
const inReviewTrip = {
  id: "t1",
  clientName: "Alice",
  approvalStatus: "In review",
  destination: "Tokyo",
  itineraryId: "iter-1",
  isSaved: true,
};

const approvedTrip = {
  id: "t2",
  clientName: "Alice",
  approvalStatus: "Approved",
  destination: "Lisbon",
  itineraryId: "iter-2",
  isSaved: true,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Approve button on ClientItineraryPage", () => {
  it("renders Approve only for In review trips and calls the API", async () => {
    const onTripStatusChange = vi.fn();

    render(
      <ClientItineraryPage
        agencyTrips={[inReviewTrip, approvedTrip]}
        agencyId="agency-1"
        onTripStatusChange={onTripStatusChange}
      />
    );

    // The component auto-selects the first client. With isSaved trips, "Alice"
    // should be rendered and the first trip (t1, "In review") selected.
    // Look for the Approve button.
    const buttons = await screen.findAllByRole("button", { name: /^approve$/i });
    expect(buttons).toHaveLength(1);

    fireEvent.click(buttons[0]);
    await waitFor(() => expect(onTripStatusChange).toHaveBeenCalledWith("t1", "Approved"));
    expect(approveClientTripMock).toHaveBeenCalledWith("agency-1", "t1");
  });
});
