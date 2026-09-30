import { describe, expect, it } from "vitest";

import {
  normalizeBusinessStatus,
  getPlaceStatusLabel,
  mergePlaceStatus,
} from "../app/lib/trip-dashboard/placeStatus.js";
import { buildPlaceEntities } from "../app/lib/trip-dashboard/placeEntities.js";
import { normalizeMapMarker } from "../app/lib/stream/normalizers.js";
import {
  mapItemToPoint,
  normalizeLiveMarker,
} from "../app/components/trip-dashboard/itinerary/ItineraryLiveMap.jsx";
import { buildRichItinerarySections } from "../app/lib/trip-dashboard/richItinerary.js";

describe("normalizeBusinessStatus", () => {
  it("recognizes the three known provider statuses", () => {
    expect(normalizeBusinessStatus("OPERATIONAL")).toBe("OPERATIONAL");
    expect(normalizeBusinessStatus("CLOSED_TEMPORARILY")).toBe("CLOSED_TEMPORARILY");
    expect(normalizeBusinessStatus("CLOSED_PERMANENTLY")).toBe("CLOSED_PERMANENTLY");
  });

  it("treats missing or unrecognized values as unverified (undefined), never open", () => {
    expect(normalizeBusinessStatus(undefined)).toBeUndefined();
    expect(normalizeBusinessStatus(null)).toBeUndefined();
    expect(normalizeBusinessStatus("")).toBeUndefined();
    expect(normalizeBusinessStatus("OPEN")).toBeUndefined();
    expect(normalizeBusinessStatus("closed_permanently")).toBeUndefined();
  });
});

describe("getPlaceStatusLabel", () => {
  it("prioritizes agency overlays over provider status", () => {
    expect(getPlaceStatusLabel({ businessStatus: "CLOSED_PERMANENTLY", placeAdvisory: { reason: "AGENCY_CLOSED" } })).toBe(
      "Agency marked closed",
    );
    expect(getPlaceStatusLabel({ placeAdvisory: { reason: "AGENCY_AVOID" } })).toBe("Agency recommends avoiding");
  });

  it("labels provider closures when there is no agency overlay", () => {
    expect(getPlaceStatusLabel({ businessStatus: "CLOSED_PERMANENTLY" })).toBe("Permanently closed");
    expect(getPlaceStatusLabel({ businessStatus: "CLOSED_TEMPORARILY" })).toBe("Temporarily closed");
  });

  it("never infers an open/operational badge from missing or operational status", () => {
    expect(getPlaceStatusLabel({})).toBe("");
    expect(getPlaceStatusLabel()).toBe("");
    expect(getPlaceStatusLabel({ businessStatus: "OPERATIONAL" })).toBe("");
  });
});

describe("mergePlaceStatus (freshness reconciliation)", () => {
  it("keeps a current closure when the historical observation is missing", () => {
    const saved = { businessStatus: "CLOSED_PERMANENTLY", businessStatusCheckedAt: "2026-09-01T00:00:00.000Z" };
    const historical = { businessStatus: undefined, businessStatusCheckedAt: null };
    expect(mergePlaceStatus(saved, historical)).toEqual({
      businessStatus: "CLOSED_PERMANENTLY",
      businessStatusCheckedAt: "2026-09-01T00:00:00.000Z",
    });
  });

  it("keeps a current closure when the historical observation is older", () => {
    const saved = { businessStatus: "CLOSED_PERMANENTLY", businessStatusCheckedAt: "2026-09-05T00:00:00.000Z" };
    const historical = { businessStatus: "OPERATIONAL", businessStatusCheckedAt: "2026-09-01T00:00:00.000Z" };
    expect(mergePlaceStatus(saved, historical)).toEqual({
      businessStatus: "CLOSED_PERMANENTLY",
      businessStatusCheckedAt: "2026-09-05T00:00:00.000Z",
    });
  });

  it("adopts a newer recognized historical observation over a stale saved one", () => {
    const saved = { businessStatus: "OPERATIONAL", businessStatusCheckedAt: "2026-09-01T00:00:00.000Z" };
    const historical = { businessStatus: "CLOSED_TEMPORARILY", businessStatusCheckedAt: "2026-09-05T00:00:00.000Z" };
    expect(mergePlaceStatus(saved, historical)).toEqual({
      businessStatus: "CLOSED_TEMPORARILY",
      businessStatusCheckedAt: "2026-09-05T00:00:00.000Z",
    });
  });

  it("prefers the authenticated saved snapshot when there is no comparable time", () => {
    const saved = { businessStatus: "CLOSED_PERMANENTLY", businessStatusCheckedAt: null };
    const historical = { businessStatus: "OPERATIONAL", businessStatusCheckedAt: null };
    expect(mergePlaceStatus(saved, historical)).toEqual({
      businessStatus: "CLOSED_PERMANENTLY",
      businessStatusCheckedAt: null,
    });
  });

  it("falls back to the historical observation when nothing is saved yet", () => {
    const historical = { businessStatus: "CLOSED_TEMPORARILY", businessStatusCheckedAt: "2026-09-05T00:00:00.000Z" };
    expect(mergePlaceStatus(undefined, historical)).toEqual({
      businessStatus: "CLOSED_TEMPORARILY",
      businessStatusCheckedAt: "2026-09-05T00:00:00.000Z",
    });
  });
});

