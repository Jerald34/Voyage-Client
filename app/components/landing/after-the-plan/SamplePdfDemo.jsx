"use client";

import { useItineraryPdf } from "../../../hooks/useItineraryPdf.js";
import PdfDeliveryNotice from "../../ui/PdfDeliveryNotice";
import { DownloadIcon, PrinterIcon } from "../../icons/index.js";
import { formatTimeRange } from "../../../itinerary/view/[token]/components/stopDisplay.jsx";
import { describeDayWeather, describeStopWeather } from "../../../lib/weather/weatherDisplay.js";
import { SAMPLE_PDF_INPUT, getSampleDay, getSampleDayWeather } from "../sample/sampleTrip.js";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "../landingClasses.js";

const DAY = getSampleDay(2);
const ENTRY = getSampleDayWeather(DAY);
const DAY_LINE = describeDayWeather(ENTRY)?.pdfText ?? "";

// pdfExport.js prints each stop as its time followed by the stop's weather ("1:30 PM – 3:00 PM  ·  Rain
// likely (…)"), then the title on the line below. Same helpers, same order, so this quotes the file.
const STOPS = DAY.items.map((item) => {
  const time = formatTimeRange(item.startTime, item.endTime);
  const weather = time ? describeStopWeather(ENTRY, item.id)?.pdfText : "";
  return { id: item.id, title: item.title, line: weather ? `${time} · ${weather}` : time };
});

const BUTTON_DISABLED = "disabled:cursor-not-allowed disabled:opacity-60";

/** Builds the real PDF of the sample trip (jsPDF loads with this chunk) and quotes what it says. */
export default function SamplePdfDemo() {
  const pdf = useItineraryPdf(SAMPLE_PDF_INPUT);
  const isPreparing = !pdf.canDownload && pdf.status !== "error";

  return (
    <div className="grid gap-4 rounded-[18px] border border-border/15 bg-surface p-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={pdf.download} disabled={!pdf.canDownload} className={`${PRIMARY_BUTTON} ${BUTTON_DISABLED}`}>
          <DownloadIcon width={14} height={14} aria-hidden="true" />
          {isPreparing ? "Preparing PDF…" : "Download PDF"}
        </button>
        <button type="button" onClick={pdf.print} disabled={!pdf.canDownload} className={`${SECONDARY_BUTTON} ${BUTTON_DISABLED}`}>
          <PrinterIcon width={14} height={14} aria-hidden="true" />
          Print
        </button>
      </div>
      <PdfDeliveryNotice status={pdf.status} fallbackUrl={pdf.fallbackUrl} />
      <div className="grid gap-2 rounded-md border border-border/15 bg-background px-4 py-3">
        <p className="m-0 text-[12px] font-semibold text-text-muted">What the PDF says for day 2</p>
        <p className="m-0 text-sm font-semibold text-text-primary">
          Day {DAY.dayNumber} · {DAY.title}
        </p>
        <p className="m-0 text-sm text-text-muted">{DAY_LINE}</p>
        {/* role="list": list-style:none drops list semantics in Safari/VoiceOver. */}
        <ol role="list" className="m-0 grid list-none gap-2 p-0">
          {STOPS.map((stop) => (
            <li key={stop.id} className="grid gap-0.5">
              <p className="m-0 text-sm text-text-muted">{stop.line}</p>
              <p className="m-0 text-sm font-semibold text-text-primary">{stop.title}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
