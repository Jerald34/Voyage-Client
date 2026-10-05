"use client";

import Spinner from "../../../../components/ui/Spinner";
import { useItineraryPdf } from "../../../../hooks/useItineraryPdf.js";

/**
 * PDF button for the public share page. The PDF is built when the page loads,
 * so a tap hands a ready file to the device: the share sheet on iPhone/iPad, a
 * download elsewhere. If the device refuses, a plain link is offered instead.
 */
export default function PdfDownloadButton({ input, className = "" }) {
  const pdf = useItineraryPdf(input);
  const isPreparing = !pdf.canDownload && pdf.status !== "error";

  return (
    <div className={`grid justify-items-start gap-2 ${className}`.trim()}>
      <button
        type="button"
        onClick={pdf.download}
        disabled={!pdf.canDownload}
        aria-label="Download itinerary as PDF"
        className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-primary px-4 text-[13px] font-semibold text-on-primary shadow-soft transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
      >
        {isPreparing ? (
          <>
            <Spinner size="sm" />
            Preparing PDF…
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PDF
          </>
        )}
      </button>
      <div aria-live="polite" className="text-[12px] leading-[1.5] text-text-muted">
        {pdf.status === "error" ? <p className="m-0">We couldn&apos;t build the PDF. Reload the page to try again.</p> : null}
        {pdf.fallbackUrl ? (
          <p className="m-0">
            Your device didn&apos;t save it automatically.{" "}
            <a href={pdf.fallbackUrl} target="_blank" rel="noopener" className="font-semibold text-secondary-strong underline">
              Open the PDF
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}
