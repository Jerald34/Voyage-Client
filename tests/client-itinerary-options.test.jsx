import { afterEach, describe, it, expect, vi } from "vitest";
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

describe("Delete client on ClientItineraryPage", () => {
  it("tells every delete which trips are going, so the Planner isn't moved onto the next one", async () => {
    const onDeleteTrip = vi.fn().mockResolvedValue(undefined);
    renderPage({ onDeleteTrip });

    fireEvent.click(await screen.findByTitle("Delete client record"));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(onDeleteTrip).toHaveBeenCalledTimes(3));
    expect(onDeleteTrip.mock.calls.map(([, tripId]) => tripId)).toEqual(["t3", "t2", "t1"]);
    for (const [agencyId, , options] of onDeleteTrip.mock.calls) {
      expect(agencyId).toBe("agency-1");
      expect(options).toEqual({ alsoDeleting: ["t3", "t2", "t1"] });
    }
  });
});

// "Remove option" takes back an unpicked option through the page's own delete, after a question.
describe("Remove option on ClientItineraryPage", () => {
  const removeButton = (name = /^Remove /) => screen.queryByRole("button", { name });
  const openDialog = async () => {
    fireEvent.click(await screen.findByRole("button", { name: "Remove Option 2 · Baguio City" }));
    return screen.findByRole("dialog");
  };

  describe.each([
    ["wide", false, "min-h-[28px]"],
    ["phone", true, "min-h-[40px]"],
  ])("on the %s layout", (_name, phone, minHeight) => {
    it("is offered for an unapproved option of a client with other trips, named for its tab", async () => {
      renderPage({ onDeleteTrip: vi.fn() }, { phone });

      const button = await screen.findByRole("button", { name: "Remove Option 2 · Baguio City" });
      expect(button).toHaveTextContent("Remove option");
      // Same size as the Another option control beside it, but calmer: muted until hovered or focused.
      expect(button.className).toContain(minHeight);
      expect(button.className).toContain("text-text-muted");
      expect(button.className).toContain("hover:text-status-danger");
      expect(button.className).toContain("focus-visible:text-status-danger");
      expect(button.className).not.toContain("text-secondary-strong");
      // It follows the open tab.
      fireEvent.click(screen.getAllByRole("button", { name: "Option 1 · Baguio City" })[0]);
      expect(await screen.findByRole("button", { name: "Remove Option 1 · Baguio City" })).toBeInTheDocument();
      expect(removeButton("Remove Option 2 · Baguio City")).toBeNull();
    });

    it("sits beside Another option, not apart from it", async () => {
      renderPage({ onDeleteTrip: vi.fn(), onDuplicateTrip: vi.fn() }, { phone });

      const remove = await screen.findByRole("button", { name: "Remove Option 2 · Baguio City" });
      const another = screen.getByRole("button", { name: "Make another option for Alice" });
      expect(remove.parentElement).toBe(another.parentElement);
    });

    it("is still offered when the page can't copy", async () => {
      renderPage({ onDeleteTrip: vi.fn() }, { phone });
      expect(await screen.findByRole("button", { name: "Remove Option 2 · Baguio City" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /another option/i })).not.toBeInTheDocument();
    });

    it("is hidden for an approved trip", async () => {
      renderPage({ onDeleteTrip: vi.fn() }, { phone });

      fireEvent.click((await screen.findAllByRole("button", { name: "Tokyo" }))[0]);
      await waitFor(() => expect(screen.getAllByRole("button", { name: "Tokyo" })[0]).toHaveAttribute("aria-pressed", "true"));
      expect(removeButton()).toBeNull();
    });

    it("is hidden for a client with a single trip", async () => {
      renderPage({ agencyTrips: [baguioOld], onDeleteTrip: vi.fn() }, { phone });

      await screen.findAllByText("Alice");
      expect(removeButton()).toBeNull();
    });

    it("is hidden when the page can't delete trips", async () => {
      renderPage({}, { phone });

      await screen.findAllByRole("button", { name: "Option 2 · Baguio City" });
      expect(removeButton()).toBeNull();
    });

    it("asks first, and removes the option only after Remove option is pressed", async () => {
      const onDeleteTrip = vi.fn().mockResolvedValue(undefined);
      renderPage({ onDeleteTrip }, { phone });

      const dialog = await openDialog();
      expect(within(dialog).getByText(
        "Remove Option 2 · Baguio City for Alice? Its itinerary, Planner chat, share links, comments and any client rating will be deleted. This can't be undone.",
      )).toBeInTheDocument();
      expect(onDeleteTrip).not.toHaveBeenCalled();

      fireEvent.click(within(dialog).getByRole("button", { name: "Remove option" }));

      await waitFor(() => expect(onDeleteTrip).toHaveBeenCalledWith("agency-1", "t3"));
      expect(onDeleteTrip).toHaveBeenCalledOnce();
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    });

    it("removes the option whose tab is open", async () => {
      const onDeleteTrip = vi.fn().mockResolvedValue(undefined);
      renderPage({ onDeleteTrip }, { phone });

      fireEvent.click((await screen.findAllByRole("button", { name: "Option 1 · Baguio City" }))[0]);
      fireEvent.click(await screen.findByRole("button", { name: "Remove Option 1 · Baguio City" }));
      const dialog = await screen.findByRole("dialog");
      expect(dialog).toHaveTextContent("Remove Option 1 · Baguio City for Alice?");
      fireEvent.click(within(dialog).getByRole("button", { name: "Remove option" }));

      await waitFor(() => expect(onDeleteTrip).toHaveBeenCalledWith("agency-1", "t1"));
    });

    it("moves focus to the client's name once the option is removed", async () => {
      const onDeleteTrip = vi.fn().mockResolvedValue(undefined);
      renderPage({ onDeleteTrip }, { phone });

      // A real press focuses the button, which is where the dialog sends focus back to.
      const remove = await screen.findByRole("button", { name: "Remove Option 2 · Baguio City" });
      remove.focus();
      fireEvent.click(remove);
      const dialog = await screen.findByRole("dialog");
      fireEvent.click(within(dialog).getByRole("button", { name: "Remove option" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      // The dialog hands focus back to the Remove button as it closes; the name has it after that.
      await waitFor(() => expect(screen.getByRole("heading", { name: "Alice" })).toHaveFocus());
      expect(document.activeElement.tagName).toBe("H2");
      expect(document.activeElement).toHaveAttribute("tabindex", "-1");
    });

    it("leaves focus alone when the removal fails or is cancelled", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const onDeleteTrip = vi.fn().mockRejectedValue(new Error("boom"));
      renderPage({ onDeleteTrip }, { phone });

      const dialog = await openDialog();
      fireEvent.click(within(dialog).getByRole("button", { name: "Remove option" }));
      await within(dialog).findByRole("alert");
      fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(screen.getByRole("heading", { name: "Alice" })).not.toHaveFocus();
      errorSpy.mockRestore();
    });

    it("treats a trip the server no longer has as removed, without an error", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const onDeleteTrip = vi.fn().mockRejectedValue(Object.assign(new Error("Trip not found."), { code: "TRIP_NOT_FOUND", status: 404 }));
      renderPage({ onDeleteTrip }, { phone });

      const dialog = await openDialog();
      fireEvent.click(within(dialog).getByRole("button", { name: "Remove option" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(screen.queryByRole("alert")).toBeNull();
      expect(errorSpy).not.toHaveBeenCalled();
      await waitFor(() => expect(screen.getByRole("heading", { name: "Alice" })).toHaveFocus());
      errorSpy.mockRestore();
    });

    it("does nothing when the question is cancelled", async () => {
      const onDeleteTrip = vi.fn();
      renderPage({ onDeleteTrip }, { phone });

      const dialog = await openDialog();
      fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(onDeleteTrip).not.toHaveBeenCalled();
      // The option is still there to remove.
      expect(screen.getByRole("button", { name: "Remove Option 2 · Baguio City" })).toBeInTheDocument();
    });

    it("opens the client's newest remaining trip once the option is gone", async () => {
      const onDeleteTrip = vi.fn().mockResolvedValue(undefined);
      const { rerender } = renderPage({ onDeleteTrip }, { phone });

      const dialog = await openDialog();
      fireEvent.click(within(dialog).getByRole("button", { name: "Remove option" }));
      await waitFor(() => expect(onDeleteTrip).toHaveBeenCalled());

      // The parent drops the trip from the list it passes down; the first one left is the newest.
      rerender(
        <ClientItineraryPage
          agencyTrips={[tokyo, baguioOld]}
          agencyId="agency-1"
          onDeleteTrip={onDeleteTrip}
          {...(phone ? { tourMobilePaneOverride: "detail" } : {})}
        />,
      );
      const pressed = (await screen.findAllByRole("button", { name: "Tokyo" }))[0];
      await waitFor(() => expect(pressed).toHaveAttribute("aria-pressed", "true"));
      // With one Baguio trip left it is no longer an option.
      expect(screen.getAllByRole("button", { name: "Baguio City" }).length).toBeGreaterThan(0);
      expect(screen.queryByRole("button", { name: /Option \d · Baguio City/ })).toBeNull();
    });

    it("keeps the question open with the error when the server refuses", async () => {
      const onDeleteTrip = vi.fn().mockRejectedValue(new Error("boom"));
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      renderPage({ onDeleteTrip }, { phone });

      const dialog = await openDialog();
      fireEvent.click(within(dialog).getByRole("button", { name: "Remove option" }));

      expect(await within(dialog).findByRole("alert")).toHaveTextContent("Couldn't remove this option. Try again.");
      expect(screen.getByRole("dialog")).toBe(dialog);
      // Nothing moved: the same option is still the open tab.
      expect(screen.getAllByRole("button", { name: "Option 2 · Baguio City" })[0]).toHaveAttribute("aria-pressed", "true");
      // And the question can be tried again.
      onDeleteTrip.mockResolvedValue(undefined);
      fireEvent.click(within(dialog).getByRole("button", { name: "Remove option" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(onDeleteTrip).toHaveBeenCalledTimes(2);
      errorSpy.mockRestore();
    });
  });
});
