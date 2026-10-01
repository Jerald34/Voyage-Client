import jsPDF from "jspdf";
import { describeDayWeather } from "./weather/weatherDisplay.js";

/**
 * Generates a styled PDF from itinerary data.
 * @param {Object} params
 * @param {string} params.title         - Trip title
 * @param {string} [params.summary]     - Itinerary summary paragraph
 * @param {string} [params.dateRange]   - Formatted date range string
 * @param {number} [params.travelerCount]
 * @param {Array}  params.days          - Array of day objects
 * @param {string} [params.agencyName]  - Agency branding name
 * @returns {jsPDF} The jsPDF document — caller does doc.save(filename)
 */
/**
 * Provider-only closure text for an exported document. Agency overlays are
 * deliberately not consulted here: an export is a client-facing artifact.
 */
function getProviderClosureLabel(businessStatus) {
  if (businessStatus === "CLOSED_PERMANENTLY") return "Permanently closed";
  if (businessStatus === "CLOSED_TEMPORARILY") return "Temporarily closed";
  return "";
}

export async function generateItineraryPdf({
  title,
  summary,
  dateRange,
  travelerCount,
  days,
  agencyName,
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth  = doc.internal.pageSize.getWidth();   // 210
  const pageHeight = doc.internal.pageSize.getHeight();  // 297
  const margin     = 20;
  const contentWidth = pageWidth - margin * 2;           // 170
  const brand = agencyName || "Voyage";

  let y = margin;

  /* ── helpers ──────────────────────────────────────────────── */

  function checkPageBreak(needed) {
    if (y + needed > pageHeight - 28) {
      addFooter();
      doc.addPage();
      y = margin;
    }
  }

  function addFooter() {
    const pageNum = doc.internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 160, 160);
    doc.text("Powered by Voyage", margin, pageHeight - 10);
    doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 10, {
      align: "right",
    });
    // reset colour for next content
    doc.setTextColor(30, 30, 30);
  }

  function drawLine(color = [220, 220, 220]) {
    doc.setDrawColor(...color);
    doc.line(margin, y, pageWidth - margin, y);
  }

  function writeWrapped(text, fontSize, fontStyle, color, lineHeightMm, extraBottom = 0) {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", fontStyle);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(text || ""), contentWidth);
    const blockHeight = lines.length * lineHeightMm + extraBottom;
    checkPageBreak(blockHeight);
    doc.text(lines, margin, y);
    y += blockHeight;
  }

  /* ── Page 1 header ────────────────────────────────────────── */

  // Agency / brand name
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(215, 122, 97); // voyage secondary
  doc.text(brand.toUpperCase(), margin, y);
  y += 7;

  // Trip title
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(34, 56, 67); // voyage primary
  const titleLines = doc.splitTextToSize(title || "Itinerary", contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 10 + 4;

  // Thin accent line under title
  doc.setDrawColor(215, 122, 97);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + 40, y);
  doc.setLineWidth(0.2);
  y += 8;

  // Meta row: date range + traveler count
  if (dateRange || travelerCount) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 110, 120);
    const metaParts = [];
    if (dateRange)     metaParts.push(dateRange);
    if (travelerCount) metaParts.push(`${travelerCount} ${travelerCount === 1 ? "traveler" : "travelers"}`);
    doc.text(metaParts.join("   •   "), margin, y);
    y += 8;
  }

  // Summary paragraph
  if (summary) {
    y += 3;
    writeWrapped(summary, 10.5, "normal", [60, 80, 90], 5.5, 6);
  }

  // Separator before days
  y += 4;
  doc.setDrawColor(200, 210, 215);
  doc.setLineWidth(0.3);
  drawLine([200, 210, 215]);
  y += 8;

  /* ── Day-by-day content ───────────────────────────────────── */

  const safeDays = Array.isArray(days) ? days : [];

  for (let di = 0; di < safeDays.length; di++) {
    const day = safeDays[di];

    // Day header
    const dayLabel = `Day ${day.dayNumber || di + 1}  —  ${day.title || ""}`;
    const weatherText = describeDayWeather(day.weatherEntry)?.pdfText ?? "";
    // splitTextToSize measures at the current font, so set the size it is drawn in first.
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    const weatherLines = weatherText ? doc.splitTextToSize(weatherText, contentWidth) : [];
    // The weather line is measured BEFORE the break check, like the closure line.
    checkPageBreak(14 + weatherLines.length * 4.5);

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(34, 56, 67);
    doc.text(dayLabel, margin, y);
    y += 6;

    // Day date
    if (day.date) {
      const formatted = formatDateForPdf(day.date);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(130, 150, 160);
      doc.text(formatted, margin, y);
      y += 5;
    }

    // Day weather (forecast or typical)
    if (weatherLines.length > 0) {
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(70, 110, 140);
      doc.text(weatherLines, margin, y);
      y += weatherLines.length * 4.5;
    }

    // Day summary
    if (day.summary) {
      y += 1;
      writeWrapped(day.summary, 9.5, "italic", [100, 120, 130], 4.8, 4);
    }

    y += 3;

    // Items
    const safeItems = Array.isArray(day.items) ? day.items : [];
    for (let ii = 0; ii < safeItems.length; ii++) {
      const item = safeItems[ii];

      // Time label
      const timeStr = buildTimeLabel(item);

      // Estimate block height for page-break check
      const titleLines  = doc.splitTextToSize(item.title || "Activity", contentWidth - 4);
      const descLines   = item.description
        ? doc.splitTextToSize(item.description, contentWidth - 8)
        : [];
      const placeLines  = item.placeSnapshot?.name
        ? doc.splitTextToSize(item.placeSnapshot.name, contentWidth - 8)
        : [];
      const addrLines   = item.placeSnapshot?.formattedAddress
        ? doc.splitTextToSize(item.placeSnapshot.formattedAddress, contentWidth - 8)
        : [];

      // Provider closure only. Staff notes and agency overlays are internal and
      // must never reach an exported client document.
      const closureText = getProviderClosureLabel(item.placeSnapshot?.businessStatus);
      const closureLines = closureText
        ? doc.splitTextToSize(closureText, contentWidth - 8)
        : [];

      const estimatedHeight =
        (timeStr ? 5 : 0) +
        titleLines.length * 5.5 +
        descLines.length * 4.5 +
        placeLines.length * 4.5 +
        addrLines.length * 4 +
        // Counted BEFORE the page-break check: a line drawn but not measured is
        // exactly how an item overflows the bottom of a page.
        closureLines.length * 4 +
        8; // padding

      checkPageBreak(estimatedHeight);

      // Dot indicator
      doc.setFillColor(215, 122, 97);
      doc.circle(margin + 1.5, y - 1.5, 1.5, "F");

      // Time
      if (timeStr) {
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(140, 155, 165);
        doc.text(timeStr, margin + 6, y);
        y += 4.5;
      }

      // Activity title (bold)
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(34, 56, 67);
      doc.text(titleLines, margin + 6, y);
      y += titleLines.length * 5.5;

      // Description
      if (descLines.length > 0) {
        doc.setFontSize(9.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(70, 90, 100);
        doc.text(descLines, margin + 10, y);
        y += descLines.length * 4.5 + 1;
      }

      // Place name
      if (placeLines.length > 0) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 120, 130);
        doc.text(placeLines, margin + 10, y);
        y += placeLines.length * 4.5;
      }

      // Address
      if (addrLines.length > 0) {
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(140, 155, 165);
        doc.text(addrLines, margin + 10, y);
        y += addrLines.length * 4 + 1;
      }

      // Provider closure notice
      if (closureLines.length > 0) {
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(146, 64, 14);
        doc.text(closureLines, margin + 10, y);
        y += closureLines.length * 4 + 1;
      }

      y += 5; // spacing between items
    }

    // Separator between days (not after last)
    if (di < safeDays.length - 1) {
      checkPageBreak(10);
      doc.setDrawColor(220, 228, 232);
      doc.setLineWidth(0.25);
      drawLine([220, 228, 232]);
      y += 8;
    }
  }

  // Open-Meteo's free API is CC-BY 4.0: credit it when any day shows weather.
  if (safeDays.some((day) => describeDayWeather(day?.weatherEntry))) {
    checkPageBreak(8);
    y += 2;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 160, 170);
    doc.text("Weather data by Open-Meteo.com", margin, y);
    y += 4;
  }

  /* ── Final footer ─────────────────────────────────────────── */
  addFooter();

  return doc;
}

/* ── internal helpers ──────────────────────────────────────── */

function formatDateForPdf(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month:   "short",
      day:     "numeric",
      year:    "numeric",
    });
  } catch {
    return dateStr;
  }
}

function buildTimeLabel(item) {
  const fmt = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hour = parseInt(h, 10);
    if (isNaN(hour)) return t;
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${m} ${ampm}`;
  };

  // Support both {startTime, endTime} and {time} shapes
  if (item.startTime && item.endTime) return `${fmt(item.startTime)} – ${fmt(item.endTime)}`;
  if (item.startTime) return fmt(item.startTime);
  if (item.endTime)   return `Ends ${fmt(item.endTime)}`;
  if (typeof item.time === "string" && item.time.trim()) return item.time;
  return "";
}

/**
 * Converts a trip title to a safe filename slug.
 * e.g. "Tokyo Adventure!" → "tokyo-adventure-itinerary.pdf"
 */
export function titleToFilename(title) {
  const slug = (title || "itinerary")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug}-itinerary.pdf`;
}
