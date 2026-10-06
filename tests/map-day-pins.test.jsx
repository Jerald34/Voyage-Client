import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const mapsLib = vi.hoisted(() => ({ routes: null }));

// Render the markers as plain DOM so the pins' glyphs and colours can be read.
vi.mock("@vis.gl/react-google-maps", () => ({
  APIProvider: ({ children }) => children,
  Map: ({ children }) => <div data-testid="map">{children}</div>,
  AdvancedMarker: ({ children, title, onMouseEnter }) => (
    <div data-testid="marker" title={title} onMouseEnter={onMouseEnter}>
      {children}
    </div>
  ),
  Pin: ({ glyph, background, borderColor }) => (
    <span data-testid="pin" data-background={background} data-border={borderColor}>
      {glyph}
    </span>
  ),
  useMap: () => null,
  useMapsLibrary: (name) => (name === "routes" ? mapsLib.routes : null),
}));

afterEach(() => {
  mapsLib.routes = null;
});

import ItineraryLiveMap, {
  buildRouteSegmentsFromItems,
  getItineraryPinStyle,
  getPinTitle,
  groupPointsByDay,
  mapItemToPoint,
} from "../app/components/trip-dashboard/itinerary/ItineraryLiveMap.jsx";
import StopNumberBadge from "../app/components/trip-dashboard/itinerary/StopNumberBadge.jsx";
import CompactPlaceCard from "../app/components/trip-dashboard/mobile/CompactPlaceCard.jsx";
import { DAY_COLORS, getDayColor } from "../app/lib/trip-dashboard/dayColors.js";

function stop(dayNumber, itemIndex, lat, lng, extra = {}) {
  return {
    id: `item-${dayNumber}-${itemIndex}`,
    title: `Stop ${dayNumber}.${itemIndex + 1}`,
    __dayNumber: dayNumber,
    __itemIndex: itemIndex,
    __placeEntityId: `place-${dayNumber}-${itemIndex}`,
    ...(lat === null ? {} : { placeSnapshot: { name: `Place ${dayNumber}.${itemIndex + 1}`, latitude: lat, longitude: lng } }),
    ...extra,
  };
}

// Day 1 has three stops (the second has no location yet); day 2 has two.
const twoDayItems = [
  stop(1, 0, 16.41, 120.59),
  stop(1, 1, null, null),
  stop(1, 2, 16.4, 120.6),
  stop(2, 0, 16.42, 120.61),
  stop(2, 1, 16.43, 120.62),
];

describe("day colours", () => {
  it("gives each day its own colour and cycles after the palette runs out", () => {
    expect(getDayColor(1)).toBe(DAY_COLORS[0]);
    expect(getDayColor(2)).toBe(DAY_COLORS[1]);
    expect(getDayColor(2)).not.toEqual(getDayColor(1));
    expect(getDayColor(DAY_COLORS.length + 1)).toBe(DAY_COLORS[0]);
  });

  it("has no colour for a missing or invalid day number", () => {
    expect(getDayColor(null)).toBeNull();
    expect(getDayColor(undefined)).toBeNull();
    expect(getDayColor(0)).toBeNull();
    expect(getDayColor("abc")).toBeNull();
  });
});

describe("map points per day", () => {
  it("numbers each stop by its place in its own day, not across the trip", () => {
    const points = twoDayItems.map((item, index) => mapItemToPoint(item, index)).filter(Boolean);

    expect(points.map((point) => [point.dayNumber, point.stopIndex])).toEqual([
      [1, 0],
      [1, 2],
      [2, 0],
      [2, 1],
    ]);
    // itemIndex still points at the item in the list the map was given.
    expect(points.map((point) => point.itemIndex)).toEqual([0, 2, 3, 4]);
  });

  it("falls back to list order when an item has no day position", () => {
    const point = mapItemToPoint({ placeSnapshot: { latitude: 1, longitude: 2 } }, 4);
    expect(point.stopIndex).toBe(4);
    expect(point.dayNumber).toBeNull();
  });

  it("groups points by day in itinerary order", () => {
    const points = twoDayItems.map((item, index) => mapItemToPoint(item, index)).filter(Boolean);
    const groups = groupPointsByDay(points);

    expect(groups.map((group) => [group.key, group.dayNumber, group.points.length])).toEqual([
      ["day-1", 1, 2],
      ["day-2", 2, 2],
    ]);
  });

  it("tags stored route segments with their day", () => {
    const segments = buildRouteSegmentsFromItems([
      stop(2, 0, 16.42, 120.61),
      stop(2, 1, 16.43, 120.62, {
        routeFromPrevious: { polyline: [{ lat: 16.42, lng: 120.61 }, { lat: 16.43, lng: 120.62 }] },
      }),
    ]);

    expect(segments).toHaveLength(1);
    expect(segments[0].dayNumber).toBe(2);
  });

  it("names the day and stop in the pin's title", () => {
    expect(getPinTitle({ title: "Burnham Park", dayNumber: 2 }, 0)).toBe("Day 2, stop 1: Burnham Park");
    expect(getPinTitle({ title: "Burnham Park" }, 0)).toBe("Burnham Park");
  });
});

