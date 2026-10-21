import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  fetchPublicItinerary: vi.fn(),
  fetchPublicShareRevision: vi.fn(),
  listPublicComments: vi.fn(async () => ({ comments: [] })),
  postPublicComment: vi.fn(),
  fetchSharedItineraryWeather: vi.fn(() => new Promise(() => {})),
}));

vi.mock("../app/lib/api/index.js", () => api);
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
vi.mock("../app/lib/pdfExport.js", () => ({
  generateItineraryPdf: vi.fn(async () => ({ output: () => new Blob([]) })),
  titleToFilename: vi.fn((s) => s),
}));

import PublicItineraryPage from "../app/itinerary/view/[token]/page.jsx";

const POLL_MS = 30_000;
const BANNER_TEXT = "Your agent updated this itinerary";
const LOADER_TEXT = "Loading your itinerary...";
// The PDF button's spinner is a role="status" too, so the update region is found by its name.
const REGION = { name: "Itinerary updates" };

let visibility = "visible";

function setVisibility(next) {
  visibility = next;
  document.dispatchEvent(new Event("visibilitychange"));
}

/** A share payload; `stopTitle` is what a change by the agency shows up as. */
function payload({ revision, stopTitle = "Kiyomizu-dera", dayTitle = "Eastern Higashiyama" } = {}) {
  return {
    ...(revision === undefined ? {} : { revision }),
    share: { token: "share-token-12" },
    brand: { type: "agency", name: "Island Hops Travel", logoUrl: null },
    trip: { title: "Kyoto Autumn Escape", startDate: null, endDate: null, travelerCount: 2, destinationSummary: "Kyoto, Japan" },
    itinerary: {
      title: "Kyoto Autumn Escape",
      summary: null,
      version: 1,
      days: [
        {
          id: "day-1",
          dayNumber: 1,
          date: null,
          title: dayTitle,
          summary: null,
          items: [{ id: "item-1", type: "ATTRACTION", title: stopTitle, startTime: "08:00", endTime: "10:00", placeSnapshot: null }],
        },
      ],
    },
  };
}

/** A promise the test settles by hand, to hold a request open. */
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function tick(ms) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

/** Renders the page and waits for the itinerary, with fake timers that still let Testing Library's waits run. */
async function renderLoaded() {
  render(<PublicItineraryPage />);
  await screen.findByRole("heading", { level: 1, name: "Kyoto Autumn Escape" });
}

/**
 * jsdom has no layout, so give the update region the height a browser would report once the banner is in it
 * (the page measures with getBoundingClientRect so a fractional height is not rounded away).
 * The sr-only confirmation has no height. Returns the spy; call `.mockRestore()` when done.
 */
function mockBannerHeight(px) {
  return vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function getBoundingClientRect() {
    const height = this.getAttribute("aria-label") === "Itinerary updates" && this.querySelector("button") ? px : 0;
    return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: height, width: 0, height, toJSON() {} };
  });
}

/** Lets the first poll find revision `next`, so the banner is up. */
async function showBanner(next = "rev-2") {
  api.fetchPublicShareRevision.mockResolvedValue({ revision: next });
  await tick(POLL_MS);
  return screen.findByRole("button", { name: "Show latest" });
}

beforeEach(() => {
  api.fetchPublicItinerary.mockReset();
  api.fetchPublicShareRevision.mockReset();
  api.fetchPublicShareRevision.mockResolvedValue({ revision: "rev-1" });
  localStorage.clear();
  localStorage.setItem("voyage_commenter_name", "Tester");
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  vi.useFakeTimers({ shouldAdvanceTime: true });
  api.fetchPublicItinerary.mockResolvedValue(payload({ revision: "rev-1" }));
});

afterEach(() => {
  vi.useRealTimers();
  delete document.visibilityState;
});

