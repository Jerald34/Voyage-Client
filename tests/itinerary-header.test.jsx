import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// components/icons/index.js contains JSX in a .js file, which vitest cannot parse.
// A Proxy stubs whichever icon the header imports.
vi.mock("../app/components/icons/index.js", () => {
  const Icon = () => null;
  const isIcon = (name) => typeof name === "string" && name !== "then";
  // vitest checks `name in module` before reading an export, so answer `has` too.
  return new Proxy(
    { __esModule: true },
    {
      get: (target, name) => (name in target ? target[name] : isIcon(name) ? Icon : undefined),
      has: (target, name) => name in target || isIcon(name),
    },
  );
});
// The launcher fetches rated trips; its button has its own test (reuseButton.smoke.test.jsx).
vi.mock("../app/components/ratedHistory/entryPoints/ReuseLauncher.jsx", () => ({ default: () => null }));

import ItineraryHeader from "../app/components/trip-dashboard/pages/ItineraryHeader.jsx";

const inReview = { id: "t1", approvalStatus: "In review" };
const client = { id: "danang", name: "Danang", trips: [inReview] };

function renderHeader(props = {}) {
  const handlers = {
    onBackToList: vi.fn(),
    onAddTripForClient: vi.fn(),
    onToggleComments: vi.fn(),
    onShare: vi.fn(),
    onDownloadPdf: vi.fn(),
  };
  const utils = render(
    <ItineraryHeader
      selectedClient={client}
      selectedTrip={inReview}
      selectedItineraryId="iter-1"
      fullItinerary={{ id: "iter-1", days: [] }}
      unreadCommentCount={0}
      pdfLoading={false}
      showCommentsPanel={false}
      {...handlers}
      {...props}
    />,
  );
  return { ...utils, handlers };
}

describe("ItineraryHeader", () => {
  it("shows the client's full name as the page's serif title, at the font's real weight", () => {
    renderHeader();
    const title = screen.getByRole("heading", { level: 2, name: "Danang" });

    expect(title).toHaveAttribute("title", "Danang");
    expect(title.className).toContain("font-serif");
    expect(title.className).not.toMatch(/font-(semibold|bold|extrabold|black)/);
  });

  it("puts the status, the saved count and New trip on one line under the name", () => {
    const { handlers } = renderHeader();

    expect(screen.getByText("In review")).toBeInTheDocument();
    expect(screen.getByText("1 saved itinerary")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "New trip for Danang" }));
    expect(handlers.onAddTripForClient).toHaveBeenCalledWith("Danang");
  });

  it("drops the Saved itineraries badge and the old count", () => {
    renderHeader();

    expect(screen.queryByText("Saved itineraries")).toBeNull();
    expect(screen.queryByText("1 saved")).toBeNull();
  });

  it.each([
    ["In review", "bg-status-warning"],
    ["Approved", "bg-status-success"],
  ])("colours the dot for %s", (approvalStatus, dotClass) => {
    renderHeader({ selectedTrip: { id: "t1", approvalStatus } });

    const dot = screen.getByText(approvalStatus).querySelector('[aria-hidden="true"]');
    expect(dot.className).toContain(dotClass);
  });

  it("offers Approve as the one filled action, inside the actions group", () => {
    const onApprove = vi.fn();
    const { container } = renderHeader({ onApprove });
    const approve = screen.getByRole("button", { name: "Approve" });

    expect(container.querySelector('[data-tour-target="cip-actions"]')).toContainElement(approve);
    expect(approve.className).toContain("bg-secondary-strong");
    expect(approve.className).toContain("text-on-secondary-strong");
    fireEvent.click(approve);
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it("disables Approve while the request runs", () => {
    renderHeader({ onApprove: vi.fn(), isApproving: true });

    expect(screen.getByRole("button", { name: "Approving…" })).toBeDisabled();
  });

  it("shows no Approve without a handler", () => {
    renderHeader({ selectedTrip: { id: "t1", approvalStatus: "Approved" } });

    expect(screen.queryByRole("button", { name: /approv/i })).toBeNull();
  });

  it("marks open Comments with the contrast-safe terracotta", () => {
    renderHeader({ showCommentsPanel: true });
    const comments = screen.getByRole("button", { name: "Comments" });

    expect(comments).toHaveAttribute("aria-pressed", "true");
    expect(comments.className).toContain("bg-secondary-strong");
    expect(comments.className).toContain("text-on-secondary-strong");
    expect(comments.className).not.toMatch(/(^|\s)text-white(\s|$)/);
  });

  it("drops action labels when the header itself is narrow (container query)", () => {
    const { container } = renderHeader();

    expect(container.querySelector("header").className).toContain("@container");
    for (const label of ["Comments", "Share", "PDF"]) {
      const span = screen.getByText(label);
      expect(span.className).toContain("hidden");
      expect(span.className).toContain("@min-[720px]:inline");
    }
  });
});
