// tests/landing-after-the-plan.test.jsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

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

  it("walks a trip through review, approval and reopening", () => {
    render(<AfterThePlanTabs />);

    fireEvent.click(screen.getByRole("tab", { name: "Approve and lock" }));
    fireEvent.click(screen.getByRole("button", { name: "Save to Client" }));
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(screen.getByText("Locked. Approved itineraries can't be edited.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reopen for edits" }));
    expect(screen.getByText("Editable while you plan.")).toBeInTheDocument();
  });

  it("loads the PDF demo only when its tab opens", () => {
    render(<AfterThePlanTabs />);

    expect(screen.queryByTestId("pdf-demo")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "PDF and print" }));
    expect(screen.getByTestId("pdf-demo")).toBeInTheDocument();
  });
});
