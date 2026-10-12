import { afterEach, describe, it, expect, vi } from "vitest";
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

// The page draws a wide layout, or a phone layout below 900px (useMobileViewport reads matchMedia).
// jsdom matches no media query, so a test is on the wide layout unless it calls usePhoneLayout().
const originalMatchMedia = window.matchMedia;
afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

function usePhoneLayout() {
  window.matchMedia = (query) => ({
    matches: true,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  });
}

function renderPage(props = {}, { phone = false } = {}) {
  if (phone) usePhoneLayout();
  return render(
    <ClientItineraryPage
      agencyTrips={[baguioNew, tokyo, baguioOld]}
      agencyId="agency-1"
      // On a phone the client's page is the "detail" pane; the list pane comes first.
      {...(phone ? { tourMobilePaneOverride: "detail" } : {})}
      {...props}
    />,
  );
}

describe("Options on ClientItineraryPage", () => {
  it("numbers trips to the same place as options", async () => {
    renderPage();

    expect((await screen.findAllByRole("button", { name: "Option 1 · Baguio City" })).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Option 2 · Baguio City" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Tokyo" }).length).toBeGreaterThan(0);
  });

  it.each([
    ["wide", false],
    ["phone", true],
  ])("lists the options side by side, oldest first, with other places after, on the %s layout", async (_name, phone) => {
    renderPage({}, { phone });

    await screen.findAllByRole("button", { name: "Option 1 · Baguio City" });
    // One layout renders at a time, so there is one tab strip.
    const strips = document.querySelectorAll('[data-tour-target="cip-trip-selector"]');
    expect(strips).toHaveLength(1);
    const labels = within(strips[0]).getAllByRole("button").map((button) => button.textContent);
    expect(labels).toEqual(["Option 1 · Baguio City", "Option 2 · Baguio City", "Tokyo"]);
  });

  it.each([
    ["wide", false],
    ["phone", true],
  ])("marks the selected tab as pressed, starting with the newest trip, on the %s layout", async (_name, phone) => {
    renderPage({}, { phone });

    const strip = (await screen.findAllByRole("button", { name: "Option 2 · Baguio City" }))[0].parentElement;
    const pressed = within(strip).getAllByRole("button").map((button) => [button.textContent, button.getAttribute("aria-pressed")]);
    // Option 2 is the newest Baguio trip (t3), which the page opens by default.
    expect(pressed).toEqual([
      ["Option 1 · Baguio City", "false"],
      ["Option 2 · Baguio City", "true"],
      ["Tokyo", "false"],
    ]);
  });

  it("copies the selected trip from Another option", async () => {
    const onDuplicateTrip = vi.fn();
    renderPage({ onDuplicateTrip });

    fireEvent.click((await screen.findAllByRole("button", { name: "Option 1 · Baguio City" }))[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Make another option for Alice" })[0]);

    expect(onDuplicateTrip).toHaveBeenCalledWith("t1");
  });

  it("copies the newest trip when no tab was chosen", async () => {
    const onDuplicateTrip = vi.fn();
    renderPage({ onDuplicateTrip });

    fireEvent.click(await screen.findByRole("button", { name: "Make another option for Alice" }));

    expect(onDuplicateTrip).toHaveBeenCalledWith("t3");
  });

  it("has no Another option when the page can't copy", async () => {
    renderPage({ agencyTrips: [baguioOld] });
    await screen.findAllByText("Alice");
    expect(screen.queryByRole("button", { name: /another option/i })).not.toBeInTheDocument();
  });

  it("shows the copy in progress and ignores a second press", async () => {
    const onDuplicateTrip = vi.fn();
    renderPage({ onDuplicateTrip, isDuplicatingTrip: true });

    const button = await screen.findByRole("button", { name: "Copying trip for Alice" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);
    expect(onDuplicateTrip).not.toHaveBeenCalled();
  });

  describe("on a phone", () => {
    it("offers Another option beside the client's name, and copies the selected trip", async () => {
      const onDuplicateTrip = vi.fn();
      renderPage({ onDuplicateTrip }, { phone: true });

      const button = await screen.findByRole("button", { name: "Make another option for Alice" });
      expect(button).toHaveTextContent("Another option");
      expect(button.className).toContain("min-h-[40px]");
      expect(button.parentElement).toContainElement(screen.getByRole("heading", { name: "Alice" }));
      fireEvent.click(button);

      expect(onDuplicateTrip).toHaveBeenCalledOnce();
      expect(onDuplicateTrip).toHaveBeenCalledWith("t3");
    });

    it("copies the trip whose tab is open", async () => {
      const onDuplicateTrip = vi.fn();
      renderPage({ onDuplicateTrip }, { phone: true });

      fireEvent.click(await screen.findByRole("button", { name: "Option 1 · Baguio City" }));
      fireEvent.click(screen.getByRole("button", { name: "Make another option for Alice" }));

      expect(onDuplicateTrip).toHaveBeenCalledWith("t1");
    });

    it("has no Another option when the page can't copy", async () => {
      renderPage({}, { phone: true });
      await screen.findAllByRole("button", { name: "Option 1 · Baguio City" });
      expect(screen.queryByRole("button", { name: /another option/i })).not.toBeInTheDocument();
    });

    it("shows the copy in progress and ignores a second press", async () => {
      const onDuplicateTrip = vi.fn();
      renderPage({ onDuplicateTrip, isDuplicatingTrip: true }, { phone: true });

      const button = await screen.findByRole("button", { name: "Copying trip for Alice" });
      expect(button).toHaveTextContent("Copying…");
      expect(button).toHaveAttribute("aria-disabled", "true");
      fireEvent.click(button);
      expect(onDuplicateTrip).not.toHaveBeenCalled();
    });
  });
});
