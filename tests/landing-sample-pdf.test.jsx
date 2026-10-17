// tests/landing-sample-pdf.test.jsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("../app/components/icons/index.js", async () => (await import("./helpers/iconsMock.js")).default);
const pdf = vi.hoisted(() => ({ status: "ready", canDownload: true, download: vi.fn(), print: vi.fn(), fallbackUrl: null }));
vi.mock("../app/hooks/useItineraryPdf.js", () => ({ useItineraryPdf: vi.fn(() => pdf) }));

import SamplePdfDemo from "../app/components/landing/after-the-plan/SamplePdfDemo.jsx";
import { useItineraryPdf } from "../app/hooks/useItineraryPdf.js";
import { SAMPLE_PDF_INPUT } from "../app/components/landing/sample/sampleTrip.js";

describe("SamplePdfDemo", () => {
  it("builds the real PDF of the sample trip and downloads or prints it", () => {
    render(<SamplePdfDemo />);

    expect(useItineraryPdf).toHaveBeenCalledWith(SAMPLE_PDF_INPUT);
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(pdf.download).toHaveBeenCalledTimes(1);
    expect(pdf.print).toHaveBeenCalledTimes(1);
  });

  it("quotes the PDF's real weather lines for day 2", () => {
    render(<SamplePdfDemo />);

    expect(
      screen.getByText("Weather forecast: Afternoon rain, 1–2 PM, 16–26°C, dry until 11 AM, about 4 mm of rain"),
    ).toBeInTheDocument();
    expect(screen.getByText("Rain likely (up to 94% chance of rain)")).toBeInTheDocument();
    expect(screen.getByText("SM City Baguio")).toBeInTheDocument();
  });

  it("quotes the day line the way the PDF's navy day bar writes it", () => {
    render(<SamplePdfDemo />);

    // "Day N  ·  Sat, Oct 10, 2026  —  title", double spaces kept (the paragraph preserves whitespace).
    const dayLine = screen.getByText((_, element) => element.textContent === "Day 2  ·  Sat, Oct 10, 2026  —  Views & Shopping");
    expect(dayLine.tagName).toBe("P");
    expect(dayLine.className).toContain("whitespace-pre-wrap");
  });

  it("writes each stop as time, then title, then its weather on its own line, as the PDF does", () => {
    render(<SamplePdfDemo />);

    const item = screen.getByText("SM City Baguio").closest("li");
    expect([...item.querySelectorAll("p")].map((line) => line.textContent)).toEqual([
      "1:30 PM – 3:00 PM",
      "SM City Baguio",
      "Rain likely (up to 94% chance of rain)",
    ]);
  });

  it("keeps list semantics on the stop list, which has list-style: none", () => {
    render(<SamplePdfDemo />);

    const list = screen.getByText("SM City Baguio").closest("ol");
    expect(list).toHaveAttribute("role", "list");
    expect(list.className).toContain("list-none");
  });
});
