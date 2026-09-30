const ACCEPTED_SAVED_STATUSES = new Set([
  "approved",
  "approved itinerary",
  "approved_internal",
  "client approved",
  "in review",
  "in_review",
  "saved",
  "saved itinerary",
  "sent to client",
]);

const BLOCKED_STATUS_TERMS = [
  "awaiting",
  "pending",
  "requested changes",
  "missing",
  "needs",
];

function normalizeText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeSavedStatus(value) {
  return normalizeText(value).toLowerCase();
}

export function getStableItineraryId(trip) {
  const id = trip?.itineraryId ?? trip?.itinerary?.id ?? "";
  return normalizeText(id);
}

export function getSavedStatusLabel(trip) {
  const approvalStatus = normalizeText(trip?.approvalStatus);
  if (approvalStatus && isAcceptedSavedStatus(approvalStatus)) return approvalStatus;

  const itineraryStatus = normalizeText(trip?.itineraryStatus);
  if (itineraryStatus && isAcceptedSavedStatus(itineraryStatus)) return itineraryStatus;

  const clientStatus = normalizeText(trip?.clientStatus);
  if (clientStatus && isAcceptedSavedStatus(clientStatus)) return clientStatus;

  return "Saved itinerary";
}

function isAcceptedSavedStatus(value) {
  const status = normalizeSavedStatus(value);
  if (!status) return false;
  if (BLOCKED_STATUS_TERMS.some((term) => status.includes(term))) return false;
  return ACCEPTED_SAVED_STATUSES.has(status);
}

function hasBlockedStatus(trip) {
  return [trip?.approvalStatus, trip?.itineraryStatus, trip?.clientStatus, trip?.status].some((value) => {
    const status = normalizeSavedStatus(value);
    return status && BLOCKED_STATUS_TERMS.some((term) => status.includes(term));
  });
}

function hasSavedMarker(trip) {
  if (trip?.isSaved === true || trip?.isApproved === true) return true;
  if (normalizeText(trip?.savedAt) || normalizeText(trip?.approvedAt)) return true;
  if (hasBlockedStatus(trip)) return false;
  return (
    isAcceptedSavedStatus(trip?.approvalStatus) ||
    isAcceptedSavedStatus(trip?.itineraryStatus) ||
    isAcceptedSavedStatus(trip?.clientStatus) ||
    isAcceptedSavedStatus(trip?.status)
  );
}

function isArchivedTrip(trip) {
  return trip?.isArchived === true || normalizeSavedStatus(trip?.status) === "archived";
}

export function isSavedItineraryTrip(trip) {
  if (!trip || typeof trip !== "object") return false;
  if (!normalizeText(trip?.id)) return false;
  if (!getStableItineraryId(trip)) return false;
  if (isArchivedTrip(trip)) return false;
  return hasSavedMarker(trip);
}

export function getSavedItineraryTrips(agencyTrips = []) {
  return (Array.isArray(agencyTrips) ? agencyTrips : []).filter(isSavedItineraryTrip);
}

function getClientId(clientName) {
  return normalizeText(clientName).toLowerCase();
}

function getTripSortValue(trip) {
  return normalizeText(trip?.departureDate || trip?.startDate || trip?.travelWindow || trip?.destination || trip?.id);
}

export function groupSavedTripsByClient(savedTrips = []) {
  const map = new Map();

  (Array.isArray(savedTrips) ? savedTrips : []).forEach((trip) => {
    const clientName = normalizeText(trip?.clientName);
    if (!clientName) return;

    const clientId = getClientId(clientName);
    if (!map.has(clientId)) {
      map.set(clientId, {
        id: clientId,
        name: clientName,
        trips: [],
      });
    }
    map.get(clientId).trips.push(trip);
  });

  return Array.from(map.values())
    .map((client) => ({
      ...client,
      trips: [...client.trips].sort((a, b) => {
        const bySortValue = getTripSortValue(a).localeCompare(getTripSortValue(b));
        if (bySortValue !== 0) return bySortValue;
        return normalizeText(a?.id).localeCompare(normalizeText(b?.id));
      }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function resolveSavedPortfolioSelection({ clients, selectedClientId, selectedTripId }) {
  const safeClients = Array.isArray(clients) ? clients : [];
  const currentClient = safeClients.find((client) => client.id === selectedClientId) ?? null;

  if (currentClient) {
    const currentClientTrips = Array.isArray(currentClient.trips) ? currentClient.trips : [];
    const currentTrip = currentClientTrips.find((trip) => trip.id === selectedTripId) ?? null;
    if (currentTrip) {
      return { clientId: currentClient.id, tripId: currentTrip.id };
    }

    const firstTripForClient = currentClientTrips[0] ?? null;
    if (firstTripForClient) {
      return { clientId: currentClient.id, tripId: firstTripForClient.id };
    }
  }

  const firstClient = safeClients.find((client) => Array.isArray(client?.trips) && client.trips.length > 0) ?? null;
  const firstTrip = firstClient?.trips[0] ?? null;

  return {
    clientId: firstClient?.id ?? null,
    tripId: firstTrip?.id ?? null,
  };
}

export function normalizeItineraryResponse(responseData) {
  return responseData?.itinerary ?? responseData ?? null;
}
