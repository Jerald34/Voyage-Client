import { mapTripStatus } from "../formatters.js";
import { buildTripTabLabels, getSavedItineraryTrips } from "./savedItineraries.js";

/**
 * Place line and status for each trip in the Planner's picker, by trip id. Trips to the same place for
 * one client are numbered the way the Itineraries tabs number them: "Option 2 · Baguio City".
 *
 * @param {Object[]} trips Portfolio trips (see toPortfolioTrip), newest first.
 * @returns {Map<string, {label: string, statusLabel: string}>}
 */
export function buildTripPickerLabels(trips = []) {
  const list = Array.isArray(trips) ? trips : [];
  // Only saved trips are tabs on the Itineraries page, so only they count as options.
  const savedByClient = new Map();
  for (const trip of getSavedItineraryTrips(list)) {
    const client = String(trip.clientName ?? "").trim().replace(/\s+/g, " ").toLowerCase() || `trip:${trip.id}`;
    savedByClient.set(client, [...(savedByClient.get(client) ?? []), trip]);
  }
  const optionLabels = new Map();
  for (const group of savedByClient.values()) {
    for (const [id, label] of buildTripTabLabels(group)) optionLabels.set(id, label);
  }

  const labels = new Map();
  for (const trip of list) {
    if (!trip?.id) continue;
    labels.set(trip.id, {
      label: optionLabels.get(trip.id) || trip.destination || "",
      statusLabel: trip.approvalStatus || "",
    });
  }
  return labels;
}

/**
 * Pure helper that assembles the unified planning options array from state slices.
 * Sorted by createdAt desc; pending placeholder pinned to the top.
 *
 * @param {Object} args
 * @param {string[]} args.draftThreadOrder
 * @param {Object} args.draftThreadStates
 * @param {Object[]} args.safeTrips
 * @param {Object} args.tripStates
 * @param {Object|null} args.activeContext
 * @param {Map<string, {label?: string, statusLabel?: string}>|null} [args.tripLabels] Per trip id: the
 *   place line ("Option 2 · Baguio City", as on the Itineraries tabs) and the status from the trip list.
 *   A trip missing from the map keeps the label and status read from its own state.
 * @returns {Object[]}
 */
export function buildPlanningOptions({ draftThreadOrder, draftThreadStates, safeTrips, tripStates, activeContext, tripLabels = null }) {
  const drafts = draftThreadOrder.map((id, i) => {
    const s = draftThreadStates[id];
    if (!s) return null;
    const label = s.title || `Draft itinerary ${draftThreadOrder.length - i}`;
    return {
      type: "draft",
      id,
      clientName: label,
      label,
      destination: s.itinerary?.trip?.destination || "Planning draft",
      statusLabel: "Draft itinerary",
      threadId: id,
      createdAt: s.createdAt ?? null,
    };
  }).filter(Boolean);

  const propTripIds = new Set(safeTrips.map(t => t.id));
  const trips = safeTrips.map(t => ({
    type: "trip",
    id: t.id,
    clientName: t.clientName,
    label: t.clientName,
    destination: tripLabels?.get(t.id)?.label || t.destination,
    statusLabel: tripLabels?.get(t.id)?.statusLabel || t.approvalStatus || t.status || "Client trip",
    tripId: t.id,
    threadId: tripStates[t.id]?.threadId ?? null,
    assignedOrganizer: t.assignedOrganizer,
    createdAt: t.createdAt ?? null,
    tripStatus: t.status ?? null,
  }));

  const threadOnlyTrips = Object.entries(tripStates)
    .filter(([tripId]) => !propTripIds.has(tripId))
    .map(([tripId, state]) => ({
      type: "trip",
      id: tripId,
      clientName: state.title || state.itinerary?.title || state.itinerary?.trip?.clientName || "Client trip",
      label: state.title || "Client trip",
      destination: tripLabels?.get(tripId)?.label || state.itinerary?.trip?.destination || state.itinerary?.trip?.destinationSummary || "",
      statusLabel: tripLabels?.get(tripId)?.statusLabel || mapTripStatus(state.itinerary?.trip?.status ?? "APPROVED_INTERNAL"),
      tripId,
      threadId: state.threadId ?? null,
      createdAt: state.createdAt ?? null,
      tripStatus: state.itinerary?.trip?.status ?? null,
    }));

  const unified = [...drafts, ...trips, ...threadOnlyTrips].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

  if (activeContext?.type === "draft" && String(activeContext.id).startsWith("pending-")) {
    const isAlreadyInDrafts = unified.some((o) => o.id === activeContext.id);
    if (!isAlreadyInDrafts) {
      unified.unshift({
        type: "draft",
        id: activeContext.id,
        clientName: "New Itinerary...",
        label: "New Itinerary...",
        destination: "Planning",
        statusLabel: "Creating...",
        threadId: null,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return unified;
}
