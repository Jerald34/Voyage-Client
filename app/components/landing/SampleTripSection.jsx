// app/components/landing/SampleTripSection.jsx
"use client";

import { useState } from "react";
import SegmentedControl from "../admin/SegmentedControl.jsx";
import DayWeatherSummary from "../weather/DayWeatherSummary.jsx";
import LazySampleTripMap from "./LazySampleTripMap.jsx";
import { SampleDayHeader, SampleDayView } from "./SampleDay.jsx";
import {
  SAMPLE_DAY_OPTIONS,
  SAMPLE_DEFAULT_DAY,
  SAMPLE_WEATHER_ATTRIBUTION,
  getSampleDay,
  getSampleDayWeather,
} from "./sample/sampleTrip.js";
import { SAMPLE_CALLOUTS, SAMPLE_SECTION } from "./landingContent.js";

/** Design B: the full sample trip, numbered notes on what it shows, and its map. */
export default function SampleTripSection() {
  const [day, setDay] = useState(String(SAMPLE_DEFAULT_DAY));
  const weather = getSampleDayWeather(getSampleDay(day));

  return (
    <section id="sample-trip" aria-labelledby="sample-trip-title" className="mx-auto w-full max-w-[1220px] scroll-mt-24 px-4 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="sample-trip-title" className="m-0 font-sans text-2xl font-semibold text-text-primary md:text-3xl">
            {SAMPLE_SECTION.title}
          </h2>
          <p className="mt-2 max-w-[60ch] text-base leading-relaxed text-text-muted">{SAMPLE_SECTION.body}</p>
        </div>
        <SegmentedControl as="radio" size="sm" ariaLabel="Day shown in the sample trip" options={SAMPLE_DAY_OPTIONS} value={day} onChange={setDay} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <div className="grid content-start gap-3">
          {/* The summary below carries the forecast; the header's chip would show it twice. */}
          <SampleDayHeader dayNumber={day} showWeather={false} />
          {weather?.status === "PAST" ? (
            // Day 1's entry is saved as PAST (no forecast for a day already gone), so the summary would render nothing.
            <p className="m-0 text-sm text-text-muted">This day had passed when the sample was saved, so it has no forecast.</p>
          ) : (
            <DayWeatherSummary entry={weather} attribution={SAMPLE_WEATHER_ATTRIBUTION} />
          )}
          <SampleDayView dayNumber={day} />
        </div>
        <div className="grid content-start gap-6">
          <ol role="list" aria-label="What this sample shows" className="m-0 grid list-none gap-4 p-0">
            {SAMPLE_CALLOUTS.map((callout, index) => (
              <li key={callout.title} className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-3">
                <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-on-primary">
                  {index + 1}
                </span>
                <div>
                  <h3 className="m-0 font-sans text-[15px] font-semibold text-text-primary">{callout.title}</h3>
                  <p className="m-0 mt-1 text-sm leading-relaxed text-text-muted">{callout.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <LazySampleTripMap activeDay={Number(day)} />
        </div>
      </div>
    </section>
  );
}
