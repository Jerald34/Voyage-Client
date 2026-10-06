import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

const delivery = vi.hoisted(() => ({ deliverPdf: vi.fn() }));
const printing = vi.hoisted(() => ({ printPdf: vi.fn() }));
const pdfExport = vi.hoisted(() => ({
  generateItineraryPdf: vi.fn(async () => ({ output: () => new Blob(["%PDF-1.7"], { type: "application/pdf" }) })),
  titleToFilename: vi.fn((title) => `${title}.pdf`),
}));

vi.mock("../app/lib/pdfDelivery.js", () => delivery);
vi.mock("../app/lib/pdfPrint.js", () => printing);
vi.mock("../app/lib/pdfExport.js", () => pdfExport);

import { useItineraryPdf } from "../app/hooks/useItineraryPdf.js";

// Stable reference: a new object would rebuild the PDF on every render.
const INPUT = { title: "Kyoto", days: [] };
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:fallback");
  URL.revokeObjectURL = vi.fn();
  delivery.deliverPdf.mockReset();
  printing.printPdf.mockReset();
  pdfExport.generateItineraryPdf.mockClear();
});

afterEach(() => {
  // Unmount first: Vitest runs afterEach hooks in reverse, so setup.js's cleanup
  // would otherwise run after jsdom's (missing) revokeObjectURL is restored.
  cleanup();
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
  vi.restoreAllMocks();
});

describe("useItineraryPdf", () => {
  it("does nothing until there is an itinerary", () => {
    const { result } = renderHook(() => useItineraryPdf(null));

    act(() => result.current.download());

    expect(result.current).toMatchObject({ status: "idle", canDownload: false });
    expect(pdfExport.generateItineraryPdf).not.toHaveBeenCalled();
    expect(delivery.deliverPdf).not.toHaveBeenCalled();
  });

  it("builds the PDF before the tap", async () => {
    const { result } = renderHook(() => useItineraryPdf(INPUT));

    expect(result.current.canDownload).toBe(false);
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({ canDownload: true, filename: "Kyoto.pdf" });
    expect(pdfExport.generateItineraryPdf).toHaveBeenCalledWith(INPUT);
  });

  it("hands the file over synchronously when tapped", async () => {
    delivery.deliverPdf.mockResolvedValue("downloaded");
    const { result } = renderHook(() => useItineraryPdf(INPUT));
    await waitFor(() => expect(result.current.canDownload).toBe(true));

    act(() => result.current.download());

    expect(delivery.deliverPdf).toHaveBeenCalledTimes(1);
    const [file, options] = delivery.deliverPdf.mock.calls[0];
    expect(file).toBeInstanceOf(File);
    expect(file).toMatchObject({ name: "Kyoto.pdf", type: "application/pdf" });
    expect(options).toEqual({ title: "Kyoto" });
  });

  it("offers a plain link when the device refuses the hand-off", async () => {
    delivery.deliverPdf.mockResolvedValue("failed");
    const { result } = renderHook(() => useItineraryPdf(INPUT));
    await waitFor(() => expect(result.current.canDownload).toBe(true));

    act(() => result.current.download());

    await waitFor(() => expect(result.current.fallbackUrl).toBe("blob:fallback"));
  });

  it("reports a build failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    pdfExport.generateItineraryPdf.mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() => useItineraryPdf(INPUT));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.canDownload).toBe(false);
  });

  it("never keeps the previous itinerary's file while the next one builds", async () => {
    const { result, rerender } = renderHook(({ input }) => useItineraryPdf(input), { initialProps: { input: INPUT } });
    await waitFor(() => expect(result.current.canDownload).toBe(true));

    rerender({ input: { title: "Cebu", days: [] } });

    expect(result.current.canDownload).toBe(false);
    await waitFor(() => expect(result.current.filename).toBe("Cebu.pdf"));
  });

  it("ignores a hand-off that fails after the itinerary changed, so no link to the old trip appears", async () => {
    let settle;
    delivery.deliverPdf.mockReturnValue(new Promise((resolve) => { settle = resolve; }));
    const { result, rerender } = renderHook(({ input }) => useItineraryPdf(input), { initialProps: { input: INPUT } });
    await waitFor(() => expect(result.current.canDownload).toBe(true));
    act(() => result.current.download());

    rerender({ input: { title: "Cebu", days: [] } });
    await act(async () => settle("failed"));

    expect(result.current.fallbackUrl).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.filename).toBe("Cebu.pdf"));
    expect(result.current.fallbackUrl).toBeNull();
  });

  it("prints the same prepared file synchronously when tapped", async () => {
    printing.printPdf.mockResolvedValue("printed");
    const { result } = renderHook(() => useItineraryPdf(INPUT));
    await waitFor(() => expect(result.current.canDownload).toBe(true));

    act(() => result.current.print());

    expect(printing.printPdf).toHaveBeenCalledTimes(1);
    expect(delivery.deliverPdf).not.toHaveBeenCalled();
    const [file, options] = printing.printPdf.mock.calls[0];
    expect(file).toBeInstanceOf(File);
    expect(file).toMatchObject({ name: "Kyoto.pdf", type: "application/pdf" });
    expect(options).toEqual({ title: "Kyoto" });
  });

  it("does nothing on print until there is a file", () => {
    const { result } = renderHook(() => useItineraryPdf(null));

    act(() => result.current.print());

    expect(printing.printPdf).not.toHaveBeenCalled();
  });

  it("offers a plain link when the device can neither print nor open the PDF", async () => {
    printing.printPdf.mockResolvedValue("failed");
    const { result } = renderHook(() => useItineraryPdf(INPUT));
    await waitFor(() => expect(result.current.canDownload).toBe(true));

    act(() => result.current.print());

    await waitFor(() => expect(result.current.fallbackUrl).toBe("blob:fallback"));
  });

  it("offers no link when printing worked or the person cancelled", async () => {
    const { result } = renderHook(() => useItineraryPdf(INPUT));
    await waitFor(() => expect(result.current.canDownload).toBe(true));

    for (const outcome of ["printed", "opened", "cancelled"]) {
      printing.printPdf.mockResolvedValueOnce(outcome);
      await act(async () => result.current.print());
    }

    expect(result.current.fallbackUrl).toBeNull();
  });

  it("does not make an object URL for a print that fails after the itinerary changed", async () => {
    let settle;
    printing.printPdf.mockReturnValue(new Promise((resolve) => { settle = resolve; }));
    const { result, rerender } = renderHook(({ input }) => useItineraryPdf(input), { initialProps: { input: INPUT } });
    await waitFor(() => expect(result.current.canDownload).toBe(true));
    act(() => result.current.print());

    rerender({ input: { title: "Cebu", days: [] } });
    await act(async () => settle("failed"));

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(result.current.fallbackUrl).toBeNull();
  });

  it("does not make an object URL for a hand-off that fails after unmount", async () => {
    let settle;
    delivery.deliverPdf.mockReturnValue(new Promise((resolve) => { settle = resolve; }));
    const { result, unmount } = renderHook(() => useItineraryPdf(INPUT));
    await waitFor(() => expect(result.current.canDownload).toBe(true));
    act(() => result.current.download());

    unmount();
    await act(async () => settle("failed"));

    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
