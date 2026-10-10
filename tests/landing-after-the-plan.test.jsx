// tests/landing-after-the-plan.test.jsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("../app/components/icons/index.js", async () => (await import("./helpers/iconsMock.js")).default);
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }) => <svg data-testid="qr" data-value={value} />,
  QRCodeCanvas: () => null,
}));
vi.mock("next/dynamic", () => ({
  default: () =>
    function PdfDemoStub() {
      return <div data-testid="pdf-demo" />;
    },
}));

import AfterThePlanTabs from "../app/components/landing/after-the-plan/AfterThePlanTabs.jsx";
import DemoErrorBoundary from "../app/components/landing/after-the-plan/DemoErrorBoundary.jsx";

describe("AfterThePlanTabs", () => {
  it("opens on Asks first with the real questions and leaves focus alone", () => {
    render(<AfterThePlanTabs />);

    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "Asks first",
      "Share link",
      "Client feedback",
      "PDF and print",
      "Approve and lock",
    ]);
    expect(screen.getByRole("tab", { name: "Asks first" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("group", { name: "How will the travelers get around?" })).toBeInTheDocument();
    expect(document.body).toHaveFocus();
  });

  it("answers both questions and shows them as the agent would receive them", () => {
    render(<AfterThePlanTabs />);

    fireEvent.click(screen.getByRole("radio", { name: /A mix/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("radio", { name: /Packed/ }));
    fireEvent.click(screen.getByRole("button", { name: "Send answers" }));

    expect(screen.getByText("A mix")).toBeInTheDocument();
    expect(screen.getByText("Packed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try it again" }));
    expect(screen.getByRole("group", { name: "How will the travelers get around?" })).toBeInTheDocument();
  });

  it("moves focus to the answers after sending, and back to the first option on retry", () => {
    render(<AfterThePlanTabs />);

    fireEvent.click(screen.getByRole("radio", { name: /A mix/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("radio", { name: /Packed/ }));
    fireEvent.click(screen.getByRole("button", { name: "Send answers" }));

    // The panel (and the button that was focused in it) is gone: focus must not fall to <body>.
    expect(screen.getByRole("group", { name: "Your answers" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Try it again" }));
    expect(screen.getByRole("radio", { name: /Private car/ })).toHaveFocus();
  });

  it("moves between tabs with the arrow keys", () => {
    render(<AfterThePlanTabs />);

    const first = screen.getByRole("tab", { name: "Asks first" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });

    const share = screen.getByRole("tab", { name: "Share link" });
    expect(share).toHaveAttribute("aria-selected", "true");
    expect(share).toHaveFocus();
    expect(screen.getByTestId("qr").dataset.value).toBe(`${window.location.origin}/#sample-trip`);

    fireEvent.keyDown(share, { key: "End" });
    expect(screen.getByRole("tab", { name: "Approve and lock" })).toHaveFocus();
  });

  it("rates the proposal without sending anything", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    render(<AfterThePlanTabs />);

    fireEvent.click(screen.getByRole("tab", { name: "Client feedback" }));
    expect(screen.getByText("Mines View Park", { selector: "h3" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "5 stars" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit rating" }));

    expect(await screen.findByLabelText("5 out of 5 stars")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("walks a trip through review, approval and reopening back to review", () => {
    render(<AfterThePlanTabs />);

    const stepOf = (label) => screen.getByText(label, { selector: "span" }).closest("li");

    fireEvent.click(screen.getByRole("tab", { name: "Approve and lock" }));
    expect(stepOf("Draft")).toHaveAttribute("aria-current", "step");
    fireEvent.click(screen.getByRole("button", { name: "Save to Client" }));
    expect(stepOf("In review")).toHaveAttribute("aria-current", "step");
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(screen.getByText("Locked. Approved itineraries can't be edited.")).toBeInTheDocument();
    expect(stepOf("Approved")).toHaveAttribute("aria-current", "step");

    // Like the real app, reopening goes back to In review, not Draft, and needs approval again.
    fireEvent.click(screen.getByRole("button", { name: "Reopen for edits" }));
    expect(screen.getByText("Reopened: editable again, and it needs approval again.")).toBeInTheDocument();
    expect(stepOf("In review")).toHaveAttribute("aria-current", "step");
    expect(stepOf("Draft")).not.toHaveAttribute("aria-current");
    expect(stepOf("Approved")).not.toHaveAttribute("aria-current");

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(screen.getByText("Locked. Approved itineraries can't be edited.")).toBeInTheDocument();
  });

  it("marks steps still to come with a dashed outline, never by dimming the badge", () => {
    render(<AfterThePlanTabs />);

    fireEvent.click(screen.getByRole("tab", { name: "Approve and lock" }));
    const outlined = (label) => screen.getByText(label, { selector: "span" }).parentElement.className.includes("outline-dashed");

    expect(outlined("Draft")).toBe(false);
    expect(outlined("In review")).toBe(true);
    expect(outlined("Approved")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Save to Client" }));
    expect(outlined("In review")).toBe(false);
    expect(outlined("Approved")).toBe(true);

    for (const item of within(screen.getByRole("list", { name: "Approval steps" })).getAllByRole("listitem")) {
      expect(item.className).not.toContain("opacity");
    }
    for (const label of ["Draft", "In review", "Approved"]) {
      expect(screen.getByText(label, { selector: "span" }).className).not.toContain("opacity");
    }
  });

  it("labels the tablist with the section heading and points only the selected tab at the panel", () => {
    render(<AfterThePlanTabs />);

    const tablist = screen.getByRole("tablist", { name: "From draft to a client who said yes" });
    expect(tablist).not.toHaveAttribute("aria-label");
    expect(tablist.getAttribute("aria-labelledby")).toBe(screen.getByRole("heading", { level: 2 }).id);

    const tabs = screen.getAllByRole("tab");
    const panel = screen.getByRole("tabpanel");
    for (const tab of tabs) {
      if (tab.getAttribute("aria-selected") === "true") {
        expect(tab.getAttribute("aria-controls")).toBe(panel.id);
      } else {
        expect(tab).not.toHaveAttribute("aria-controls");
      }
    }
    fireEvent.click(screen.getByRole("tab", { name: "Share link" }));
    expect(screen.getByRole("tab", { name: "Asks first" })).not.toHaveAttribute("aria-controls");
    expect(screen.getByRole("tab", { name: "Share link" })).toHaveAttribute("aria-controls", screen.getByRole("tabpanel").id);
  });

  it("loads the PDF demo only when its tab opens", () => {
    render(<AfterThePlanTabs />);

    expect(screen.queryByTestId("pdf-demo")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "PDF and print" }));
    expect(screen.getByTestId("pdf-demo")).toBeInTheDocument();
  });
});

describe("DemoErrorBoundary", () => {
  function Broken() {
    throw new Error("chunk failed");
  }

  it("shows a short message instead of crashing the page when its demo throws", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <>
        <p>The rest of the page</p>
        <DemoErrorBoundary message="The PDF demo couldn't load. Reload the page to try again.">
          <Broken />
        </DemoErrorBoundary>
      </>,
    );

    const message = screen.getByRole("alert");
    expect(message).toHaveTextContent("The PDF demo couldn't load. Reload the page to try again.");
    expect(message.className).toContain("text-text-muted");
    expect(screen.getByText("The rest of the page")).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("renders its demo untouched when nothing throws", () => {
    render(
      <DemoErrorBoundary message="unused">
        <p>The demo</p>
      </DemoErrorBoundary>,
    );

    expect(screen.getByText("The demo")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
