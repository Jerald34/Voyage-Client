import jsPDF from "jspdf";
import { describeDayWeather, describeStopWeather } from "./weather/weatherDisplay.js";
import { getAccessibilityBadges, getAccessibilityPdfText } from "./accessibility/placeAccessibility.js";
import { getSnapshotPhotoUrl } from "./trip-dashboard/richItinerary.js";
import { loadPdfImages, pdfPhotoUrl } from "./pdfImages.js";

/** Voyage's wordmark: the file the emails use, so the PDF and the inbox match. */
export const VOYAGE_LOGO_PATH = "/email/voyage-logo.png";

// Brand colours (docs/brand/logo/kit/GUIDELINES.md) as jsPDF RGB triples.
const NAVY = [34, 56, 67];
const TERRACOTTA = [215, 122, 97];
const MUTED = [90, 110, 120];
const SOFT = [100, 116, 126]; // ~4.8:1 on white, so small print stays legible on paper
const WEATHER_BLUE = [70, 110, 140];
const HAIRLINE = [220, 228, 232];
const WHITE = [255, 255, 255];
const CLOSURE_AMBER = [146, 64, 14];

// Layout in mm on A4 portrait (210 × 297).
const MARGIN = 20;
const CONTENT_BOTTOM_GAP = 28; // content stops 28mm above the edge; the footer sits below it
const TIME_COLUMN_WIDTH = 22;
const STOP_TEXT_OFFSET = 26; // a stop's text starts this far right of the margin
const PHOTO_WIDTH = 26;
const PHOTO_HEIGHT = 19.5;
const PHOTO_GAP = 4;
const LOGO_HEIGHT = 9;
const LOGO_MAX_WIDTH = 45;
const STOP_GAP = 5;

/**
 * Provider-only closure text for an exported document. Agency overlays are
 * deliberately not consulted here: an export is a client-facing artifact.
 */
function getProviderClosureLabel(businessStatus) {
  if (businessStatus === "CLOSED_PERMANENTLY") return "Permanently closed";
  if (businessStatus === "CLOSED_TEMPORARILY") return "Temporarily closed";
  return "";
}

// Same status logic as the on-screen badges: a caution is amber (matching the closure line),
// an unchecked-in-practice place is neutral grey, confirmed features are green.
const PDF_ACCESSIBILITY_COLORS = { warning: [146, 64, 14], unverified: [100, 116, 126], positive: [21, 94, 67] };

function getAccessibilityPdfColor(snapshot) {
  const badges = getAccessibilityBadges(snapshot);
  if (badges.some((badge) => badge.tone === "warning")) return PDF_ACCESSIBILITY_COLORS.warning;
  if (badges.length > 0 && badges.every((badge) => badge.key === "unverified")) return PDF_ACCESSIBILITY_COLORS.unverified;
  return PDF_ACCESSIBILITY_COLORS.positive;
}

function isVoyageBrand(agencyName) {
  const name = String(agencyName ?? "").trim();
  return name === "" || name === "Voyage";
}

function stopPhotoUrl(item) {
  const url = getSnapshotPhotoUrl(item?.placeSnapshot);
  return url ? pdfPhotoUrl(url) : "";
}

function defaultLoadImages(urls, options) {
  return loadPdfImages(urls, { options });
}

/**
 * Generates the branded itinerary PDF (capstone panel item 7, layout A).
 * @param {Object} params
 * @param {string} params.title          - Trip title
 * @param {string} [params.summary]      - Itinerary summary paragraph
 * @param {string} [params.dateRange]    - Formatted date range string
 * @param {number} [params.travelerCount]
 * @param {Array}  params.days           - Day objects ({ dayNumber, title, date, summary, items, weatherEntry })
 * @param {string} [params.agencyName]   - Brand; empty or "Voyage" means Voyage's own brand
 * @param {string} [params.clientName]   - Printed as "Prepared for …"
 * @param {string} [params.logoUrl]      - The agency's logo; without one an agency prints its name only
 * @param {Function} [params.loadImages] - (urls, options) => Promise<Map<url, image|null>>; tests inject one
 * @returns {Promise<jsPDF>} The document; the caller saves or prints it
 */
