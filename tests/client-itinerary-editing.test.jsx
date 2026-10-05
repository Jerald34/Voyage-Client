import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const api = vi.hoisted(() => ({
  approveClientTrip: vi.fn(),
  fetchItineraryDraft: vi.fn(),
  getUnreadCommentCount: vi.fn(async () => ({ count: 0 })),
  getUnreadCommentCountsByTrip: vi.fn(async () => ({ counts: [] })),
  fetchItineraryWeather: vi.fn(async () => ({ weather: { provider: null, attribution: null, days: [] } })),
}));
const editApi = vi.hoisted(() => ({
  reopenClientTrip: vi.fn(),
  addItineraryStop: vi.fn(),
  updateItineraryStop: vi.fn(),
  deleteItineraryStop: vi.fn(),
  moveItineraryStop: vi.fn(),
  renameItineraryDay: vi.fn(),
}));
// The day view is stubbed; what the page hands it is what this test checks.
const dayView = vi.hoisted(() => ({ props: null }));

vi.mock("../app/lib/api/index.js", () => api);
vi.mock("../app/lib/api/itineraryEditing.js", () => editApi);
vi.mock("../app/components/icons/index.js", () => {
  const Icon = () => null;
  const isIcon = (name) => typeof name === "string" && name !== "then";
  return new Proxy(
    { __esModule: true },
    {
      get: (target, name) => (name in target ? target[name] : isIcon(name) ? Icon : undefined),
      has: (target, name) => name in target || isIcon(name),
    },
  );
});
vi.mock("../app/components/ui/index.js", () => ({
  Spinner: () => null,
  EmptyState: ({ title }) => <p>{title}</p>,
  StatusBadge: ({ children }) => <span>{children}</span>,
}));
vi.mock("next/dynamic", () => ({ default: () => function DynamicStub() { return null; } }));
vi.mock("../app/components/trip-dashboard/itinerary/ShareDialog.jsx", () => ({ default: () => null }));
vi.mock("../app/components/trip-dashboard/pages/CommentsPanel.jsx", () => ({ default: () => null }));
vi.mock("../app/components/trip-dashboard/pages/ItineraryDayView.jsx", () => ({
  default: (props) => {
    dayView.props = props;
    return null;
  },
}));
vi.mock("../app/components/trip-dashboard/mobile/MobileGlassSheet.jsx", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../app/components/ratedHistory/entryPoints/ReuseLauncher.jsx", () => ({
  default: () => <span data-testid="reuse-launcher" />,
}));
vi.mock("../app/lib/pdfExport.js", () => ({ generateItineraryPdf: vi.fn(), titleToFilename: vi.fn((s) => s) }));
vi.mock("../app/components/theme/ThemeProvider.jsx", () => ({ useTheme: () => ({ theme: "light" }) }));
vi.mock("../app/lib/formatters.js", () => ({
  formatDayCardDate: () => "",
  getItemTimeLabel: () => "",
  getSavedStatusClass: () => "approved",
}));

import ClientItineraryPage from "../app/components/trip-dashboard/pages/ClientItineraryPage.jsx";

const inReviewTrip = { id: "t1", clientName: "Alice", approvalStatus: "In review", destination: "Tokyo", itineraryId: "iter-1", isSaved: true };
const approvedTrip = { id: "t2", clientName: "Alice", approvalStatus: "Approved", destination: "Lisbon", itineraryId: "iter-2", isSaved: true };

let statuses;

beforeEach(() => {
  vi.clearAllMocks();
  dayView.props = null;
  statuses = { "iter-1": "NEEDS_REVIEW", "iter-2": "APPROVED_INTERNAL" };
  api.fetchItineraryDraft.mockImplementation(async (_agencyId, id) => ({
    itinerary: { id, status: statuses[id], version: 3, days: [{ id: `${id}-day-1`, dayNumber: 1, title: "Arrival", items: [] }] },
  }));
  editApi.reopenClientTrip.mockImplementation(async () => {
    statuses["iter-2"] = "NEEDS_REVIEW";
    return {};
  });
});

