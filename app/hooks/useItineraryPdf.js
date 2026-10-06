"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generateItineraryPdf, titleToFilename } from "../lib/pdfExport.js";
import { deliverPdf } from "../lib/pdfDelivery.js";
import { printPdf } from "../lib/pdfPrint.js";

/**
 * Builds the itinerary PDF as soon as its content is known, so a tap can hand
 * the file to the device synchronously (lib/pdfDelivery.js explains why iOS
 * needs that). `download` saves it and `print` sends it to a printer; both use
 * the same file.
 *
 * @param {object|null} input generateItineraryPdf's argument; null until the
 *   itinerary has loaded. Memoize it: an unmemoized object rebuilds the PDF on
 *   every render, in an endless loop.
 * @returns {{ status: "idle"|"preparing"|"ready"|"error", canDownload: boolean,
 *   download: () => void, print: () => void, fallbackUrl: string|null,
 *   filename: string|null }}
 */
export function useItineraryPdf(input) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [fallbackUrl, setFallbackUrl] = useState(null);
  // Bumped whenever the input changes or the component unmounts, so a hand-off
  // that settles late can tell it belongs to a file nobody is looking at.
  const generationRef = useRef(0);

  useEffect(() => {
    generationRef.current += 1;
    // A rebuild must never leave the previous itinerary's file downloadable.
    setFile(null);
    setFallbackUrl(null);
    if (!input) {
      setStatus("idle");
      return undefined;
    }

    let cancelled = false;
    setStatus("preparing");
    // Deferred a tick so a quick input change, or StrictMode's double effect,
    // cancels the build before any jsPDF work starts.
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

    // This cleanup also runs on unmount, so it covers that case too.
    return () => {
      generationRef.current += 1;
      cancelled = true;
      clearTimeout(timer);
    };
  }, [input]);

  // Release the fallback link's object URL when it is replaced or the page unmounts.
  useEffect(() => {
    if (!fallbackUrl) return undefined;
    return () => URL.revokeObjectURL(fallbackUrl);
  }, [fallbackUrl]);

  const handOff = useCallback((deliver) => {
    if (!file) return;
    setFallbackUrl(null);
    const generation = generationRef.current;
    // No await before deliver: the share sheet and the fallback tab need the tap's activation.
    deliver(file, { title: input?.title ?? "" }).then((outcome) => {
      if (generation !== generationRef.current) return;
      if (outcome === "failed") setFallbackUrl(URL.createObjectURL(file));
    });
  }, [file, input]);

  const download = useCallback(() => handOff(deliverPdf), [handOff]);
  const print = useCallback(() => handOff(printPdf), [handOff]);

  return { status, canDownload: Boolean(file), download, print, fallbackUrl, filename: file?.name ?? null };
}
