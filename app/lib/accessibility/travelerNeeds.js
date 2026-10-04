/**
 * Traveler needs as the server stores them: { needs: string[], notes: string | null }.
 * Sensitive personal data: agency views only; never shown on shares or PDFs.
 */

export const TRAVELER_NEED_OPTIONS = [
  { id: "WHEELCHAIR", label: "Wheelchair user", description: "Needs step-free entrances, ramps or lifts, and accessible restrooms." },
  { id: "LIMITED_MOBILITY", label: "Limited mobility", description: "Avoid long walks, many stairs and steep climbs." },
  { id: "SENIOR", label: "Senior travelers", description: "Slower pace with regular rest breaks." },
  { id: "LOW_VISION", label: "Low vision or blind", description: "Guided, audio or tactile experiences; simple transfers." },
  { id: "HEARING", label: "Deaf or hard of hearing", description: "Visual or captioned experiences; written confirmations." },
  { id: "YOUNG_CHILDREN", label: "Young children or stroller", description: "Stroller-friendly paths and shorter activities." },
];

export const MAX_TRAVELER_NOTES = 500;

const NEED_IDS = TRAVELER_NEED_OPTIONS.map((option) => option.id);

export function normalizeTravelerNeeds(raw) {
  if (!raw || typeof raw !== "object") return null;
  const selected = Array.isArray(raw.needs) ? raw.needs : [];
  const needs = NEED_IDS.filter((id) => selected.includes(id));
  const trimmed = typeof raw.notes === "string" ? raw.notes.trim() : "";
  return { needs, notes: trimmed ? trimmed.slice(0, MAX_TRAVELER_NOTES) : null };
}

export function hasTravelerNeeds(needs) {
  return Boolean(needs && ((Array.isArray(needs.needs) && needs.needs.length > 0) || needs.notes));
}

export function formatTravelerNeedsSummary(needs) {
  if (!hasTravelerNeeds(needs)) return "";
  const labels = needs.needs
    .map((id) => TRAVELER_NEED_OPTIONS.find((option) => option.id === id)?.label)
    .filter(Boolean);
  return labels.length > 0 ? labels.join(" · ") : "Notes added";
}

/** Next thread-state map with one entry's needs replaced (creates a stub entry when missing). */
export function withTravelerNeeds(states, id, needs) {
  return { ...states, [id]: { ...(states?.[id] ?? {}), travelerNeeds: needs } };
}
