/**
 * Place accessibility from PlaceSnapshot.metadata.accessibility (Google Places).
 * The rule: a missing flag is UNKNOWN, never "no", and a place never checked
 * gets no badge at all.
 */

const FEATURES = [
  { key: "wheelchairAccessibleEntrance", label: "Accessible entrance" },
  { key: "wheelchairAccessibleRestroom", label: "Accessible restroom" },
  { key: "wheelchairAccessibleParking", label: "Accessible parking" },
  { key: "wheelchairAccessibleSeating", label: "Accessible seating" },
];

export function getPlaceAccessibility(snapshot) {
  const raw = snapshot?.metadata?.accessibility;
  if (!raw || typeof raw !== "object") return null;
  const features = {};
  for (const { key } of FEATURES) features[key] = typeof raw[key] === "boolean" ? raw[key] : null;
  return { features, checkedAt: typeof raw.checkedAt === "string" ? raw.checkedAt : null };
}

export function getAccessibilityBadges(snapshot) {
  const accessibility = getPlaceAccessibility(snapshot);
  if (!accessibility) return [];
  const { features } = accessibility;
  const badges = [];
  if (features.wheelchairAccessibleEntrance === false) {
    badges.push({ key: "entrance-no", label: "Entrance not wheelchair accessible", tone: "warning" });
  }
  for (const feature of FEATURES) {
    if (features[feature.key] === true) badges.push({ key: feature.key, label: feature.label, tone: "positive" });
  }
  if (badges.length === 0) badges.push({ key: "unverified", label: "Accessibility not verified", tone: "neutral" });
  return badges.slice(0, 3);
}

/** Counts for a trip or a day. `notVerified` includes places never checked. */
export function summarizeAccessibility(days) {
  const summary = { total: 0, checked: 0, accessibleEntrance: 0, notAccessible: 0, notVerified: 0 };
  for (const day of Array.isArray(days) ? days : []) {
    for (const item of Array.isArray(day?.items) ? day.items : []) {
      const snapshot = item?.placeSnapshot;
      if (!snapshot) continue;
      summary.total += 1;
      const accessibility = getPlaceAccessibility(snapshot);
      if (accessibility) summary.checked += 1;
      const entrance = accessibility?.features.wheelchairAccessibleEntrance ?? null;
      if (entrance === true) summary.accessibleEntrance += 1;
      else if (entrance === false) summary.notAccessible += 1;
      else summary.notVerified += 1;
    }
  }
  return summary;
}

export function formatAccessibilitySummary(summary) {
  if (!summary || summary.total === 0) return "";
  const parts = [`${summary.accessibleEntrance} of ${summary.total} stops have a wheelchair-accessible entrance`];
  if (summary.notAccessible > 0) parts.push(`${summary.notAccessible} not accessible`);
  if (summary.notVerified > 0) parts.push(`${summary.notVerified} not verified`);
  return parts.join(" · ");
}

/** One PDF line of plain WinAnsi text; empty when the place was never checked. */
export function getAccessibilityPdfText(snapshot) {
  const badges = getAccessibilityBadges(snapshot);
  if (badges.length === 0) return "";
  if (badges.length === 1 && badges[0].key === "unverified") return "Accessibility: not verified";
  return `Accessibility: ${badges.map((badge) => badge.label.toLowerCase()).join(", ")}`;
}
