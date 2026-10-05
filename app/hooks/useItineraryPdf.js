"use client";

import { useCallback, useEffect, useState } from "react";
import { generateItineraryPdf, titleToFilename } from "../lib/pdfExport.js";
import { deliverPdf } from "../lib/pdfDelivery.js";

/**
 * Builds the itinerary PDF as soon as its content is known, so a tap can hand
 * the file to the device synchronously (lib/pdfDelivery.js explains why iOS
 * needs that).
 *
 * @param {object|null} input generateItineraryPdf's argument; null until the
 *   itinerary has loaded. Memoize it: a new object rebuilds the PDF.
 * @returns {{ status: "idle"|"preparing"|"ready"|"error", canDownload: boolean,
 *   download: () => void, fallbackUrl: string|null, filename: string|null }}
 */
export function useItineraryPdf(input) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [fallbackUrl, setFallbackUrl] = useState(null);

  useEffect(() => {
    // A rebuild must never leave the previous itinerary's file downloadable.
    setFile(null);
    setFallbackUrl(null);
    if (!input) {
      setStatus("idle");
      return undefined;
    }

    let cancelled = false;
    setStatus("preparing");
    // Next tick, so the page paints before jsPDF's synchronous layout work.
    const timer = setTimeout(async () => {
      try {
        const doc = await generateItineraryPdf(input);
        const blob = doc.output("blob");
        const next = new File([blob], titleToFilename(input.title), { type: "application/pdf" });
        if (cancelled) return;
        setFile(next);
        setStatus("ready");
      } catch (error) {
        console.error("PDF export failed:", error);
        if (!cancelled) setStatus("error");
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [input]);

  // Release the fallback link's object URL when it is replaced or the page unmounts.
  useEffect(() => {
    if (!fallbackUrl) return undefined;
    return () => URL.revokeObjectURL(fallbackUrl);
  }, [fallbackUrl]);

  const download = useCallback(() => {
    if (!file) return;
    setFallbackUrl(null);
    // No await before deliverPdf: the share sheet needs the tap's activation.
    deliverPdf(file, { title: input?.title ?? "" }).then((outcome) => {
      if (outcome === "failed") setFallbackUrl(URL.createObjectURL(file));
    });
  }, [file, input]);

  return { status, canDownload: Boolean(file), download, fallbackUrl, filename: file?.name ?? null };
}
