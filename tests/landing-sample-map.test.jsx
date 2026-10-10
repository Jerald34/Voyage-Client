// tests/landing-sample-map.test.jsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

vi.mock("../app/components/icons/index.js", async () => (await import("./helpers/iconsMock.js")).default);
vi.mock("leaflet/dist/leaflet.css", () => ({}));
vi.mock("leaflet", () => ({ default: { divIcon: (options) => options } }));
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children, style, dragging, touchZoom, doubleClickZoom, boxZoom, keyboard, zoomControl, scrollWheelZoom }) => (
    <div
      data-testid="map"
      data-background={style?.background}
      data-dragging={String(dragging)}
      data-touch-zoom={String(touchZoom)}
      data-double-click-zoom={String(doubleClickZoom)}
      data-box-zoom={String(boxZoom)}
      data-keyboard={String(keyboard)}
      data-zoom-control={String(zoomControl)}
      data-scroll-wheel-zoom={String(scrollWheelZoom)}
    >
      {children}
    </div>
  ),
  TileLayer: ({ url }) => <div data-testid="tiles" data-url={url} />,
  Polyline: ({ pathOptions, interactive }) => (
    <div data-testid="route" data-color={pathOptions.color} data-opacity={pathOptions.opacity} data-interactive={String(interactive)} />
  ),
  Marker: ({ title, icon, zIndexOffset }) => (
    <div data-testid="pin" title={title} data-html={icon.html} data-z-index-offset={zIndexOffset} />
  ),
}));
vi.mock("next/dynamic", () => ({
  default: () =>
    function DynamicMapStub({ activeDay }) {
      return <div data-testid="lazy-map" data-active-day={activeDay} />;
    },
}));

import ThemeProvider from "../app/components/theme/ThemeProvider.jsx";
import SampleTripMap from "../app/components/landing/SampleTripMap.jsx";
import LazySampleTripMap from "../app/components/landing/LazySampleTripMap.jsx";

const realIO = globalThis.IntersectionObserver;
afterEach(() => {
  globalThis.IntersectionObserver = realIO;
  localStorage.removeItem("voyage-theme");
  document.documentElement.classList.remove("dark");
});

const routeStyles = () => screen.getAllByTestId("route").map((r) => [r.dataset.color, r.dataset.opacity]);

describe("SampleTripMap", () => {
  it("pins every located stop in its day colour, numbered like its card", () => {
    render(<SampleTripMap activeDay={2} />);

    const pins = screen.getAllByTestId("pin");
    expect(pins).toHaveLength(8);
    const mall = screen.getByTitle("Day 2, stop 4: SM City Baguio");
    expect(mall.dataset.html).toContain("#0F766E");
    expect(mall.dataset.html).toContain(">4<");
  });

  it("lifts the active day's pins above the others and hides the number from screen readers", () => {
    render(<SampleTripMap activeDay={2} />);

    const pins = screen.getAllByTestId("pin");
    const dayOne = pins.filter((pin) => pin.title.startsWith("Day 1,"));
    const dayTwo = pins.filter((pin) => pin.title.startsWith("Day 2,"));
    expect(dayOne.length + dayTwo.length).toBe(pins.length);
    expect(dayOne.length).toBeGreaterThan(0);
    expect(dayTwo.length).toBeGreaterThan(0);
    dayOne.forEach((pin) => expect(pin.dataset.zIndexOffset).toBe("0"));
    dayTwo.forEach((pin) => expect(pin.dataset.zIndexOffset).toBe("1000"));
    pins.forEach((pin) => {
      expect(pin.dataset.html).toContain('aria-hidden="true"');
      expect(pin.dataset.html).toContain("var(--font-sans)");
    });
  });

  it("draws one route per day, dims the day not shown and draws the active one last", () => {
    const { unmount } = render(<SampleTripMap activeDay={2} />);
    expect(routeStyles()).toEqual([
      ["#B4532A", "0.3"],
      ["#0F766E", "0.9"],
    ]);
    unmount();

    render(<SampleTripMap activeDay={1} />);
    expect(routeStyles()).toEqual([
      ["#0F766E", "0.3"],
      ["#B4532A", "0.9"],
    ]);
  });

  it("draws the routes as plain lines: they do nothing on click, so they aren't interactive", () => {
    render(<SampleTripMap activeDay={2} />);

    const routes = screen.getAllByTestId("route");
    expect(routes.length).toBeGreaterThan(0);
    routes.forEach((route) => expect(route.dataset.interactive).toBe("false"));
  });

  it("is a static picture: no drag, zoom or keyboard handlers, so it can't trap a swipe", () => {
    render(<SampleTripMap activeDay={2} />);

    const map = screen.getByTestId("map");
    for (const key of ["dragging", "touchZoom", "doubleClickZoom", "boxZoom", "keyboard", "zoomControl", "scrollWheelZoom"]) {
      expect(map.dataset[key], key).toBe("false");
    }
    expect(map.dataset.background).toBe("var(--color-surface)");
  });

  it("uses the light CARTO tiles by default", () => {
    render(<SampleTripMap activeDay={2} />);

    expect(screen.getByTestId("tiles").dataset.url).toContain("rastertiles/voyager");
  });

  it("uses the dark CARTO tiles in dark mode", () => {
    localStorage.setItem("voyage-theme", "dark");
    render(
      <ThemeProvider>
        <SampleTripMap activeDay={2} />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("tiles").dataset.url).toContain("dark_all");
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
