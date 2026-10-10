// tests/landing-sample-map.test.jsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

vi.mock("../app/components/icons/index.js", async () => (await import("./helpers/iconsMock.js")).default);
vi.mock("leaflet/dist/leaflet.css", () => ({}));
vi.mock("leaflet", () => ({ default: { divIcon: (options) => options } }));
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: ({ url }) => <div data-testid="tiles" data-url={url} />,
  Polyline: ({ pathOptions }) => <div data-testid="route" data-color={pathOptions.color} data-opacity={pathOptions.opacity} />,
  Marker: ({ title, icon }) => <div data-testid="pin" title={title} data-html={icon.html} />,
}));
vi.mock("next/dynamic", () => ({
  default: () =>
    function DynamicMapStub({ activeDay }) {
      return <div data-testid="lazy-map" data-active-day={activeDay} />;
    },
}));

import SampleTripMap from "../app/components/landing/SampleTripMap.jsx";
import LazySampleTripMap from "../app/components/landing/LazySampleTripMap.jsx";

const realIO = globalThis.IntersectionObserver;
afterEach(() => {
  globalThis.IntersectionObserver = realIO;
});

describe("SampleTripMap", () => {
  it("pins every located stop in its day colour, numbered like its card", () => {
    render(<SampleTripMap activeDay={2} />);

    const pins = screen.getAllByTestId("pin");
    expect(pins).toHaveLength(8);
    const mall = screen.getByTitle("Day 2, stop 4: SM City Baguio");
    expect(mall.dataset.html).toContain("#0F766E");
    expect(mall.dataset.html).toContain(">4<");
  });

  it("draws one route per day and dims the day not shown", () => {
    render(<SampleTripMap activeDay={2} />);

    const routes = screen.getAllByTestId("route");
    expect(routes.map((r) => [r.dataset.color, r.dataset.opacity])).toEqual([
      ["#B4532A", "0.3"],
      ["#0F766E", "0.9"],
    ]);
  });

  it("uses the light CARTO tiles by default", () => {
    render(<SampleTripMap activeDay={2} />);

    expect(screen.getByTestId("tiles").dataset.url).toContain("rastertiles/voyager");
  });
});

describe("LazySampleTripMap", () => {
  it("does not load the map until it nears the viewport", () => {
    let trigger;
    globalThis.IntersectionObserver = class {
      constructor(callback) {
        trigger = callback;
      }
      observe() {}
      disconnect() {}
    };
    render(<LazySampleTripMap activeDay={2} />);
    expect(screen.queryByTestId("lazy-map")).not.toBeInTheDocument();

    act(() => trigger([{ isIntersecting: true }]));
    expect(screen.getByTestId("lazy-map")).toHaveAttribute("data-active-day", "2");
  });

  it("loads straight away where IntersectionObserver is missing", () => {
    delete globalThis.IntersectionObserver;
    render(<LazySampleTripMap activeDay={1} />);

    expect(screen.getByTestId("lazy-map")).toBeInTheDocument();
  });
});
