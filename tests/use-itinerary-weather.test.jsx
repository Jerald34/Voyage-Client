import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  fetchItineraryWeather: vi.fn(),
  fetchSharedItineraryWeather: vi.fn(),
}));

vi.mock("../app/lib/api/index.js", () => api);

import { useItineraryWeather } from "../app/hooks/useItineraryWeather.js";

const weather = {
  provider: "open-meteo",
  attribution: { text: "Weather data by Open-Meteo.com", url: "https://open-meteo.com/" },
  days: [{ dayId: "day-1", dayNumber: 1, date: "2026-10-10", status: "OK", weather: { kind: "FORECAST", condition: "RAIN" } }],
};

beforeEach(() => {
  api.fetchItineraryWeather.mockReset();
  api.fetchSharedItineraryWeather.mockReset();
});

describe("useItineraryWeather", () => {
  it("loads agency weather keyed by day id", async () => {
    api.fetchItineraryWeather.mockResolvedValue({ weather });

    const { result } = renderHook(() => useItineraryWeather({ agencyId: "agency-1", itineraryId: "it-1" }));

    await waitFor(() => expect(result.current.byDayId.get("day-1")?.status).toBe("OK"));
    expect(api.fetchItineraryWeather).toHaveBeenCalledWith("agency-1", "it-1");
    expect(result.current.attribution).toEqual(weather.attribution);
  });

  it("uses the public endpoint when given a share token", async () => {
    api.fetchSharedItineraryWeather.mockResolvedValue({ weather });

    const { result } = renderHook(() => useItineraryWeather({ shareToken: "share-token-12" }));

    await waitFor(() => expect(result.current.byDayId.size).toBe(1));
    expect(api.fetchSharedItineraryWeather).toHaveBeenCalledWith("share-token-12");
    expect(api.fetchItineraryWeather).not.toHaveBeenCalled();
  });

  it("does not fetch when disabled or missing ids", () => {
    renderHook(() => useItineraryWeather({ agencyId: "agency-1", itineraryId: "it-1", enabled: false }));
    renderHook(() => useItineraryWeather({ agencyId: "agency-1", itineraryId: null }));

    expect(api.fetchItineraryWeather).not.toHaveBeenCalled();
  });

  it("falls back to no weather on errors", async () => {
    api.fetchItineraryWeather.mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => useItineraryWeather({ agencyId: "agency-1", itineraryId: "it-1" }));

    await waitFor(() => expect(api.fetchItineraryWeather).toHaveBeenCalled());
    expect(result.current.byDayId.size).toBe(0);
    expect(result.current.attribution).toBeNull();
  });

  it("refetches when the itinerary version changes", async () => {
    api.fetchItineraryWeather.mockResolvedValue({ weather });

    const { rerender } = renderHook((props) => useItineraryWeather(props), {
      initialProps: { agencyId: "agency-1", itineraryId: "it-1", version: 1 },
    });
    await waitFor(() => expect(api.fetchItineraryWeather).toHaveBeenCalledTimes(1));

    rerender({ agencyId: "agency-1", itineraryId: "it-1", version: 2 });

    await waitFor(() => expect(api.fetchItineraryWeather).toHaveBeenCalledTimes(2));
  });
});
