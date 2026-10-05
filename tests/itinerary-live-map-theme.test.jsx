import { afterEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

const captured = vi.hoisted(() => ({ mapProps: [] }));

// Record the props the real <Map> would get; nothing inside it renders in jsdom.
vi.mock("@vis.gl/react-google-maps", () => ({
  APIProvider: ({ children }) => children,
  Map: (props) => {
    captured.mapProps.push(props);
    return null;
  },
  AdvancedMarker: () => null,
  Pin: () => null,
  useMap: () => null,
  useMapsLibrary: () => null,
}));

import ThemeProvider from "../app/components/theme/ThemeProvider.jsx";
import ItineraryLiveMap, { getMapAppearance } from "../app/components/trip-dashboard/itinerary/ItineraryLiveMap.jsx";

afterEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  captured.mapProps.length = 0;
});

describe("map appearance", () => {
  it("keeps the cloud map ID in dark mode and only switches the colour scheme", () => {
    const light = getMapAppearance("light");
    const dark = getMapAppearance("dark");

    expect(dark.mapId).toBe(light.mapId);
    expect(dark.mapId).not.toMatch(/placeholder/);
    expect(light).toMatchObject({ isDark: false, colorScheme: "LIGHT" });
    expect(dark).toMatchObject({ isDark: true, colorScheme: "DARK" });
  });

  it("follows the app theme when the page passes no theme (public share link)", async () => {
    localStorage.setItem("voyage-theme", "dark");

    render(
      <ThemeProvider>
        <ItineraryLiveMap items={[]} />
      </ThemeProvider>,
    );

    await waitFor(() => expect(captured.mapProps.at(-1)?.colorScheme).toBe("DARK"));
    expect(captured.mapProps.at(-1).mapId).toBe(getMapAppearance("dark").mapId);
  });

  it("lets an explicit theme prop win over the app theme", async () => {
    localStorage.setItem("voyage-theme", "dark");

    render(
      <ThemeProvider>
        <ItineraryLiveMap items={[]} theme="light" />
      </ThemeProvider>,
    );

    await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
    expect(captured.mapProps.at(-1).colorScheme).toBe("LIGHT");
  });
});
