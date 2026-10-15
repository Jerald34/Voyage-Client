import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchItineraryWeather = vi.fn();
vi.mock("../app/lib/api/index.js", async (importOriginal) => ({
  ...(await importOriginal()),
  fetchItineraryWeather: (...args) => fetchItineraryWeather(...args),
}));

import RichItineraryMessage from "../app/components/trip-dashboard/command-center/RichItineraryMessage.jsx";
import AgentCommandCenter from "../app/components/trip-dashboard/command-center/AgentCommandCenter.jsx";
import { buildWeatherByDayId, getWeatherRefreshKey, isMissingTripDates } from "../app/lib/weather/weatherDisplay.js";

const attribution = { text: "Weather data by Open-Meteo.com", url: "https://open-meteo.com/" };

const itinerary = {
  id: "itin-draft",
  version: 1,
  title: "2-Day Baguio Draft",
  days: [
    {
      id: "day-1",
      dayNumber: 1,
      title: "Art and views",
      items: [
        {
          id: "s1",
          title: "BenCab Museum",
          startTime: "09:00",
          endTime: "11:00",
          placeSnapshot: { id: "snap-1", name: "BenCab Museum", latitude: 16.41, longitude: 120.55 },
        },
        {
          id: "s3",
          title: "Burnham Park",
          startTime: "14:00",
          endTime: "16:30",
          placeSnapshot: { id: "snap-3", name: "Burnham Park", latitude: 16.41, longitude: 120.59 },
        },
      ],
    },
  ],
};

const okWeather = {
  provider: "open-meteo",
  attribution,
  days: [
    {
      dayId: "day-1",
      dayNumber: 1,
      date: "2026-10-18",
      status: "OK",
      weather: {
        kind: "FORECAST",
        condition: "THUNDERSTORM",
        temperatureMinC: 15.5,
        temperatureMaxC: 23.6,
        precipitationProbabilityPct: 99,
        precipitationMm: 19.3,
      },
      hourly: {
        firstWetHour: 11,
        wetWindow: { condition: "THUNDERSTORM", fromHour: 14, toHour: 20 },
        stops: [
          { itemId: "s1", outlook: "DRY", maxPrecipitationProbabilityPct: 45 },
          { itemId: "s3", outlook: "STORM", maxPrecipitationProbabilityPct: 99 },
        ],
      },
    },
  ],
};

const undatedWeather = {
  provider: "open-meteo",
  attribution,
  days: [{ dayId: "day-1", dayNumber: 1, date: null, status: "NO_DATE", weather: null }],
};

describe("draft itinerary weather in chat", () => {
  it("shows the day summary, each stop's outlook and the credit on the draft card", () => {
    render(
      <RichItineraryMessage
        itinerary={itinerary}
        weather={{ byDayId: buildWeatherByDayId(okWeather), attribution }}
      />,
    );

    expect(screen.getByRole("region", { name: "Day weather" })).toBeInTheDocument();
    const stormStop = screen.getByText("Burnham Park", { selector: "h4" }).closest("div.group");
    expect(within(stormStop).getByText("Storms likely")).toBeInTheDocument();
    expect(within(stormStop).getByText(/weather during this stop: storms likely/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: attribution.text })).toBeInTheDocument();
    expect(screen.queryByText(/tell the agent the travel dates/i)).not.toBeInTheDocument();
  });

  it("asks for travel dates when no day has a date yet", () => {
    render(
      <RichItineraryMessage
        itinerary={itinerary}
        weather={{ byDayId: buildWeatherByDayId(undatedWeather), attribution }}
      />,
    );

    expect(screen.getByText(/tell the agent the travel dates/i)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Day weather" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: attribution.text })).not.toBeInTheDocument();
  });

  it("renders no weather and no hint before any weather arrives", () => {
    render(<RichItineraryMessage itinerary={itinerary} />);
    expect(screen.queryByRole("region", { name: "Day weather" })).not.toBeInTheDocument();
    expect(screen.queryByText(/tell the agent the travel dates/i)).not.toBeInTheDocument();
  });
});

describe("AgentCommandCenter draft weather", () => {
  beforeEach(() => {
    fetchItineraryWeather.mockReset();
    fetchItineraryWeather.mockResolvedValue({ weather: okWeather });
  });

  const baseProps = {
    messages: [{ id: "m1", role: "assistant", content: "Here is the draft.", itineraryId: "itin-draft" }],
    assistantMessage: "",
    toolCalls: [],
    thoughtEntries: [],
    composerInput: "",
    setComposerInput: () => {},
    isSending: false,
    user: { displayName: "Jerald" },
    agencyId: "agency-1",
    hideChatInput: true,
  };

  it("fetches the draft's weather and shows it on the itinerary reply", async () => {
    render(<AgentCommandCenter {...baseProps} isStreaming={false} itinerary={itinerary} />);

    await waitFor(() => expect(screen.getByRole("region", { name: "Day weather" })).toBeInTheDocument());
    expect(fetchItineraryWeather).toHaveBeenCalledTimes(1);
    expect(fetchItineraryWeather).toHaveBeenCalledWith("agency-1", "itin-draft");
  });

  it("waits for the run to settle before refetching after the stops change", async () => {
    const { rerender } = render(<AgentCommandCenter {...baseProps} isStreaming={false} itinerary={itinerary} />);
    await waitFor(() => expect(fetchItineraryWeather).toHaveBeenCalledTimes(1));

    const withNewStop = {
      ...itinerary,
      days: [{ ...itinerary.days[0], items: [...itinerary.days[0].items, { id: "s4", title: "Night market", startTime: "18:00", placeSnapshot: { latitude: 16.41, longitude: 120.6 } }] }],
    };
    rerender(<AgentCommandCenter {...baseProps} isStreaming itinerary={withNewStop} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchItineraryWeather).toHaveBeenCalledTimes(1);

    rerender(<AgentCommandCenter {...baseProps} isStreaming={false} itinerary={withNewStop} />);
    await waitFor(() => expect(fetchItineraryWeather).toHaveBeenCalledTimes(2));
  });

  it("does not ask for weather without an agency", () => {
    render(<AgentCommandCenter {...baseProps} agencyId={null} isStreaming={false} itinerary={itinerary} />);
    expect(fetchItineraryWeather).not.toHaveBeenCalled();
  });
});

describe("draft weather helpers", () => {
  it("changes the refresh key when a day date or a stop location changes", () => {
    const base = getWeatherRefreshKey(itinerary);
    const dated = { ...itinerary, days: [{ ...itinerary.days[0], date: "2026-10-18" }] };
    const moved = {
      ...itinerary,
      days: [{ ...itinerary.days[0], items: [{ ...itinerary.days[0].items[0], placeSnapshot: { latitude: 1, longitude: 2 } }, itinerary.days[0].items[1]] }],
    };
    expect(getWeatherRefreshKey(dated)).not.toBe(base);
    expect(getWeatherRefreshKey(moved)).not.toBe(base);
    expect(getWeatherRefreshKey({ ...itinerary, title: "Renamed" })).toBe(base);
    expect(getWeatherRefreshKey(null)).toBeNull();
  });

  it("reports missing trip dates only when every day lacks one", () => {
    expect(isMissingTripDates(buildWeatherByDayId(undatedWeather))).toBe(true);
    expect(isMissingTripDates(buildWeatherByDayId(okWeather))).toBe(false);
    expect(isMissingTripDates(new Map())).toBe(false);
    expect(isMissingTripDates(null)).toBe(false);
  });
});
