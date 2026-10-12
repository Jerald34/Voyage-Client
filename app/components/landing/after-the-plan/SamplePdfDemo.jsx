"use client";

import { useItineraryPdf } from "../../../hooks/useItineraryPdf.js";
import PdfDeliveryNotice from "../../ui/PdfDeliveryNotice";
import { DownloadIcon, PrinterIcon } from "../../icons/index.js";
import { buildDayLabel, buildTimeLabel } from "../../../lib/pdfExport.js";
import { describeDayWeather, describeStopWeather } from "../../../lib/weather/weatherDisplay.js";
import { SAMPLE_PDF_INPUT, getSampleDay, getSampleDayWeather } from "../sample/sampleTrip.js";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "../landingClasses.js";

const DAY = getSampleDay(2);
const ENTRY = getSampleDayWeather(DAY);
const DAY_LABEL = buildDayLabel(DAY);
const DAY_WEATHER = describeDayWeather(ENTRY)?.pdfText ?? "";

// pdfExport.js draws a navy day bar ("Day 2  ·  Sat, Oct 10, 2026  —  title") with the day's weather under it.
// Each stop is its time in a left column, then the title, then the stop's weather on its own line. The
// same helpers build the same strings, so this quotes the file.
const STOPS = DAY.items.map((item) => {
  const time = buildTimeLabel(item);
  return { id: item.id, time, title: item.title, weather: time ? describeStopWeather(ENTRY, item.id)?.pdfText ?? "" : "" };
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
        <p className="m-0 whitespace-pre-wrap text-sm font-semibold text-text-primary">{DAY_LABEL}</p>
        <p className="m-0 text-sm text-text-muted">{DAY_WEATHER}</p>
        {/* role="list": list-style:none drops list semantics in Safari/VoiceOver. */}
        <ol role="list" className="m-0 grid list-none gap-2 p-0">
          {STOPS.map((stop) => (
            <li key={stop.id} className="grid gap-0.5">
              {stop.time ? <p className="m-0 text-sm text-text-muted">{stop.time}</p> : null}
              <p className="m-0 text-sm font-semibold text-text-primary">{stop.title}</p>
              {stop.weather ? <p className="m-0 text-sm text-text-muted">{stop.weather}</p> : null}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