export async function generateItineraryPdf({
  title,
  summary,
  dateRange,
  travelerCount,
  days,
  agencyName,
  clientName,
  logoUrl,
  loadImages = defaultLoadImages,
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const contentWidth = pageWidth - MARGIN * 2; // 170
  const voyageBrand = isVoyageBrand(agencyName);
  const brandName = voyageBrand ? "Voyage" : String(agencyName).trim();
  const safeDays = Array.isArray(days) ? days : [];
  const itemsOf = (day) => (Array.isArray(day?.items) ? day.items.filter(Boolean) : []);

  // Images load before drawing; any that fail come back null and print as nothing.
  // A loader that throws outright costs the images, never the PDF.
  const loadOrNone = (urls, options) =>
    Promise.resolve()
      .then(() => loadImages(urls, options))
      .then((result) => (result instanceof Map ? result : new Map()))
      .catch(() => new Map());
  const logoSource = logoUrl || (voyageBrand ? VOYAGE_LOGO_PATH : "");
  const [logos, photos] = await Promise.all([
    loadOrNone(logoSource ? [logoSource] : [], { width: 600, height: 200, fit: "contain", format: "png" }),
    loadOrNone(
      safeDays.flatMap((day) => itemsOf(day).map(stopPhotoUrl)).filter(Boolean),
      { width: 320, height: 240, fit: "cover", format: "jpeg" },
    ),
  ]);
  const logo = logoSource ? logos.get(logoSource) ?? null : null;

  let y = MARGIN;

  /* ── helpers ──────────────────────────────────────────────── */

  /** Starts a new page when `needed` mm won't fit; returns whether it did. */
  function checkPageBreak(needed) {
    if (y + needed > pageHeight - CONTENT_BOTTOM_GAP) {
      doc.addPage();
      y = MARGIN;
      return true;
    }
    return false;
  }

  function setStyle(fontSize, fontStyle, color) {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", fontStyle);
    doc.setTextColor(...color);
  }

  // splitTextToSize measures at the current font, so every measurement sets the font it is drawn in.
  function splitAt(value, fontSize, fontStyle, width) {
    if (!value) return [];
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", fontStyle);
    return doc.splitTextToSize(value, width);
  }

  // Trimmed, so a trailing space or newline never counts as an extra line.
  function measure(text, fontSize, fontStyle, width) {
    return splitAt(String(text ?? "").trim(), fontSize, fontStyle, width);
  }

  function oneLine(text, fontSize, fontStyle, width) {
    const lines = measure(text, fontSize, fontStyle, width);
    if (lines.length <= 1) return lines[0] ?? "";
    return `${String(lines[0]).trimEnd()}…`;
  }

  function drawRule(color) {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.25);
    doc.line(MARGIN, y, pageWidth - MARGIN, y);
  }

  function writeWrapped(text, fontSize, fontStyle, color, lineHeightMm, extraBottom = 0) {
    const lines = measure(text, fontSize, fontStyle, contentWidth);
    const blockHeight = lines.length * lineHeightMm + extraBottom;
    checkPageBreak(blockHeight);
    setStyle(fontSize, fontStyle, color);
    doc.text(lines, MARGIN, y);
    y += blockHeight;
  }

  /* ── At a glance: one row per day ─────────────────────────── */

  function drawAtAGlance() {
    const weatherByDay = safeDays.map((day) => describeDayWeather(day?.weatherEntry));
    const showWeather = weatherByDay.some(Boolean);
    // Column x offsets from the margin.
    const cols = showWeather
      ? { day: 0, date: 12, plan: 34, stops: 104, weather: 120 }
      : { day: 0, date: 12, plan: 34, stops: 150 };
    const planWidth = cols.stops - cols.plan - 4;
    const weatherWidth = showWeather ? contentWidth - cols.weather : 0;

    function drawHeaderRow() {
      setStyle(8, "bold", SOFT);
      doc.text("Day", MARGIN + cols.day, y);
      doc.text("Date", MARGIN + cols.date, y);
      doc.text("Plan", MARGIN + cols.plan, y);
      doc.text("Stops", MARGIN + cols.stops, y);
      if (showWeather) doc.text("Weather", MARGIN + cols.weather, y);
      y += 2;
      drawRule(HAIRLINE);
      y += 4.5;
    }

    checkPageBreak(12 + 5.5 * Math.min(safeDays.length, 3));
    setStyle(11, "bold", NAVY);
    doc.text("At a glance", MARGIN, y);
    y += 6;
    drawHeaderRow();

    safeDays.forEach((day, index) => {
      // A table that runs onto a new page repeats its header row there.
      if (checkPageBreak(5.5)) drawHeaderRow();
      const plan = oneLine(day?.title, 8.5, "normal", planWidth);
      const weatherCell = showWeather && weatherByDay[index]
        ? oneLine(weatherByDay[index].compactText || weatherByDay[index].label, 8.5, "normal", weatherWidth)
        : "";
      const shortDate = formatShortDate(day?.date);

      setStyle(8.5, "bold", NAVY);
      doc.text(String(day?.dayNumber || index + 1), MARGIN + cols.day, y);
      setStyle(8.5, "normal", MUTED);
      if (shortDate) doc.text(shortDate, MARGIN + cols.date, y);
      if (plan) doc.text(plan, MARGIN + cols.plan, y);
      doc.text(String(itemsOf(day).length), MARGIN + cols.stops, y);
      if (weatherCell) doc.text(weatherCell, MARGIN + cols.weather, y);
      y += 5.5;
    });
  }

  /* ── One stop: time column, text, photo on the right ───────── */

  // A time range too wide for the column breaks after its dash ("9:00 AM –" over
  // "10:30 AM") rather than inside a time ("9:00 AM – 10:30" over "AM").
  function measureTimeColumn(label) {
    const lines = measure(label, 8.5, "normal", TIME_COLUMN_WIDTH);
    const range = /^(.+?) – (.+)$/.exec(label);
    if (lines.length <= 1 || !range) return lines;
    // The first part keeps its trailing space, so the two lines still read as one
    // range when the text is extracted ("9:00 AM – 10:30 AM"); it prints as nothing.
    return [
      ...splitAt(`${range[1]} – `, 8.5, "normal", TIME_COLUMN_WIDTH),
      ...measure(range[2], 8.5, "normal", TIME_COLUMN_WIDTH),
    ].filter((line) => String(line).trim());
  }

  // Measures a stop at the fonts it is drawn in. The day bar uses it to keep its first stop with it.
  function measureStop(day, item) {
    const snapshot = item?.placeSnapshot;
    const timeLabel = buildTimeLabel(item);
    // The stop's weather only exists when the day has hourly timing for its time slot.
    const stopWeather = timeLabel ? describeStopWeather(day?.weatherEntry, item?.id)?.pdfText ?? "" : "";
    const photo = photos.get(stopPhotoUrl(item)) ?? null;
    const textX = MARGIN + STOP_TEXT_OFFSET;
    const textWidth = contentWidth - STOP_TEXT_OFFSET - (photo ? PHOTO_WIDTH + PHOTO_GAP : 0);
    const title = item?.title || "Activity";
    const placeName = snapshot?.name && snapshot.name !== title ? snapshot.name : "";

    const timeLines = measureTimeColumn(timeLabel);
    const titleLines = measure(title, 10.5, "bold", textWidth);
    const weatherLines = measure(stopWeather, 8.5, "normal", textWidth);
    const descLines = measure(item?.description, 9.5, "normal", textWidth);
    const placeLines = measure(placeName, 9, "bold", textWidth);
    const addrLines = measure(snapshot?.formattedAddress, 8.5, "normal", textWidth);
    // Provider closure only. Staff notes and agency overlays are internal and
    // must never reach an exported client document.
    const closureLines = measure(getProviderClosureLabel(snapshot?.businessStatus), 8.5, "bold", textWidth);
    // Public provider data only. The traveler's own needs never reach an export.
    const accessibilityLines = measure(getAccessibilityPdfText(snapshot), 8.5, "normal", textWidth);

    const textHeight =
      titleLines.length * 5.5 +
      (weatherLines.length ? weatherLines.length * 4 + 1 : 0) +
      (descLines.length ? descLines.length * 4.5 + 1 : 0) +
      placeLines.length * 4.5 +
      (addrLines.length ? addrLines.length * 4 + 1 : 0) +
      (closureLines.length ? closureLines.length * 4 + 1 : 0) +
      (accessibilityLines.length ? accessibilityLines.length * 4 + 1 : 0);
    const blockHeight = Math.max(textHeight, timeLines.length * 4, photo ? PHOTO_HEIGHT + 1 : 0);
    return {
      snapshot, photo, textX, timeLines, titleLines, weatherLines, descLines,
      placeLines, addrLines, closureLines, accessibilityLines, blockHeight,
    };
  }

  function drawStop(day, item) {
    const {
      snapshot, photo, textX, timeLines, titleLines, weatherLines, descLines,
      placeLines, addrLines, closureLines, accessibilityLines, blockHeight,
    } = measureStop(day, item);
    // Every line is counted BEFORE the page-break check: a line drawn but not
    // measured is exactly how an item overflows the bottom of a page.
    checkPageBreak(blockHeight + STOP_GAP);

    const top = y;
    if (timeLines.length > 0) {
      setStyle(8.5, "normal", SOFT);
      doc.text(timeLines, MARGIN, top);
    }
    doc.setFillColor(...TERRACOTTA);
    doc.circle(textX - 3, top - 1.4, 1.1, "F");
    if (photo) {
      doc.addImage(photo.dataUrl, photo.format, pageWidth - MARGIN - PHOTO_WIDTH, top - 3.5, PHOTO_WIDTH, PHOTO_HEIGHT);
    }

    setStyle(10.5, "bold", NAVY);
    doc.text(titleLines, textX, y);
    y += titleLines.length * 5.5;

    if (weatherLines.length > 0) {
      setStyle(8.5, "normal", WEATHER_BLUE);
      doc.text(weatherLines, textX, y);
      y += weatherLines.length * 4 + 1;
    }
    if (descLines.length > 0) {
      setStyle(9.5, "normal", [70, 90, 100]);
      doc.text(descLines, textX, y);
      y += descLines.length * 4.5 + 1;
    }
    if (placeLines.length > 0) {
      setStyle(9, "bold", [100, 120, 130]);
      doc.text(placeLines, textX, y);
      y += placeLines.length * 4.5;
    }
    if (addrLines.length > 0) {
      setStyle(8.5, "normal", SOFT);
      doc.text(addrLines, textX, y);
      y += addrLines.length * 4 + 1;
    }
    if (closureLines.length > 0) {
      setStyle(8.5, "bold", CLOSURE_AMBER);
      doc.text(closureLines, textX, y);
      y += closureLines.length * 4 + 1;
    }
    if (accessibilityLines.length > 0) {
      setStyle(8.5, "normal", getAccessibilityPdfColor(snapshot));
      doc.text(accessibilityLines, textX, y);
      y += accessibilityLines.length * 4 + 1;
    }

    y = Math.max(y, top + blockHeight) + STOP_GAP;
  }

  /* ── Page 1 header ────────────────────────────────────────── */

  // Brand row: the logo, then the agency's name. The Voyage wordmark already reads "Voyage".
  let brandX = MARGIN;
  if (logo) {
    const logoWidth = Math.min(LOGO_MAX_WIDTH, (LOGO_HEIGHT * logo.width) / logo.height);
    doc.addImage(logo.dataUrl, logo.format, MARGIN, y - 6, logoWidth, LOGO_HEIGHT);
    brandX += logoWidth + 4;
  }
  if (!(voyageBrand && logo)) {
    setStyle(10, "bold", TERRACOTTA);
    doc.text(brandName.toUpperCase(), brandX, y);
  }
  y += logo ? 12 : 7;

  // Trip title
  const titleLines = measure(title || "Itinerary", 26, "bold", contentWidth);
  setStyle(26, "bold", NAVY);
  doc.text(titleLines, MARGIN, y);
  y += titleLines.length * 10 + 4;

  // Thin accent line under title
  doc.setDrawColor(...TERRACOTTA);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, MARGIN + 40, y);
  doc.setLineWidth(0.2);
  y += 8;

  // Meta row: dates, travelers and who the trip is for
  const metaParts = [];
  if (dateRange) metaParts.push(dateRange);
  if (travelerCount) metaParts.push(`${travelerCount} ${travelerCount === 1 ? "traveler" : "travelers"}`);
  const client = String(clientName ?? "").trim();
  if (client) metaParts.push(`Prepared for ${client}`);
  if (metaParts.length > 0) {
    const metaLines = measure(metaParts.join("   •   "), 10, "normal", contentWidth);
    setStyle(10, "normal", MUTED);
    doc.text(metaLines, MARGIN, y);
    y += metaLines.length * 5 + 3;
  }

  // Summary paragraph
  if (summary) {
    y += 3;
    writeWrapped(summary, 10.5, "normal", [60, 80, 90], 5.5, 6);
  }

  if (safeDays.length >= 2) {
    y += 2;
    drawAtAGlance();
  }

  // Separator before days; it moves to the next page with the gap below it.
  y += 4;
  checkPageBreak(12);
  drawRule([200, 210, 215]);
  y += 8;

  /* ── Day-by-day content ───────────────────────────────────── */

  safeDays.forEach((day, di) => {
    const dayDate = formatLongDate(day?.date);
    const dayTitle = String(day?.title ?? "").trim();
    let dayLabel = `Day ${day?.dayNumber || di + 1}`;
    if (dayDate) dayLabel += `  ·  ${dayDate}`;
    if (dayTitle) dayLabel += `  —  ${dayTitle}`;
    const labelLines = measure(dayLabel, 11, "bold", contentWidth - 8);
    const weatherLines = measure(describeDayWeather(day?.weatherEntry)?.pdfText ?? "", 8.5, "normal", contentWidth);
    const barHeight = 3 + labelLines.length * 5;
    const summaryLines = measure(day?.summary, 9.5, "italic", contentWidth);
    const summaryHeight = summaryLines.length ? 1 + summaryLines.length * 4.8 + 4 : 0;
    const firstItem = itemsOf(day)[0];
    const firstStopHeight = firstItem ? measureStop(day, firstItem).blockHeight + STOP_GAP : 0;
    // The bar, its weather line, the day summary and the first stop move to a new
    // page together, so a bar is never stranded at a page's foot. Capped at one
    // page of content so an outsized day can't produce a blank page.
    const headerBlock = barHeight + 5 + weatherLines.length * 4.5 + summaryHeight + 3 + Math.max(13, firstStopHeight);
    checkPageBreak(Math.min(headerBlock, pageHeight - CONTENT_BOTTOM_GAP - MARGIN));

    doc.setFillColor(...NAVY);
    doc.roundedRect(MARGIN, y, contentWidth, barHeight, 1.5, 1.5, "F");
    setStyle(11, "bold", WHITE);
    doc.text(labelLines, MARGIN + 4, y + 5.2);
    y += barHeight + 5;

    // Day weather (forecast or typical), right under the bar
    if (weatherLines.length > 0) {
      setStyle(8.5, "normal", WEATHER_BLUE);
      doc.text(weatherLines, MARGIN, y);
      y += weatherLines.length * 4.5;
    }

    if (summaryLines.length > 0) {
      y += 1;
      writeWrapped(day.summary, 9.5, "italic", [100, 120, 130], 4.8, 4);
    }
    y += 3;

    itemsOf(day).forEach((item) => drawStop(day, item));
    y += 4;
  });

  // Open-Meteo's free API is CC-BY 4.0: credit it when any day shows weather.
  if (safeDays.some((day) => describeDayWeather(day?.weatherEntry))) {
    checkPageBreak(8);
    y += 2;
    setStyle(7.5, "normal", [110, 120, 130]);
    doc.text("Weather data by Open-Meteo.com", MARGIN, y);
    y += 4;
  }

  /* ── Footer on every page: brand left, "Page N of M" right ─── */

  const pageCount = doc.internal.getNumberOfPages();
  const footerBrand = voyageBrand ? "Planned with Voyage" : `${brandName}  ·  Planned with Voyage`;
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...HAIRLINE);
    doc.setLineWidth(0.25);
    doc.line(MARGIN, pageHeight - 15, pageWidth - MARGIN, pageHeight - 15);
    setStyle(8, "normal", [110, 110, 110]);
    doc.text(footerBrand, MARGIN, pageHeight - 10);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - MARGIN, pageHeight - 10, { align: "right" });
  }

  return doc;
}

/* ── internal helpers ──────────────────────────────────────── */

/** Reads "2026-10-08" (or an ISO timestamp) as that calendar day in local time, so no time zone shifts it. */
function parsePdfDate(value) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Thu, Oct 8, 2026" */
function formatLongDate(value) {
  const date = parsePdfDate(value);
  return date ? date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "";
}

/** "Oct 8" */
function formatShortDate(value) {
  const date = parsePdfDate(value);
  return date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
}

function buildTimeLabel(item) {
  if (!item) return "";
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
  if (item.endTime) return `Ends ${fmt(item.endTime)}`;
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
