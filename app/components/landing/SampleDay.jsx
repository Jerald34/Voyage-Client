// app/components/landing/SampleDay.jsx
"use client";

import ShareStopCard from "../../itinerary/view/[token]/components/ShareStopCard.jsx";
import { formatTimeRange, itemTypeIcon } from "../../itinerary/view/[token]/components/stopDisplay.jsx";
import WeatherChip from "../weather/WeatherChip.jsx";
import { getDayColor } from "../../lib/trip-dashboard/dayColors.js";
import { getSampleDay, getSampleDayWeather } from "./sample/sampleTrip.js";
import { Reveal, RevealGroup, RevealItem } from "./landingMotion.jsx";

/**
 * "Day 2 · Views & Shopping" with the day's colour dot and, unless `showWeather` is off, its one-line forecast.
 * `animateChip` pops the forecast in once the hero's stops have landed.
 */
export function SampleDayHeader({ dayNumber, showWeather = true, animateChip = false }) {
  const day = getSampleDay(dayNumber);
  const color = getDayColor(day.dayNumber);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="m-0 flex items-center gap-2 font-sans text-sm font-semibold text-text-primary">
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color.fill }} />
        Day {day.dayNumber} · {day.title}
      </p>
      {showWeather && animateChip ? (
        <Reveal as="span" variant="pop" onLoad delay={1.1} className="inline-flex">
          <WeatherChip entry={getSampleDayWeather(day)} />
        </Reveal>
      ) : showWeather ? (
        <WeatherChip entry={getSampleDayWeather(day)} />
      ) : null}
    </div>
  );
}

/**
 * One day of the sample trip as the share page's real stop cards. They come in one after another (on load with `onLoad`,
 * otherwise when scrolled to) and again on every day switch, and each number badge pops once its card lands.
 */
export function SampleDayView({ dayNumber, compact = false, onLoad = false }) {
  const day = getSampleDay(dayNumber);
  const weather = getSampleDayWeather(day);
  return (
    // role="list": Safari and VoiceOver drop list semantics from a list-style:none list.
    // Keyed by day, so switching days remounts the list and replays the cascade.
    <RevealGroup
      key={day.dayNumber}
      as="ol"
      onLoad={onLoad}
      delay={onLoad ? 0.4 : 0}
      gap={0.12}
      role="list"
      aria-label={`Day ${day.dayNumber} stops`}
      className="landing-stops m-0 grid list-none gap-2.5 p-0"
      style={{ "--stop-base": onLoad ? "400ms" : "0ms" }}
    >
      {day.items.map((item, index) => (
        <RevealItem as="li" key={item.id} style={{ "--stop-index": index }}>
          <ShareStopCard
            item={item}
            compact={compact}
            timeLabel={formatTimeRange(item.startTime, item.endTime)}
            dayWeather={weather}
            dayNumber={day.dayNumber}
            stopNumber={index + 1}
            icon={itemTypeIcon(item.type)}
          />
        </RevealItem>
      ))}
    </RevealGroup>
  );
}