describe("pin style", () => {
  it("fills a day's pin with that day's colour", () => {
    const style = getItineraryPinStyle({ dayNumber: 2 });
    expect(style.background).toBe(DAY_COLORS[1].fill);
    expect(style.glyphColor).toBe("#ffffff");
    expect(style.scale).toBe(1);
  });

  it("keeps the day colour on the active pin and makes it bigger", () => {
    const style = getItineraryPinStyle({ dayNumber: 2, isActive: true });
    expect(style.background).toBe(DAY_COLORS[1].fill);
    expect(style.scale).toBeGreaterThan(1);
  });

  it("keeps the closed warning fill but edges it in the day colour", () => {
    const style = getItineraryPinStyle({ dayNumber: 3, isClosed: true });
    expect(style.background).toBe("#fef3c7");
    expect(style.borderColor).toBe(DAY_COLORS[2].fill);
  });
});

describe("ItineraryLiveMap per-day pins", () => {
  // No ThemeProvider: it swaps its wrapper after mount, which would remount the
  // map; the `theme` prop is enough here.
  function renderMap(props = {}) {
    return render(<ItineraryLiveMap items={twoDayItems} theme="light" sidebarWidth={0} {...props} />);
  }

  it("restarts the pin numbers each day and colours them by day", () => {
    renderMap();
    const pins = screen.getAllByTestId("pin");

    // A stop with no location keeps its number free: day 1 shows 1 and 3.
    expect(pins.map((pin) => pin.textContent)).toEqual(["1", "3", "1", "2"]);
    expect(pins.map((pin) => pin.dataset.background)).toEqual([
      DAY_COLORS[0].fill,
      DAY_COLORS[0].fill,
      DAY_COLORS[1].fill,
      DAY_COLORS[1].fill,
    ]);
  });

  it("highlights the pin of the hovered list item, even after a stop with no location", () => {
    const onHoverItem = vi.fn();
    renderMap({ activeIndex: 2, onHoverItem });

    const markers = screen.getAllByTestId("marker");
    // Item 2 is day 1's third stop, drawn by the second marker.
    expect(within(markers[1]).getByTestId("pin").dataset.border).not.toBe(DAY_COLORS[0].border);
    expect(within(markers[0]).getByTestId("pin").dataset.border).toBe(DAY_COLORS[0].border);

    fireEvent.mouseEnter(markers[1]);
    expect(onHoverItem).toHaveBeenCalledWith(2);
  });

  it("shows a day key when more than one day is on the map", () => {
    renderMap();
    const key = screen.getByRole("list", { name: "Map key" });
    expect(within(key).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Day 1", "Day 2"]);
  });

  it("asks for one road route per day, and not again when the same stops re-render", async () => {
    const computeRoutes = vi.fn(async () => ({ routes: [{ path: [{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }] }] }));
    mapsLib.routes = { Route: { computeRoutes }, TravelMode: { DRIVING: "DRIVING" } };

    const { rerender } = renderMap();
    await waitFor(() => expect(computeRoutes).toHaveBeenCalledTimes(2));
    expect(computeRoutes.mock.calls.map(([request]) => [request.origin, request.destination])).toEqual([
      [{ lat: 16.41, lng: 120.59 }, { lat: 16.4, lng: 120.6 }],
      [{ lat: 16.42, lng: 120.61 }, { lat: 16.43, lng: 120.62 }],
    ]);

    // A page that rebuilds its items every render passes equal, new objects.
    rerender(<ItineraryLiveMap items={twoDayItems.map((item) => ({ ...item }))} theme="light" sidebarWidth={0} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(computeRoutes).toHaveBeenCalledTimes(2);
  });

  it("shows no day key for a single day", () => {
    renderMap({ items: twoDayItems.filter((item) => item.__dayNumber === 2) });
    expect(screen.queryByRole("list", { name: "Map key" })).toBeNull();
  });
});

describe("StopNumberBadge", () => {
  it("shows the stop number in the day's colour", () => {
    render(<StopNumberBadge dayNumber={2} stopNumber={3} />);
    const badge = screen.getByText("3").parentElement;

    expect(badge).toHaveStyle({ backgroundColor: DAY_COLORS[1].fill });
    expect(screen.getByText("Stop 3")).toHaveClass("sr-only");
  });

  it("renders nothing without a stop number", () => {
    const { container } = render(<StopNumberBadge dayNumber={2} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("CompactPlaceCard stop number", () => {
  it("puts the stop's pin number on the card", () => {
    render(<CompactPlaceCard item={{ id: "a", title: "Mines View" }} dayNumber={1} stopNumber={2} onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Stop 2/ })).toBeInTheDocument();
    expect(screen.getByText("2").parentElement).toHaveStyle({ backgroundColor: DAY_COLORS[0].fill });
  });

  it("shows no number when the card isn't given one", () => {
    render(<CompactPlaceCard item={{ id: "a", title: "Mines View" }} onSelect={vi.fn()} />);
    expect(screen.queryByText(/^Stop \d+$/)).toBeNull();
  });
});
