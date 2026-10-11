"use client";

import ShareLinkResult from "../../trip-dashboard/itinerary/ShareLinkResult.jsx";
import { SAMPLE_TRIP, getSampleShareUrl } from "../sample/sampleTrip.js";

/** The app's "Share link ready" view for the sample trip. Mounted only after a tab click, so `window` exists. */
export default function ShareLinkDemo() {
  const shareUrl = getSampleShareUrl(window.location.origin);
  return (
    <div className="rounded-[18px] border border-border/15 bg-surface p-4">
      <ShareLinkResult shareUrl={shareUrl} tripTitle={SAMPLE_TRIP.itinerary.title} />
    </div>
  );
}
