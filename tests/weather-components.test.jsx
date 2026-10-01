import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WeatherChip from "../app/components/weather/WeatherChip.jsx";
import DayWeatherSummary from "../app/components/weather/DayWeatherSummary.jsx";

const attribution = { text: "Weather data by Open-Meteo.com", url: "https://open-meteo.com/" };

const rainy = {
  dayId: "day-1",
  status: "OK",
  weather: {
    kind: "FORECAST",
    condition: "RAIN",
    temperatureMinC: 16.2,
    temperatureMaxC: 23.4,
    precipitationProbabilityPct: 85,
    uvIndexMax: 5,
    windSpeedMaxKph: 14,
    sampleYears: null,
    wetYears: null,
  },
};

const typical = {
  dayId: "day-2",
  status: "OK",
  weather: {
    kind: "TYPICAL",
    condition: "PARTLY_CLOUDY",
    temperatureMinC: 15,
    temperatureMaxC: 22.7,
    precipitationProbabilityPct: 40,
    uvIndexMax: null,
    windSpeedMaxKph: 10,
    sampleYears: 5,
    wetYears: 2,
  },
};

describe("WeatherChip", () => {
  it("shows compact text and a full sentence for screen readers", () => {
    render(<WeatherChip entry={rainy} />);

    expect(screen.getByText("16–23°C · 85% rain")).toBeInTheDocument();
    expect(screen.getByText("Forecast: Rain, 16–23°C, 85% chance of rain")).toHaveClass("sr-only");
  });

  it("marks typical weather as typical", () => {
    render(<WeatherChip entry={typical} />);

    expect(screen.getByText("Typical · 15–23°C · rain 2/5 yrs")).toBeInTheDocument();
  });

  it("renders nothing without usable weather", () => {
    const { container } = render(<WeatherChip entry={{ status: "NO_DATE", weather: null }} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("DayWeatherSummary", () => {
  it("shows the forecast, advice and credit", () => {
    render(<DayWeatherSummary entry={rainy} attribution={attribution} />);

    const region = screen.getByRole("region", { name: "Day weather" });
    expect(region).toHaveTextContent("Forecast: Rain");
    expect(region).toHaveTextContent("85% chance of rain");
    expect(screen.getByText("Plan indoor stops or bring rain gear.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Weather data by Open-Meteo.com" })).toHaveAttribute("href", "https://open-meteo.com/");
  });

  it("explains that typical weather is not a forecast", () => {
    render(<DayWeatherSummary entry={typical} attribution={attribution} />);

    expect(screen.getByRole("region", { name: "Day weather" })).toHaveTextContent("Typical weather: Partly cloudy");
    expect(screen.getByText("Based on the same dates in past years — not a forecast.")).toBeInTheDocument();
  });

  it("renders nothing without usable weather", () => {
    const { container } = render(<DayWeatherSummary entry={null} attribution={attribution} />);

    expect(container).toBeEmptyDOMElement();
  });
});