describe("buildPlaceEntities status propagation (itinerary status)", () => {
  const baseItinerary = {
    days: [
      {
        id: "day-1",
        dayNumber: 1,
        items: [
          {
            id: "item-1",
            title: "Lunch at Coco Lime",
            placeSnapshotId: "snap-coco",
            placeAdvisory: { reason: "AGENCY_CLOSED", label: "Agency marked closed" },
            placeSnapshot: {
              id: "snap-coco",
              name: "Coco Lime",
              latitude: 14.827,
              longitude: 120.285,
              businessStatus: "CLOSED_PERMANENTLY",
              businessStatusCheckedAt: "2026-09-01T00:00:00.000Z",
            },
          },
        ],
      },
    ],
  };

  it("carries normalized snapshot status, checked time, and staff advisory on itinerary entries", () => {
    const [place] = buildPlaceEntities({ itinerary: baseItinerary, liveMarkers: [] });
    expect(place.businessStatus).toBe("CLOSED_PERMANENTLY");
    expect(place.businessStatusCheckedAt).toBe("2026-09-01T00:00:00.000Z");
    expect(place.placeAdvisory).toEqual({ reason: "AGENCY_CLOSED", label: "Agency marked closed" });
  });

  it("carries a temporary-closure status through without an advisory", () => {
    const itinerary = {
      days: [
        {
          id: "day-1",
          items: [
            {
              id: "item-2",
              title: "Beach walk",
              placeSnapshot: {
                id: "snap-beach",
                name: "Malawaan",
                latitude: 14.79,
                longitude: 120.27,
                businessStatus: "CLOSED_TEMPORARILY",
                businessStatusCheckedAt: "2026-09-02T00:00:00.000Z",
              },
            },
          ],
        },
      ],
    };
    const [place] = buildPlaceEntities({ itinerary, liveMarkers: [] });
    expect(place.businessStatus).toBe("CLOSED_TEMPORARILY");
    expect(place.placeAdvisory).toBeNull();
  });

  it("normalizes a missing or unrecognized snapshot status to undefined, never open", () => {
    const itinerary = {
      days: [
        {
          id: "day-1",
          items: [
            {
              id: "item-3",
              title: "Untouched stop",
              placeSnapshot: { id: "snap-x", name: "X", latitude: 1, longitude: 1 },
            },
          ],
        },
      ],
    };
    const [place] = buildPlaceEntities({ itinerary, liveMarkers: [] });
    expect(place.businessStatus).toBeUndefined();
  });

  it("carries normalized status through streamed live markers", () => {
    const [place] = buildPlaceEntities({
      itinerary: null,
      liveMarkers: [
        {
          id: "marker-1",
          name: "Ocean Adventure",
          lat: 14.79,
          lng: 120.27,
          businessStatus: "CLOSED_PERMANENTLY",
          businessStatusCheckedAt: "2026-09-03T00:00:00.000Z",
        },
      ],
    });
    expect(place.businessStatus).toBe("CLOSED_PERMANENTLY");
    expect(place.businessStatusCheckedAt).toBe("2026-09-03T00:00:00.000Z");
  });
});

describe("normalizeMapMarker status propagation (streamed markers, serialization boundary)", () => {
  it("preserves placeSnapshotId and a recognized business status from a plain JSON string payload", () => {
    const payload = {
      id: "marker-1",
      placeSnapshotId: "snap-99",
      name: "Ocean Adventure",
      lat: 14.79,
      lng: 120.27,
      businessStatus: "CLOSED_TEMPORARILY",
      businessStatusCheckedAt: "2026-09-04T00:00:00.000Z",
    };
    const marker = normalizeMapMarker(payload, 0);
    expect(marker.placeSnapshotId).toBe("snap-99");
    expect(marker.businessStatus).toBe("CLOSED_TEMPORARILY");
    expect(marker.businessStatusCheckedAt).toBe("2026-09-04T00:00:00.000Z");
  });

  it("does not infer an open badge when the stream omits business status", () => {
    const marker = normalizeMapMarker({ id: "marker-2", name: "Somewhere", lat: 1, lng: 1 }, 0);
    expect(marker.businessStatus).toBeUndefined();
    expect(marker.businessStatusCheckedAt).toBeNull();
  });
});