describe("share page update banner", () => {
  it("does not poll, and shows no banner, when the server sends no revision", async () => {
    api.fetchPublicItinerary.mockResolvedValue(payload());
    await renderLoaded();

    await tick(10 * POLL_MS);

    expect(api.fetchPublicShareRevision).not.toHaveBeenCalled();
    expect(screen.queryByText(BANNER_TEXT)).toBeNull();
  });

  it("keeps an empty polite live region ready, so the banner is announced when it arrives", async () => {
    await renderLoaded();

    const region = screen.getByRole("status", REGION);
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toBeEmptyDOMElement();
  });

  it("shows the banner once a poll finds a different revision", async () => {
    await renderLoaded();
    expect(api.fetchPublicShareRevision).not.toHaveBeenCalled();

    const button = await showBanner();

    const region = screen.getByRole("status", REGION);
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(within(region).getByText(BANNER_TEXT)).toBeInTheDocument();
    expect(region).toContainElement(button);
    expect(api.fetchPublicShareRevision).toHaveBeenCalledWith("share-token-12");
  });

  it("shows no banner while the revision is unchanged", async () => {
    await renderLoaded();

    await tick(3 * POLL_MS);

    expect(api.fetchPublicShareRevision).toHaveBeenCalledTimes(3);
    expect(screen.queryByText(BANNER_TEXT)).toBeNull();
  });

  it("changes nothing on the page by itself when an update is found", async () => {
    api.fetchPublicItinerary.mockResolvedValue(payload({ revision: "rev-1" }));
    await renderLoaded();
    await showBanner();

    expect(api.fetchPublicItinerary).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("article")).toHaveTextContent("Kiyomizu-dera");
  });

  it("pauses polling while the tab is hidden and checks as soon as it is visible", async () => {
    await renderLoaded();

    act(() => setVisibility("hidden"));
    await tick(5 * POLL_MS);
    expect(api.fetchPublicShareRevision).not.toHaveBeenCalled();

    api.fetchPublicShareRevision.mockResolvedValue({ revision: "rev-2" });
    await act(async () => {
      setVisibility("visible");
    });

    expect(await screen.findByText(BANNER_TEXT)).toBeInTheDocument();
    expect(api.fetchPublicShareRevision).toHaveBeenCalledTimes(1);
  });

  it("stops polling, quietly, when the check answers 410", async () => {
    api.fetchPublicShareRevision.mockRejectedValue(Object.assign(new Error("revoked"), { status: 410, code: "SHARE_REVOKED" }));
    await renderLoaded();

    await tick(6 * POLL_MS);

    expect(api.fetchPublicShareRevision).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(BANNER_TEXT)).toBeNull();
    // The reader keeps what they have; only a real load maps this to the expired screen.
    expect(screen.getByRole("heading", { level: 1, name: "Kyoto Autumn Escape" })).toBeInTheDocument();
    expect(screen.queryByText("Link Expired")).toBeNull();
  });

  describe("holding the reader's place", () => {
    it("scrolls by the banner's height as it appears and goes, so the text on screen does not jump", async () => {
      const height = mockBannerHeight(72);
      await renderLoaded();
      const scroller = screen.getByRole("heading", { level: 1, name: "Kyoto Autumn Escape" }).closest(".overflow-y-auto");
      scroller.scrollTop = 240;

      const button = await showBanner();
      // The banner pushes the scroller's top edge down 72px; scrolling 72px keeps the text where it was.
      expect(scroller.scrollTop).toBe(312);

      api.fetchPublicItinerary.mockResolvedValue(payload({ revision: "rev-2", stopTitle: "Fushimi Inari Taisha" }));
      await act(async () => {
        fireEvent.click(button);
      });
      expect(scroller.scrollTop).toBe(240);
      height.mockRestore();
    });

    it("keeps a fractional banner height exact, so the text lands on the same pixel", async () => {
      const height = mockBannerHeight(70.8);
      await renderLoaded();
      const scroller = screen.getByRole("heading", { level: 1, name: "Kyoto Autumn Escape" }).closest(".overflow-y-auto");
      scroller.scrollTop = 240;

      await showBanner();

      expect(scroller.scrollTop).toBeCloseTo(310.8, 5);
      height.mockRestore();
    });

    it("does not scroll a reader who is still at the top; the title just moves down", async () => {
      const height = mockBannerHeight(72);
      await renderLoaded();
      const scroller = screen.getByRole("heading", { level: 1, name: "Kyoto Autumn Escape" }).closest(".overflow-y-auto");
      expect(scroller.scrollTop).toBe(0);

      await showBanner();

      expect(scroller.scrollTop).toBe(0);
      height.mockRestore();
    });

    it("also absorbs the inline error line, which makes the banner taller", async () => {
      const height = mockBannerHeight(72);
      await renderLoaded();
      const scroller = screen.getByRole("heading", { level: 1, name: "Kyoto Autumn Escape" }).closest(".overflow-y-auto");
      scroller.scrollTop = 240;
      const button = await showBanner();
      expect(scroller.scrollTop).toBe(312);

      height.mockRestore();
      const taller = mockBannerHeight(90);
      api.fetchPublicItinerary.mockRejectedValueOnce(new Error("offline"));
      await act(async () => {
        fireEvent.click(button);
      });

      expect(scroller.scrollTop).toBe(330);
      taller.mockRestore();
    });
  });

  describe("Show latest", () => {
    it("swaps in the new itinerary without the full-page loader, then hides the banner", async () => {
      await renderLoaded();
      const button = await showBanner();
      const held = deferred();
      api.fetchPublicItinerary.mockReturnValue(held.promise);

      fireEvent.click(button);

      // In flight: busy, still focusable, still the old itinerary, and no loader takeover.
      expect(button).toHaveAttribute("aria-busy", "true");
      expect(button).not.toBeDisabled();
      expect(screen.queryByText(LOADER_TEXT)).toBeNull();
      expect(screen.getByRole("article")).toHaveTextContent("Kiyomizu-dera");

      await act(async () => {
        held.resolve(payload({ revision: "rev-2", stopTitle: "Fushimi Inari Taisha" }));
      });

      expect(screen.getByRole("article")).toHaveTextContent("Fushimi Inari Taisha");
      expect(screen.queryByText("Kiyomizu-dera")).toBeNull();
      expect(screen.queryByText(BANNER_TEXT)).toBeNull();
      expect(screen.queryByRole("button", { name: "Show latest" })).toBeNull();
      expect(screen.queryByText(LOADER_TEXT)).toBeNull();
      expect(api.fetchPublicItinerary).toHaveBeenCalledTimes(2);
    });

    it("keeps the reader's place: same scroll container, open comment draft and commenter name", async () => {
      await renderLoaded();
      const scroller = screen.getByRole("heading", { level: 1, name: "Kyoto Autumn Escape" }).closest(".overflow-y-auto");
      scroller.scrollTop = 240;

      fireEvent.click(screen.getByRole("button", { name: "Comment on Kiyomizu-dera" }));
      const draft = screen.getByPlaceholderText("Write a comment…");
      fireEvent.change(draft, { target: { value: "Can we start later?" } });

      const button = await showBanner();
      api.fetchPublicItinerary.mockResolvedValue(payload({ revision: "rev-2", stopTitle: "Kiyomizu-dera (late start)" }));
      await act(async () => {
        fireEvent.click(button);
      });

      expect(screen.getByRole("article")).toHaveTextContent("Kiyomizu-dera (late start)");
      expect(screen.getByRole("heading", { level: 1, name: "Kyoto Autumn Escape" }).closest(".overflow-y-auto")).toBe(scroller);
      expect(scroller.scrollTop).toBe(240);
      expect(screen.getByPlaceholderText("Write a comment…")).toBe(draft);
      expect(draft).toHaveValue("Can we start later?");
      // Mid-sentence in the draft: focus is still there, not pulled to the page.
      expect(draft).toHaveFocus();
      expect(screen.queryByPlaceholderText("Your name *")).toBeNull();
    });

    it("watches the new revision afterwards, so a later edit raises the banner again", async () => {
      await renderLoaded();
      const button = await showBanner("rev-2");
      api.fetchPublicItinerary.mockResolvedValue(payload({ revision: "rev-2", stopTitle: "Fushimi Inari Taisha" }));
      await act(async () => {
        fireEvent.click(button);
      });
      expect(screen.queryByText(BANNER_TEXT)).toBeNull();

      // rev-2 is now the baseline: seeing it again is not an update.
      await tick(POLL_MS);
      expect(screen.queryByText(BANNER_TEXT)).toBeNull();

      api.fetchPublicShareRevision.mockResolvedValue({ revision: "rev-3" });
      await tick(POLL_MS);
      expect(await screen.findByText(BANNER_TEXT)).toBeInTheDocument();
    });

    it("keeps the banner and says so inline when the reload fails, and recovers on retry", async () => {
      await renderLoaded();
      const button = await showBanner();
      api.fetchPublicItinerary.mockRejectedValueOnce(new Error("offline"));

      await act(async () => {
        fireEvent.click(button);
      });

      expect(screen.getByText(BANNER_TEXT)).toBeInTheDocument();
      expect(screen.getByText("Couldn't load the update. Try again.")).toBeInTheDocument();
      expect(button).not.toHaveAttribute("aria-busy", "true");
      expect(screen.getByRole("article")).toHaveTextContent("Kiyomizu-dera");
      // A failed reload is not a full-page error either.
      expect(screen.queryByText("Something Went Wrong")).toBeNull();

      api.fetchPublicItinerary.mockResolvedValue(payload({ revision: "rev-2", stopTitle: "Fushimi Inari Taisha" }));
      await act(async () => {
        fireEvent.click(button);
      });

      expect(screen.getByRole("article")).toHaveTextContent("Fushimi Inari Taisha");
      expect(screen.queryByText(BANNER_TEXT)).toBeNull();
      expect(screen.queryByText("Couldn't load the update. Try again.")).toBeNull();
    });

    it("hands focus to the itinerary when the button that had it goes, so a keyboard user keeps their place", async () => {
      await renderLoaded();
      const scroller = screen.getByRole("heading", { level: 1, name: "Kyoto Autumn Escape" }).closest(".overflow-y-auto");
      const button = await showBanner();
      button.focus();
      expect(button).toHaveFocus();
      api.fetchPublicItinerary.mockResolvedValue(payload({ revision: "rev-2", stopTitle: "Fushimi Inari Taisha" }));

      await act(async () => {
        fireEvent.click(button);
      });

      expect(screen.queryByRole("button", { name: "Show latest" })).toBeNull();
      expect(scroller).toHaveFocus();
    });

    it("leaves focus alone when it was not on the banner", async () => {
      await renderLoaded();
      const button = await showBanner();
      const outside = screen.getByRole("button", { name: "Add general feedback" });
      outside.focus();
      api.fetchPublicItinerary.mockResolvedValue(payload({ revision: "rev-2", stopTitle: "Fushimi Inari Taisha" }));

      await act(async () => {
        fireEvent.click(button);
      });

      expect(outside).toHaveFocus();
    });

    it("confirms the update to screen readers once the banner is gone, then clears the note", async () => {
      await renderLoaded();
      const button = await showBanner();
      api.fetchPublicItinerary.mockResolvedValue(payload({ revision: "rev-2", stopTitle: "Fushimi Inari Taisha" }));

      await act(async () => {
        fireEvent.click(button);
      });

      const region = screen.getByRole("status", REGION);
      expect(region).toHaveTextContent("Itinerary updated.");
      expect(screen.queryByText(BANNER_TEXT)).toBeNull();

      await tick(5000);
      expect(region).toBeEmptyDOMElement();
    });

    it("sends one request however many times it is tapped while loading", async () => {
      await renderLoaded();
      const button = await showBanner();
      api.fetchPublicItinerary.mockReturnValue(new Promise(() => {}));

      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(api.fetchPublicItinerary).toHaveBeenCalledTimes(2);
    });
  });
});
