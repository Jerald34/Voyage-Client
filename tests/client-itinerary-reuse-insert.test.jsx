import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

// After a Reuse insert the page takes the server's insert result as the itinerary. That result
// uses `itineraryId` (not `id`) and has no `version`, so unless the page keeps the identity
// fields and reloads the canonical itinerary, the PDF gate (which compares ids), the Reuse
// launcher (which needs a version) and the weather (keyed off the itinerary) all drop out.

const api = vi.hoisted(() => ({
  approveClientTrip: vi.fn(),
  fetchItineraryDraft: vi.fn(),
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
// What the rated-history insert endpoint returns: `itineraryId`, no `id`, no `version`.
const insertResult = vi.hoisted(() => ({
  itineraryId: "iter-1",
  title: "Baguio weekend",
  days: [
    { id: "day-1", dayNumber: 1, title: "Arrival", date: "2026-10-10", items: [] },
    { dayNumber: 2, title: "Reused day", date: "2026-10-11", items: [] },
  ],
}));

vi.mock("../app/lib/api/index.js", () => api);
vi.mock("../app/lib/pdfDelivery.js", () => delivery);
vi.mock("../app/lib/pdfExport.js", () => pdfExport);
// The real header, with the launcher swapped for a stub that reports an insert when pressed. It also
// shows the version it was given, so the test can see which itinerary the page is holding.
vi.mock("../app/components/ratedHistory/entryPoints/ReuseLauncher.jsx", () => ({
  default: ({ currentVersion, onInserted }) => (
    <button type="button" data-version={String(currentVersion)} onClick={() => onInserted(insertResult)}>
      Reuse stub
    </button>
  ),
}));
vi.mock("../app/components/icons/index.js", () => ({
  SearchIcon: () => null, CloseIcon: () => null, CheckIcon: () => null, ReplyIcon: () => null,
  ArrowLeftIcon: () => null, ArrowRightIcon: () => null, PlusIcon: () => null, TrashIcon: () => null,
  ChatIcon: () => null, ShareIcon: () => null, DownloadIcon: () => null, PrinterIcon: () => null, UsersIcon: () => null,
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

// In review: Reuse is hidden on approved trips, which are locked until reopened.
const trip = { id: "t1", clientName: "Garcia", approvalStatus: "In review", destination: "Baguio", itineraryId: "iter-1", isSaved: true };

const draftOf = (id, title, version = 1) => ({
  itinerary: { id, version, title, days: [{ id: `${id}-day-1`, dayNumber: 1, title: "Arrival", date: "2026-10-10", items: [] }] },
});

// Each test waits on the debounced PDF build more than once, which can pass the 5s default under a parallel run.
vi.setConfig({ testTimeout: 20000 });

const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;

const pdfButton = () => screen.getByRole("button", { name: "Download PDF" });
const reuseStub = () => screen.getByRole("button", { name: "Reuse stub" });

// The first load of iter-1 resolves at once; later loads of it wait for the test to settle them.
function loadFirstThenHold() {
  const held = { calls: 0, resolve: null, reject: null };
  api.fetchItineraryDraft.mockImplementation((_agencyId, id) => {
    if (id === "iter-1") {
      held.calls += 1;
      if (held.calls === 1) return Promise.resolve(draftOf("iter-1", "Baguio weekend", 2));
      return new Promise((resolve, reject) => { held.resolve = resolve; held.reject = reject; });
    }
    return Promise.resolve(draftOf(id, "Lisbon getaway", 1));
  });
  return held;
}

describe("dashboard itinerary after a Reuse insert", () => {
  beforeEach(() => {
    api.fetchItineraryDraft.mockReset();
    delivery.deliverPdf.mockClear();
    pdfExport.generateItineraryPdf.mockClear();
    // jsdom has no URL.createObjectURL; the fallback link needs one.
    URL.createObjectURL = vi.fn(() => "blob:fallback");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    // Unmount before restoring: the hook revokes its fallback URL on unmount.
    cleanup();
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    vi.restoreAllMocks();
  });

  async function renderLoaded(trips = [trip]) {
    render(<ClientItineraryPage agencyTrips={trips} agencyId="agency-1" />);
    await waitFor(() => expect(pdfButton()).toBeEnabled(), { timeout: 5000 });
    expect(reuseStub()).toHaveAttribute("data-version", "2");
    pdfExport.generateItineraryPdf.mockClear();
  }

  it("keeps the PDF and the Reuse launcher working while the reload is still in flight", async () => {
    loadFirstThenHold();
    await renderLoaded();

    fireEvent.click(reuseStub());

    // The inserted days show at once, so the PDF is built from them rather than left disabled.
    await waitFor(() => expect(pdfExport.generateItineraryPdf).toHaveBeenCalled(), { timeout: 5000 });
    expect(pdfExport.generateItineraryPdf.mock.calls.at(-1)[0].days).toHaveLength(2);
    await waitFor(() => expect(pdfButton()).toBeEnabled(), { timeout: 5000 });
    expect(reuseStub()).toHaveAttribute("data-version", "2");
  });

  it("reloads the itinerary so the id, version and day ids come back", async () => {
    const held = loadFirstThenHold();
    await renderLoaded();
    api.fetchItineraryDraft.mockClear();

    fireEvent.click(reuseStub());

    await waitFor(() => expect(api.fetchItineraryDraft).toHaveBeenCalledWith("agency-1", "iter-1"));
    await act(async () => {
      held.resolve(draftOf("iter-1", "Baguio weekend, reused", 3));
    });

    await waitFor(() => expect(reuseStub()).toHaveAttribute("data-version", "3"));
    await waitFor(() => expect(pdfButton()).toBeEnabled(), { timeout: 5000 });
    fireEvent.click(pdfButton());
    expect(delivery.deliverPdf.mock.calls.at(-1)[0].name).toBe("Baguio weekend, reused.pdf");
  });

  it("keeps the inserted itinerary and logs the error when the reload fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const held = loadFirstThenHold();
    await renderLoaded();
    api.fetchItineraryDraft.mockClear();

    fireEvent.click(reuseStub());
    await waitFor(() => expect(api.fetchItineraryDraft).toHaveBeenCalledWith("agency-1", "iter-1"));
    await act(async () => {
      held.reject(new Error("reload unavailable"));
    });

    await waitFor(() => expect(consoleError).toHaveBeenCalledWith(expect.objectContaining({ message: "reload unavailable" })));
    await waitFor(() => expect(pdfButton()).toBeEnabled(), { timeout: 5000 });
    expect(reuseStub()).toHaveAttribute("data-version", "2");
  });

  it("drops a reload that lands after the planner has moved to another trip", async () => {
    const second = { ...trip, id: "t2", destination: "Lisbon", itineraryId: "iter-2" };
    const held = loadFirstThenHold();
    await renderLoaded([trip, second]);
    api.fetchItineraryDraft.mockClear();

    fireEvent.click(reuseStub());
    await waitFor(() => expect(api.fetchItineraryDraft).toHaveBeenCalledWith("agency-1", "iter-1"));

    fireEvent.click(screen.getByRole("button", { name: "Lisbon" }));
    await waitFor(() => expect(api.fetchItineraryDraft).toHaveBeenCalledWith("agency-1", "iter-2"));
    await waitFor(() => expect(reuseStub()).toHaveAttribute("data-version", "1"));
    await waitFor(() => expect(pdfButton()).toBeEnabled(), { timeout: 5000 });

    // The first trip's reload finally lands. If it were applied, the page would hold trip 1's
    // itinerary under trip 2's header and the PDF would go back to disabled.
    await act(async () => {
      held.resolve(draftOf("iter-1", "Baguio weekend, reused", 3));
    });

    expect(reuseStub()).toHaveAttribute("data-version", "1");
    expect(pdfButton()).toBeEnabled();
    fireEvent.click(pdfButton());
    expect(delivery.deliverPdf.mock.calls.at(-1)[0].name).toBe("Lisbon getaway.pdf");
  });
});
