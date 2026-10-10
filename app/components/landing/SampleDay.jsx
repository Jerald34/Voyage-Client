// app/components/landing/SampleDay.jsx
"use client";

import ShareStopCard from "../../itinerary/view/[token]/components/ShareStopCard.jsx";
import { formatTimeRange, itemTypeIcon } from "../../itinerary/view/[token]/components/stopDisplay.jsx";
import WeatherChip from "../weather/WeatherChip.jsx";
import { getDayColor } from "../../lib/trip-dashboard/dayColors.js";
import { getSampleDay, getSampleDayWeather } from "./sample/sampleTrip.js";

/** "Day 2 · Views & Shopping" with the day's colour dot and its one-line forecast. */
export function SampleDayHeader({ dayNumber }) {
  const day = getSampleDay(dayNumber);
  const color = getDayColor(day.dayNumber);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="m-0 flex items-center gap-2 font-sans text-sm font-semibold text-text-primary">
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color.fill }} />
        Day {day.dayNumber} · {day.title}
      </p>
      <WeatherChip entry={getSampleDayWeather(day)} />
    </div>
  );
}

/** One day of the sample trip as the share page's real stop cards. */
export function SampleDayView({ dayNumber, compact = false }) {
  const day = getSampleDay(dayNumber);
  const weather = getSampleDayWeather(day);
  return (
    <ol aria-label={`Day ${day.dayNumber} stops`} className="m-0 grid list-none gap-2.5 p-0">
      {day.items.map((item, index) => (
        <li key={item.id}>
          <ShareStopCard
            item={item}
            compact={compact}
            timeLabel={formatTimeRange(item.startTime, item.endTime)}
            dayWeather={weather}
            dayNumber={day.dayNumber}
            stopNumber={index + 1}
            icon={itemTypeIcon(item.type)}
          />
        </li>
      ))}
    </ol>
  );
}
