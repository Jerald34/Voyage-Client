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
    // pdfExport.js writes a stop as its time and weather on one line, with the title below it.
    expect(screen.getByText("9:00 AM – 10:00 AM · Likely dry")).toBeInTheDocument();
    expect(screen.getByText("1:30 PM – 3:00 PM · Rain likely (up to 94% chance of rain)")).toBeInTheDocument();
    expect(screen.getByText("SM City Baguio")).toBeInTheDocument();
  });
});
