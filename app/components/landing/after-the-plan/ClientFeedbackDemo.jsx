"use client";

import ShareStopCard from "../../../itinerary/view/[token]/components/ShareStopCard.jsx";
import ProposalRating from "../../../itinerary/view/[token]/components/ProposalRating.jsx";
import { formatTimeRange, itemTypeIcon } from "../../../itinerary/view/[token]/components/stopDisplay.jsx";
import { getSampleDay, getSampleDayWeather } from "../sample/sampleTrip.js";

const DAY = getSampleDay(2);
const STOP = DAY.items[0];

/** What the client sees: a stop as on their share page, and the proposal rating (demo: nothing is sent). */
export default function ClientFeedbackDemo() {
  return (
    <div className="grid gap-4">
      <ShareStopCard
        item={STOP}
        timeLabel={formatTimeRange(STOP.startTime, STOP.endTime)}
        dayWeather={getSampleDayWeather(DAY)}
        dayNumber={DAY.dayNumber}
        stopNumber={1}
        icon={itemTypeIcon(STOP.type)}
      />
      <ProposalRating token="landing-sample" demo />
    </div>
  );
}
