import { mapTripStatus } from "../formatters.js";

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
 * @returns {Object[]}
 */
export function buildPlanningOptions({ draftThreadOrder, draftThreadStates, safeTrips, tripStates, activeContext }) {
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
    destination: t.destination,
    statusLabel: t.approvalStatus || t.status || "Client trip",
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
      destination: state.itinerary?.trip?.destination || state.itinerary?.trip?.destinationSummary || "",
      statusLabel: mapTripStatus(state.itinerary?.trip?.status ?? "APPROVED_INTERNAL"),
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
