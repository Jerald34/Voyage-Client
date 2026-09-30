import { describe, expect, it } from "vitest";

import {
  buildPlaceEntities,
  getGoogleMapsPlaceUrl,
  matchPlaceMentions,
} from "../app/lib/trip-dashboard/placeEntities.js";

const itinerary = {
  days: [
    {
      id: "day-1",
      dayNumber: 1,
      title: "Nature and dining",
      items: [
        {
          id: "item-1",
          title: "Lunch at Coco Lime",
          startTime: "12:00 PM",
          endTime: "1:30 PM",
          placeSnapshotId: "snap-coco",
          placeSnapshot: {
            id: "snap-coco",
            name: "Coco Lime",
            formattedAddress: "Rizal Highway, Olongapo City",
            latitude: 14.827,
            longitude: 120.285,
          },
        },
        {
          id: "item-2",
          title: "Unresolved stop",
          placeSnapshot: {
            id: "snap-empty",
            name: "No Coordinates",
            formattedAddress: "",
            latitude: null,
            longitude: null,
          },
        },
      ],
    },
  ],
};

describe("trip dashboard place entities", () => {
  it("builds map-ready place entities from resolved itinerary snapshots only", () => {
    expect(buildPlaceEntities({ itinerary, liveMarkers: [] })).toEqual([
      expect.objectContaining({
        id: "itinerary:snap-coco",
        source: "itinerary",
        name: "Coco Lime",
        formattedAddress: "Rizal Highway, Olongapo City",
        lat: 14.827,
        lng: 120.285,
        dayLabel: "Day 1",
        timeLabel: "12:00 PM - 1:30 PM",
        itineraryIndex: 0,
      }),
    ]);
  });

  it("merges live map markers as selectable place entities", () => {
    const places = buildPlaceEntities({
      itinerary: null,
      liveMarkers: [
        {
          id: "marker-malawaan",
          name: "Malawaan Picnic Park",
          formattedAddress: "Subic Bay Freeport Zone",
          lat: 14.791,
          lng: 120.276,
        },
      ],
    });

    expect(places).toEqual([
      expect.objectContaining({
        id: "live:marker-malawaan",
        source: "live",
        name: "Malawaan Picnic Park",
        dayLabel: "Live result",
      }),
    ]);
  });

  it("matches exact place mentions without matching inside longer words", () => {
    const places = buildPlaceEntities({ itinerary, liveMarkers: [] });
    const segments = matchPlaceMentions("Coco Lime is lunch. Coco Limehouse is not.", places);

    expect(segments).toEqual([
      expect.objectContaining({ type: "place", text: "Coco Lime", place: expect.objectContaining({ id: "itinerary:snap-coco" }) }),
      expect.objectContaining({ type: "text", text: " is lunch. Coco Limehouse is not." }),
    ]);
  });

  it("creates a Google Maps search URL from coordinates", () => {
    const [place] = buildPlaceEntities({ itinerary, liveMarkers: [] });

    expect(getGoogleMapsPlaceUrl(place)).toContain("https://www.google.com/maps/search/?api=1&query=");
    expect(decodeURIComponent(getGoogleMapsPlaceUrl(place))).toContain("Coco Lime 14.827,120.285");
  });

  it("does not carry a business status or advisory when the snapshot has neither", () => {
    const [place] = buildPlaceEntities({ itinerary, liveMarkers: [] });
    expect(place.businessStatus).toBeUndefined();
    expect(place.placeAdvisory).toBeNull();
  });
});
