"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { useInView } from "../../hooks/useInView.js";

const SampleTripMap = dynamic(() => import("./SampleTripMap.jsx"), { ssr: false });

/** Reserves the map's space and only loads Leaflet and its tiles when the section is near. */
export default function LazySampleTripMap({ activeDay }) {
  const ref = useRef(null);
  const inView = useInView(ref);
  return (
    <figure className="m-0 grid gap-2">
      <div
        ref={ref}
        className="relative isolate h-[300px] overflow-hidden rounded-xl border border-border/15 bg-surface lg:h-[340px]"
      >
        {inView ? <SampleTripMap activeDay={activeDay} /> : null}
      </div>
      <figcaption className="text-[12px] leading-snug text-text-muted">
        Each pin is a stop, numbered and coloured like its card. Day {activeDay} is highlighted.
      </figcaption>
    </figure>
  );
}
