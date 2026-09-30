/**
 * Pure place-status normalization and labelling.
 *
 * The one rule that governs everything here: a missing or unrecognized status is
 * UNVERIFIED, never "open". Nothing in this module ever produces an
 * open/operational badge, because the server never claims one either.
 */

const KNOWN_STATUSES = ["OPERATIONAL", "CLOSED_TEMPORARILY", "CLOSED_PERMANENTLY"];

export function normalizeBusinessStatus(value) {
  return ["OPERATIONAL", "CLOSED_TEMPORARILY", "CLOSED_PERMANENTLY"].includes(value)
    ? value
    : undefined;
}

export function getPlaceStatusLabel({ businessStatus, placeAdvisory } = {}) {
  if (placeAdvisory?.reason === "AGENCY_CLOSED") return "Agency marked closed";
  if (placeAdvisory?.reason === "AGENCY_AVOID") return "Agency recommends avoiding";
  if (businessStatus === "CLOSED_PERMANENTLY") return "Permanently closed";
  if (businessStatus === "CLOSED_TEMPORARILY") return "Temporarily closed";
  return "";
}

/** Milliseconds for an ISO string (what the wire actually carries), else null. */
function observedAt(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

/**
 * Reconcile the authenticated saved snapshot with a historical live observation
 * of the same place.
 *
 * The newer *recognized* observation wins. A missing or older live status can
 * never erase a current closure, and with no comparable times the authenticated
 * saved snapshot is preferred — it is the record the server just authorized.
 */
export function mergePlaceStatus(saved, historical) {
  const savedStatus = normalizeBusinessStatus(saved?.businessStatus);
  const historicalStatus = normalizeBusinessStatus(historical?.businessStatus);

  if (!historicalStatus) {
    return {
      businessStatus: savedStatus,
      businessStatusCheckedAt: saved?.businessStatusCheckedAt ?? null
    };
  }
  if (!savedStatus) {
    return {
      businessStatus: historicalStatus,
      businessStatusCheckedAt: historical?.businessStatusCheckedAt ?? null
    };
  }

  const savedAt = observedAt(saved?.businessStatusCheckedAt);
  const historicalAt = observedAt(historical?.businessStatusCheckedAt);

  // Only a strictly newer historical observation displaces the saved one.
  if (savedAt !== null && historicalAt !== null && historicalAt > savedAt) {
    return {
      businessStatus: historicalStatus,
      businessStatusCheckedAt: historical?.businessStatusCheckedAt ?? null
    };
  }

  return {
    businessStatus: savedStatus,
    businessStatusCheckedAt: saved?.businessStatusCheckedAt ?? null
  };
}

export { KNOWN_STATUSES };
