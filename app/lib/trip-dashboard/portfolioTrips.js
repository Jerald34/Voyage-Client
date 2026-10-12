import { formatTripDates, mapTripStatus } from "../formatters.js";

/** One agency trip row (workspace bootstrap or GET /itineraries) as the Itineraries page and the Planner use it. */
export function toPortfolioTrip(trip) {
  const firstItinerary = Array.isArray(trip?.itineraries) ? trip.itineraries[0] : null;
  return {
    id: trip.id,
    clientName: trip.clientName ?? null,
    destination: trip.destinationSummary ?? trip.title,
    travelWindow: formatTripDates(trip.startDate, trip.endDate),
    status: trip.status?.toLowerCase() === "archived" ? "archived" : "active",
    approvalStatus: mapTripStatus(trip.status),
    itineraryId: firstItinerary?.id ?? null,
    itineraryVersion: firstItinerary?.version ?? null,
    createdAt: trip.createdAt ?? null,
  };
}
