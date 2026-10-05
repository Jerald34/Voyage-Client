import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// jsdom replaces the global URL, so resolve from import.meta.dirname (see theme-safe-classes.test.js).
const ROOT = resolve(import.meta.dirname, "..");

// globals.css sets h1–h4 in DM Serif Display, which ships one weight (400); asking it
// for semibold or heavier makes the browser fake the bold. The dashboard's rule
// (Design decision 6): the serif, at 400, only for a page's main title; Plus Jakarta
// Sans semibold for every other heading.
const SHARE_DIR = "app/itinerary/view/[token]";
const SCOPED_FILES = [
  "app/components/trip-dashboard/pages/ClientList.jsx",
  "app/components/trip-dashboard/pages/ClientItineraryPage.jsx",
  "app/components/trip-dashboard/pages/ItineraryHeader.jsx",
  "app/components/trip-dashboard/pages/ItineraryDayView.jsx",
  "app/components/trip-dashboard/mobile/CompactPlaceCard.jsx",
  "app/components/trip-dashboard/itinerary/ShareDialog.jsx",
  "app/agency/[agencyId]/components/dashboard/TripSlideOver.jsx",
  "app/agency/[agencyId]/components/dashboard/widgets/FunnelStageDetailPanel.jsx",
  ...sourceFiles(SHARE_DIR),
];

// [file, heading content as written in the JSX, expected font]
const EXPECTED = [
  ["app/components/trip-dashboard/pages/ClientList.jsx", "Client Directory", "sans"],
  ["app/components/trip-dashboard/pages/ClientItineraryPage.jsx", "Client Directory", "sans"],
  ["app/components/trip-dashboard/pages/ClientItineraryPage.jsx", "{selectedClient.name}", "serif"],
  ["app/components/trip-dashboard/pages/ClientItineraryPage.jsx", "No saved itineraries yet.", "serif"],
  ["app/components/trip-dashboard/pages/ItineraryHeader.jsx", "{selectedClient.name}", "serif"],
  ["app/components/trip-dashboard/pages/ItineraryDayView.jsx", "{selectedDay.title}", "sans"],
  ["app/components/trip-dashboard/pages/ItineraryDayView.jsx", "{item.title || placeName}", "sans"],
  ["app/components/trip-dashboard/itinerary/ShareDialog.jsx", "{tripTitle || \"Itinerary\"}", "serif"],
  ["app/components/trip-dashboard/itinerary/ShareDialog.jsx", "Existing Share Links", "sans"],
  ["app/agency/[agencyId]/components/dashboard/TripSlideOver.jsx", "{tripTitle}", "sans"],
  ["app/agency/[agencyId]/components/dashboard/widgets/FunnelStageDetailPanel.jsx", "{label}", "sans"],
  [`${SHARE_DIR}/page.jsx`, "{trip.title || itinerary.title}", "serif"],
  [`${SHARE_DIR}/page.jsx`, "{day.title}", "sans"],
  [`${SHARE_DIR}/page.jsx`, "General Feedback", "sans"],
  [`${SHARE_DIR}/components/ShareStopCard.jsx`, "{item.title}", "sans"],
  [`${SHARE_DIR}/components/ProposalRating.jsx`, "Rate this proposal", "sans"],
];

// Includes arbitrary weights (font-[600]); `\b` can't end the pattern there, as "]" is not a word character.
const BOLD = /\bfont-(?:(?:semibold|bold|extrabold|black)\b|\[[6-9]00\])/;

function sourceFiles(dir) {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) return sourceFiles(rel);
    return /\.(jsx?|tsx?)$/.test(name) ? [rel] : [];
  });
}

const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

// Every <h1>–<h6> element: its tag, its attribute text, and its content on one line.
// Attributes may hold `{…}` expressions with a ">" inside (e.g. `onClick={() => …}`),
// so a brace group is consumed whole instead of stopping at its first ">".
function headings(rel) {
  return [...read(rel).matchAll(/<(h[1-6])\b((?:[^>{]|\{[^}]*\})*)>([\s\S]*?)<\/\1>/g)].map(([, tag, attrs, inner]) => ({
    tag,
    attrs,
    text: inner.replace(/\s+/g, " ").trim(),
  }));
}

describe("heading typography", () => {
  it("never asks DM Serif Display for a bold weight", () => {
    const offenders = SCOPED_FILES.flatMap((rel) =>
      read(rel)
        .split("\n")
        .flatMap((line, index) => (/\bfont-serif\b/.test(line) && BOLD.test(line) ? [`${rel}:${index + 1}  ${line.trim()}`] : [])),
    );
    expect(offenders).toEqual([]);
  });

  it("gives every bold h1–h4 the sans font, since globals.css makes them serif", () => {
    const offenders = SCOPED_FILES.flatMap((rel) =>
      headings(rel)
        .filter(({ tag, attrs }) => /^h[1-4]$/.test(tag) && BOLD.test(attrs) && !/\bfont-sans\b/.test(attrs))
        .map(({ tag, text }) => `${rel} <${tag}> ${text}`),
    );
    expect(offenders).toEqual([]);
  });

  // A className expression (className={...}) is invisible to the checks above unless it
  // spells its font out, so one that doesn't could hide a bold serif heading.
  it("makes every h1–h4 with a computed className spell font-sans or font-serif", () => {
    const offenders = SCOPED_FILES.flatMap((rel) =>
      headings(rel)
        .filter(({ tag, attrs }) => /^h[1-4]$/.test(tag) && /\bclassName=\{/.test(attrs) && !/\bfont-(sans|serif)\b/.test(attrs))
        .map(({ tag, text }) => `${rel} <${tag}> ${text}`),
    );
    expect(offenders).toEqual([]);
  });

  it.each(EXPECTED)("%s: %s is %s", (rel, text, font) => {
    const matches = headings(rel).filter((heading) => heading.text === text);
    expect(matches.length).toBeGreaterThan(0);
    for (const { attrs } of matches) {
      if (font === "sans") {
        expect(attrs).toMatch(/\bfont-sans\b/);
        expect(attrs).toMatch(/\bfont-semibold\b/);
      } else {
        expect(attrs).toMatch(/\bfont-serif\b/);
        expect(attrs).not.toMatch(BOLD);
      }
    }
  });
});
