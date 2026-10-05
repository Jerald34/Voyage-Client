import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app/components/icons/index.js", () => {
  const Icon = () => null;
  const isIcon = (name) => typeof name === "string" && name !== "then";
  return new Proxy(
    { __esModule: true },
    {
      get: (target, name) => (name in target ? target[name] : isIcon(name) ? Icon : undefined),
      has: (target, name) => name in target || isIcon(name),
    },
  );
});
vi.mock("next/dynamic", () => ({ default: () => function DynamicStub() { return null; } }));
vi.mock("../app/components/trip-dashboard/pages/CommentsPanel.jsx", () => ({ default: () => null }));

import StopWeatherTag from "../app/components/weather/StopWeatherTag.jsx";
import ItineraryDayView from "../app/components/trip-dashboard/pages/ItineraryDayView.jsx";
import CompactPlaceCard from "../app/components/trip-dashboard/mobile/CompactPlaceCard.jsx";

const dayWeather = {
  dayId: "day-1",
  dayNumber: 1,
  date: "2026-10-08",
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
};

const days = [
  {
    id: "day-1",
    dayNumber: 1,
    title: "Art, Views, and Delights",
    items: [
      { id: "s1", title: "BenCab Museum", type: "ACTIVITY", startTime: "09:00", endTime: "11:00" },
      { id: "s3", title: "Burnham Park", type: "ACTIVITY", startTime: "14:00", endTime: "16:30" },
    ],
  },
];

describe("StopWeatherTag", () => {
  it("shows the stop's outlook with a full sentence for screen readers", () => {
    render(<StopWeatherTag entry={dayWeather} itemId="s3" />);

    expect(screen.getByText("Storms likely")).toBeInTheDocument();
    expect(screen.getByText("Weather during this stop: Storms likely, up to 99% chance of rain")).toHaveClass("sr-only");
  });

  it("hides the visible label from screen readers and adds no duplicate title", () => {
    const { container } = render(<StopWeatherTag entry={dayWeather} itemId="s3" />);

    expect(screen.getByText("Storms likely")).toHaveAttribute("aria-hidden", "true");
    expect(container.firstChild).not.toHaveAttribute("title");
  });

  it("tags a snow stop", () => {
    const snowy = { ...dayWeather, hourly: { ...dayWeather.hourly, stops: [{ itemId: "s9", outlook: "SNOW", maxPrecipitationProbabilityPct: 80 }] } };
    render(<StopWeatherTag entry={snowy} itemId="s9" />);

    expect(screen.getByText("Snow likely")).toBeInTheDocument();
    expect(screen.getByText("Weather during this stop: Snow likely, up to 80% chance of rain")).toHaveClass("sr-only");
  });

  it("renders nothing without hourly data for the stop", () => {
    const { container } = render(<StopWeatherTag entry={dayWeather} itemId="unknown" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("stop weather on the itinerary", () => {
  it("tags each stop in the desktop day view and counts the stops in the storm window", () => {
    render(
      <ItineraryDayView
        agencyId="ag-1"
        selectedTripId="t1"
        selectedItineraryId="itin-1"
        fullItinerary={{ id: "itin-1", days }}
        safeDays={days}
        selectedDay={days[0]}
        selectedDayIndex={0}
        selectedDayMapItems={[]}
        activeStopIndex={-1}
        setActiveStopIndex={vi.fn()}
        tripStart={null}
        isLoadingItinerary={false}
        itineraryError={null}
        showCommentsPanel={false}
        setShowCommentsPanel={vi.fn()}
        theme="light"
        dayWeather={dayWeather}
      />,
    );

    expect(screen.getByText("Likely dry")).toBeInTheDocument();
    expect(screen.getByText("Storms likely")).toBeInTheDocument();
    expect(screen.getByText("Dry until 11 AM · about 19 mm of rain · 1 stop may see storms")).toBeInTheDocument();
  });

  it("tags the stop inside the mobile card's button", () => {
    render(<CompactPlaceCard item={days[0].items[1]} dayWeather={dayWeather} />);

    expect(within(screen.getByRole("button")).getByText("Storms likely")).toBeInTheDocument();
  });
});