describe("hand edits on the Itineraries page", () => {
  it("lets staff edit a trip in review, with Reuse and no Reopen", async () => {
    render(<ClientItineraryPage agencyTrips={[inReviewTrip]} agencyId="agency-1" />);

    await waitFor(() => expect(dayView.props?.editor?.canEdit).toBe(true));
    expect(screen.getByTestId("reuse-launcher")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reopen for edits" })).toBeNull();
  });

  it("locks an approved trip and reopens it after confirmation", async () => {
    const onTripStatusChange = vi.fn();
    const { rerender } = render(
      <ClientItineraryPage agencyTrips={[approvedTrip]} agencyId="agency-1" onTripStatusChange={onTripStatusChange} />,
    );

    await waitFor(() => expect(dayView.props?.fullItinerary?.id).toBe("iter-2"));
    expect(dayView.props.editor.canEdit).toBe(false);
    expect(screen.queryByTestId("reuse-launcher")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Reopen for edits" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/needs approval again/i)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Reopen for edits" }));

    await waitFor(() => expect(editApi.reopenClientTrip).toHaveBeenCalledWith("agency-1", "t2"));
    await waitFor(() => expect(onTripStatusChange).toHaveBeenCalledWith("t2", "In review"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    // The parent (HomePage) relabels the trip; then the page unlocks.
    rerender(
      <ClientItineraryPage agencyTrips={[{ ...approvedTrip, approvalStatus: "In review" }]} agencyId="agency-1" onTripStatusChange={onTripStatusChange} />,
    );
    await waitFor(() => expect(dayView.props?.editor?.canEdit).toBe(true));
  });

  it("relabels the trip as approved when its itinerary was approved elsewhere", async () => {
    statuses["iter-1"] = "APPROVED_INTERNAL";
    const onTripStatusChange = vi.fn();
    render(<ClientItineraryPage agencyTrips={[inReviewTrip]} agencyId="agency-1" onTripStatusChange={onTripStatusChange} />);

    await waitFor(() => expect(onTripStatusChange).toHaveBeenCalledWith("t1", "Approved"));
    expect(dayView.props.editor.canEdit).toBe(false);
  });

  it("relabels the trip as approved after an edit the lock refused", async () => {
    const onTripStatusChange = vi.fn();
    render(<ClientItineraryPage agencyTrips={[inReviewTrip]} agencyId="agency-1" onTripStatusChange={onTripStatusChange} />);
    await waitFor(() => expect(dayView.props?.editor?.canEdit).toBe(true));

    // Another tab approves the trip, then this tab moves a stop.
    statuses["iter-1"] = "APPROVED_INTERNAL";
    editApi.moveItineraryStop.mockRejectedValue(Object.assign(new Error("locked"), { status: 409, code: "ITINERARY_LOCKED" }));
    const day = { id: "iter-1-day-1", items: [{ id: "a" }, { id: "b" }] };
    await dayView.props.editor.moveStopBy(day, 0, 1);

    await waitFor(() => expect(onTripStatusChange).toHaveBeenCalledWith("t1", "Approved"));
  });

  it("keeps the trip locked and says so when reopening fails", async () => {
    editApi.reopenClientTrip.mockRejectedValue(Object.assign(new Error("boom"), { status: 500 }));
    const onTripStatusChange = vi.fn();
    render(<ClientItineraryPage agencyTrips={[approvedTrip]} agencyId="agency-1" onTripStatusChange={onTripStatusChange} />);

    await waitFor(() => expect(dayView.props?.fullItinerary?.id).toBe("iter-2"));
    fireEvent.click(screen.getByRole("button", { name: "Reopen for edits" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Reopen for edits" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Couldn't reopen this trip. Try again.");
    expect(onTripStatusChange).not.toHaveBeenCalled();
    expect(dayView.props.editor.canEdit).toBe(false);
  });
});
