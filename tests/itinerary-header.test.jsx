import { useState } from "react";
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

const baseProps = {
  selectedClient: client,
  selectedTrip: inReview,
  selectedItineraryId: "iter-1",
  fullItinerary: { id: "iter-1", days: [] },
  unreadCommentCount: 0,
  pdfLoading: false,
  showCommentsPanel: false,
};

function renderHeader(props = {}) {
  const handlers = {
    onBackToList: vi.fn(),
    onAddTripForClient: vi.fn(),
    onToggleComments: vi.fn(),
    onShare: vi.fn(),
    onDownloadPdf: vi.fn(),
  };
  const utils = render(<ItineraryHeader {...baseProps} {...handlers} {...props} />);
  return { ...utils, handlers };
}

describe("ItineraryHeader", () => {
  it("offers Reopen for edits when the page passes a handler", () => {
    const approved = { id: "t1", approvalStatus: "Approved" };
    const onReopen = vi.fn();
    renderHeader({ selectedTrip: approved, onReopen });

    fireEvent.click(screen.getByRole("button", { name: "Reopen for edits" }));

    expect(onReopen).toHaveBeenCalledOnce();
  });

  it("has no Reopen for edits button for a trip in review", () => {
    renderHeader();
    expect(screen.queryByRole("button", { name: "Reopen for edits" })).toBeNull();
  });

  it("leaves focus on the client's name once a reopen takes its button away", () => {
    const approved = { id: "t1", approvalStatus: "Approved" };
    const { rerender, handlers } = renderHeader({ selectedTrip: approved, onReopen: vi.fn() });

    // The confirm dialog had focus, and it closes as the trip unlocks.
    document.activeElement?.blur();
    rerender(<ItineraryHeader {...baseProps} {...handlers} selectedTrip={inReview} onApprove={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Danang" })).toHaveFocus();
  });

  it("doesn't take focus from elsewhere when the Reopen button goes", () => {
    const approved = { id: "t1", approvalStatus: "Approved" };
    const { rerender, handlers } = renderHeader({ selectedTrip: approved, onReopen: vi.fn() });
    const elsewhere = document.createElement("button");
    document.body.append(elsewhere);
    elsewhere.focus();

    rerender(<ItineraryHeader {...baseProps} {...handlers} selectedTrip={inReview} onApprove={vi.fn()} />);

    expect(elsewhere).toHaveFocus();
    elsewhere.remove();
  });

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

  it("announces the status politely, so In review becoming Approved is heard", () => {
    renderHeader();

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("In review");
    expect(screen.getByText("In review")).toBe(status);
  });

  it("uses pointer cursors on New trip and Approve, and keeps the wait cursor while approving", () => {
    renderHeader({ onApprove: vi.fn() });

    expect(screen.getByRole("button", { name: "New trip for Danang" }).className).toContain("cursor-pointer");
    const approve = screen.getByRole("button", { name: "Approve" });
    expect(approve.className).toContain("cursor-pointer");
    expect(approve.className).toContain("disabled:cursor-wait");
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

  it("moves focus to the client's name when Approve is clicked, since the button unmounts once approved", () => {
    // A stand-in for the page: approving hides the button (the trip is no longer in review).
    function Page() {
      const [approved, setApproved] = useState(false);
      return <ItineraryHeader {...baseProps} onApprove={approved ? null : () => setApproved(true)} />;
    }
    render(<Page />);
    const approve = screen.getByRole("button", { name: "Approve" });
    approve.focus();

    fireEvent.click(approve);

    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Danang" })).toHaveFocus();
  });

  it("makes the name a focus target that rings for keyboard users only", () => {
    renderHeader();
    const title = screen.getByRole("heading", { level: 2, name: "Danang" });

    expect(title).toHaveAttribute("tabindex", "-1");
    expect(title.className).toContain("focus-visible:ring-2");
    // A plain `focus:` ring would also show after a mouse click.
    expect(title.className).not.toMatch(/(^|\s)focus:(ring|outline)/);
  });

  it("disables Approve while the request runs", () => {
    renderHeader({ onApprove: vi.fn(), isApproving: true });

    expect(screen.getByRole("button", { name: "Approving…" })).toBeDisabled();
  });

  it("shows no Approve without a handler", () => {
    renderHeader({ selectedTrip: { id: "t1", approvalStatus: "Approved" } });

    expect(screen.queryByRole("button", { name: /approv/i })).toBeNull();
  });

  it("shows the PDF fallback link and build error under the status line", () => {
    renderHeader({ pdfStatus: "error", pdfFallbackUrl: "blob:fallback" });

    expect(screen.getByText(/couldn.t build the PDF/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Open the PDF" });
    expect(link).toHaveAttribute("href", "blob:fallback");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener");
  });

  it("keeps an empty polite region, and no message, until a PDF problem happens", () => {
    const { container } = renderHeader();

    expect(screen.queryByRole("link", { name: "Open the PDF" })).toBeNull();
    expect(screen.queryByText(/couldn.t build the PDF/)).toBeNull();
    const region = container.querySelector("header [aria-live='polite']");
    expect(region).toBeEmptyDOMElement();
    // Empty, it must take no space: the one-line status row stays as it was.
    expect(region.className).toContain("empty:mt-0");
  });

  it("disables the PDF button until the file is ready", () => {
    renderHeader({ pdfReady: false });

    expect(screen.getByRole("button", { name: "Download PDF" })).toBeDisabled();
  });

  it("enables the PDF button once the itinerary is loaded and the file is ready", () => {
    renderHeader({ pdfReady: true });

    expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled();
  });

  it("puts Print right after the PDF button, and prints when tapped", () => {
    const onPrintPdf = vi.fn();
    renderHeader({ pdfReady: true, onPrintPdf });
    const names = screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"));

    expect(names.indexOf("Print itinerary")).toBe(names.indexOf("Download PDF") + 1);
    const print = screen.getByRole("button", { name: "Print itinerary" });
    expect(print).toHaveAttribute("title", "Print itinerary");
    fireEvent.click(print);
    expect(onPrintPdf).toHaveBeenCalledTimes(1);
  });

  it("styles Print like the PDF button, as a quiet action beside it", () => {
    renderHeader({ pdfReady: true, onPrintPdf: vi.fn() });
    const pdf = screen.getByRole("button", { name: "Download PDF" });
    const print = screen.getByRole("button", { name: "Print itinerary" });

    expect(print.className).toContain("bg-surface-elevated");
    expect(print.className).not.toContain("bg-secondary-strong");
    expect(print.className).toContain("cursor-pointer");
    expect(print.parentElement).toBe(pdf.parentElement);
  });

  it("disables Print with the PDF button: no file, no print", () => {
    const { rerender, handlers } = renderHeader({ pdfReady: false, onPrintPdf: vi.fn() });
    expect(screen.getByRole("button", { name: "Print itinerary" })).toBeDisabled();

    rerender(<ItineraryHeader {...baseProps} {...handlers} pdfReady onPrintPdf={vi.fn()} pdfLoading />);
    expect(screen.getByRole("button", { name: "Print itinerary" })).toBeDisabled();

    rerender(<ItineraryHeader {...baseProps} {...handlers} pdfReady onPrintPdf={vi.fn()} fullItinerary={null} />);
    expect(screen.getByRole("button", { name: "Print itinerary" })).toBeDisabled();

    rerender(<ItineraryHeader {...baseProps} {...handlers} pdfReady onPrintPdf={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Print itinerary" })).toBeEnabled();
  });

  it("shows no Print button for a caller without a print handler", () => {
    renderHeader();

    expect(screen.queryByRole("button", { name: "Print itinerary" })).toBeNull();
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
    const { container } = renderHeader({ onPrintPdf: vi.fn() });

    expect(container.querySelector("header").className).toContain("@container");
    for (const label of ["Comments", "Share", "PDF", "Print"]) {
      const span = screen.getByText(label);
      expect(span.className).toContain("hidden");
      expect(span.className).toContain("@min-[920px]:inline");
    }
  });
});