describe("ItineraryLiveMap raw normalizers (map item + live marker)", () => {
  it("mapItemToPoint preserves placeSnapshotId, status, checked time, and staff advisory", () => {
    const item = {
      placeSnapshotId: "snap-coco",
      placeAdvisory: { reason: "AGENCY_AVOID", label: "Agency recommends avoiding" },
      placeSnapshot: {
        id: "snap-coco",
        name: "Coco Lime",
        latitude: 14.827,
        longitude: 120.285,
        businessStatus: "CLOSED_PERMANENTLY",
        businessStatusCheckedAt: "2026-09-01T00:00:00.000Z",
      },
    };
    const point = mapItemToPoint(item, 0);
    expect(point.placeSnapshotId).toBe("snap-coco");
    expect(point.businessStatus).toBe("CLOSED_PERMANENTLY");
    expect(point.businessStatusCheckedAt).toBe("2026-09-01T00:00:00.000Z");
    expect(point.placeAdvisory).toEqual({ reason: "AGENCY_AVOID", label: "Agency recommends avoiding" });
  });

  it("normalizeLiveMarker preserves a recognized status with no saved snapshot to reconcile against", () => {
    const marker = { id: "m1", placeSnapshotId: "snap-live", name: "Fresh Result", lat: 1, lng: 1, businessStatus: "CLOSED_TEMPORARILY", businessStatusCheckedAt: "2026-09-05T00:00:00.000Z" };
    const point = normalizeLiveMarker(marker, 0, new Map());
    expect(point.businessStatus).toBe("CLOSED_TEMPORARILY");
    expect(point.businessStatusCheckedAt).toBe("2026-09-05T00:00:00.000Z");
  });

  it("normalizeLiveMarker never lets a stale/missing live status erase a newer saved closure for the same snapshot", () => {
    const savedStatusBySnapshotId = new Map([
      ["snap-coco", { businessStatus: "CLOSED_PERMANENTLY", businessStatusCheckedAt: "2026-09-05T00:00:00.000Z" }],
    ]);
    const staleOpenMarker = {
      id: "m1",
      placeSnapshotId: "snap-coco",
      name: "Coco Lime",
      lat: 14.827,
      lng: 120.285,
      businessStatus: "OPERATIONAL",
      businessStatusCheckedAt: "2026-09-01T00:00:00.000Z",
    };
    const point = normalizeLiveMarker(staleOpenMarker, 0, savedStatusBySnapshotId);
    expect(point.businessStatus).toBe("CLOSED_PERMANENTLY");
    expect(point.businessStatusCheckedAt).toBe("2026-09-05T00:00:00.000Z");
  });

  it("normalizeLiveMarker uses the newer live observation when it postdates the saved snapshot", () => {
    const savedStatusBySnapshotId = new Map([
      ["snap-coco", { businessStatus: "OPERATIONAL", businessStatusCheckedAt: "2026-09-01T00:00:00.000Z" }],
    ]);
    const freshClosureMarker = {
      id: "m1",
      placeSnapshotId: "snap-coco",
      name: "Coco Lime",
      lat: 14.827,
      lng: 120.285,
      businessStatus: "CLOSED_PERMANENTLY",
      businessStatusCheckedAt: "2026-09-06T00:00:00.000Z",
    };
    const point = normalizeLiveMarker(freshClosureMarker, 0, savedStatusBySnapshotId);
    expect(point.businessStatus).toBe("CLOSED_PERMANENTLY");
  });
});

describe("buildRichItinerarySections closure label (separate from mapped/location-pending status)", () => {
  it("keeps the existing statusLabel meaning while adding closure status fields", () => {
    const itinerary = {
      days: [
        {
          id: "day-1",
          dayNumber: 1,
          items: [
            {
              id: "item-1",
              title: "Lunch at Coco Lime",
              placeSnapshotId: "snap-coco",
              placeAdvisory: { reason: "AGENCY_CLOSED", label: "Agency marked closed" },
              placeSnapshot: {
                id: "snap-coco",
                name: "Coco Lime",
                latitude: 14.827,
                longitude: 120.285,
                businessStatus: "CLOSED_PERMANENTLY",
                businessStatusCheckedAt: "2026-09-01T00:00:00.000Z",
              },
            },
          ],
        },
      ],
    };
    const placeEntities = buildPlaceEntities({ itinerary, liveMarkers: [] });
    const sections = buildRichItinerarySections({ itinerary, placeEntities });
    const [stop] = sections.days[0].stops;

    expect(stop.statusLabel).toBe("Mapped");
    expect(stop.businessStatus).toBe("CLOSED_PERMANENTLY");
    expect(stop.placeAdvisory).toEqual({ reason: "AGENCY_CLOSED", label: "Agency marked closed" });
    expect(stop.closureLabel).toBe("Agency marked closed");
  });

  it("leaves closureLabel empty and statusLabel as location-pending for unresolved stops with no status", () => {
    const itinerary = {
      days: [
        {
          id: "day-1",
          dayNumber: 1,
          items: [{ id: "item-2", title: "Unresolved", placeSnapshot: { id: "snap-x", name: "X" } }],
        },
      ],
    };
    const sections = buildRichItinerarySections({ itinerary, placeEntities: [] });
    const [stop] = sections.days[0].stops;
    expect(stop.statusLabel).toBe("Location pending");
    expect(stop.closureLabel).toBe("");
  });
});
