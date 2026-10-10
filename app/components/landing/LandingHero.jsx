// app/components/landing/LandingHero.jsx
"use client";

import { useState } from "react";
import SegmentedControl from "../admin/SegmentedControl.jsx";
import { ArrowRightIcon, SparkleIcon } from "../icons/index.js";
import { SampleDayHeader, SampleDayView } from "./SampleDay.jsx";
import { SAMPLE_DAY_OPTIONS, SAMPLE_DEFAULT_DAY, SAMPLE_TRIP } from "./sample/sampleTrip.js";
import { HERO } from "./landingContent.js";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "./landingClasses.js";

function PlayIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

/** Design A: the pitch beside a compact, live view of the real sample trip. */
export default function LandingHero({ onStartPlanning, onWatchDemo }) {
  const [day, setDay] = useState(String(SAMPLE_DEFAULT_DAY));

  return (
    <section
      aria-labelledby="landing-hero-title"
      className="mx-auto grid w-full max-w-[1220px] gap-10 px-4 pb-20 pt-14 md:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start"
    >
      <div className="lg:pt-8">
        <p className="m-0 text-[13px] font-semibold text-secondary-strong">{HERO.overline}</p>
        <h1
          id="landing-hero-title"
          className="mt-3 font-serif text-4xl font-normal leading-[1.08] tracking-tight text-text-primary md:text-5xl lg:text-[3.4rem]"
        >
          {HERO.title}
        </h1>
        <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-text-muted">{HERO.body}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button type="button" onClick={onStartPlanning} className={PRIMARY_BUTTON}>
            Start planning
            <ArrowRightIcon width={16} height={16} aria-hidden="true" />
          </button>
          <button type="button" onClick={onWatchDemo} className={SECONDARY_BUTTON}>
            <PlayIcon />
            Watch the demo
          </button>
        </div>
        <p className="mt-6 flex max-w-[52ch] gap-2 text-sm leading-relaxed text-text-muted">
          <SparkleIcon width={16} height={16} aria-hidden="true" className="mt-0.5 shrink-0 text-secondary-strong" />
          {HERO.sampleNote}
        </p>
      </div>

      <div className="grid gap-3 rounded-[22px] border border-border/15 bg-surface p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="m-0 font-sans text-[15px] font-semibold text-text-primary">{SAMPLE_TRIP.itinerary.title}</p>
          <SegmentedControl as="radio" size="sm" ariaLabel="Sample trip day" options={SAMPLE_DAY_OPTIONS} value={day} onChange={setDay} />
        </div>
        <SampleDayHeader dayNumber={day} />
        <SampleDayView dayNumber={day} compact />
        <a
          href="#sample-trip"
          className="inline-flex min-h-11 items-center justify-self-start rounded-pill text-sm font-semibold text-secondary-strong underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          See the full trip, map and notes
        </a>
      </div>
    </section>
  );
}
