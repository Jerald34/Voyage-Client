/**
 * The polite live region beside a PDF button: what to tell the person when the
 * PDF could not be built, or when their device refused to save it and a plain
 * link is the way out. Empty (and, with `empty:mt-0`, spaceless) the rest of the
 * time. Import it by this path: the dashboard page tests mock ui/index.js.
 *
 * @param {"idle"|"preparing"|"ready"|"error"} status useItineraryPdf's status
 * @param {string|null} fallbackUrl useItineraryPdf's fallbackUrl
 * @param {string} [className] spacing from the caller
 */
export default function PdfDeliveryNotice({ status, fallbackUrl, className = "" }) {
  return (
    <div aria-live="polite" className={`text-[12px] leading-[1.5] text-text-muted ${className}`.trim()}>
      {status === "error" ? <p className="m-0">We couldn&apos;t build the PDF. Reload the page to try again.</p> : null}
      {fallbackUrl ? (
        <p className="m-0">
          Your device didn&apos;t save it automatically.{" "}
          <a href={fallbackUrl} target="_blank" rel="noopener" className="font-semibold text-secondary-strong underline">
            Open the PDF
          </a>
        </p>
      ) : null}
    </div>
  );
}
