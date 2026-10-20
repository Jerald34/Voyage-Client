"use client";

import { useId } from "react";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/app/lib/relativeTime";
import HeroContinueCard from "./HeroContinueCard";
import RecentlyViewedPanel from "./RecentlyViewedPanel";
import TripStatusChip from "./TripStatusChip";

/** Buttons dip to 97% while pressed. `scale` is the property Tailwind's scale utilities set, so it must be the one transitioned. */
const PRESS = "transition-[color,background-color,scale] duration-150 ease-out active:scale-[0.97]";

function RecentTripButton({ trip, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`frame-tile flex w-full flex-col gap-1 rounded-[12px] px-3 py-2 text-left hover:bg-text-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${PRESS}`}
    >
      <span className="flex min-w-0 items-start justify-between gap-2">
        <span className="truncate text-[13px] font-semibold leading-snug text-text-primary">{trip.tripTitle}</span>
        <TripStatusChip status={trip.statusChip} />
      </span>
      <span className="flex items-end justify-between gap-2">
        <span className="truncate text-[12px] text-text-muted">{trip.clientName}</span>
        <span className="shrink-0 text-[12px] tabular-nums text-text-muted">{timeAgo(trip.updatedAt, Date.now())}</span>
      </span>
    </button>
  );
}

function PipelineCounter({ label, value, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`frame-tile flex flex-col items-start rounded-[12px] px-3 py-2 text-left hover:bg-text-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${PRESS}`}
    >
      <span className="text-[20px] font-semibold leading-none tabular-nums text-text-primary">{value ?? 0}</span>
      <span className="mt-1 text-[12px] text-text-muted">{label}</span>
    </button>
  );
}

/**
 * The staff dashboard's right column: continue the latest trip, the trips by
 * status (each count opens the filtered list), the recently viewed
 * itineraries (rows call `onOpenViewedTrip`; left out without `recentViews`)
 * and up to three recent trips.
 */
export default function MyWorkColumn({
  hero,
  recent = [],
  pipeline,
  agencyId,
  onOpenTrip,
  onOpenItineraries,
  recentViews,
  onOpenViewedTrip,
}) {
  const router = useRouter();
  const headingId = useId();

  function goToList(status) {
    if (onOpenItineraries) {
      onOpenItineraries(status);
      return;
    }
    router.push(`/agency/${agencyId}/trip?status=${status}`);
  }

  return (
    <aside aria-labelledby={headingId} className="frame-tile flex min-w-0 flex-col gap-4 self-start rounded-[20px] p-4">
      <h2 id={headingId} className="font-sans text-[15px] font-semibold tracking-normal text-text-primary">
        Your work
      </h2>

      <HeroContinueCard trip={hero} onContinue={onOpenTrip} />

      {pipeline ? (
        <div>
          <h3 className="mb-2 font-sans text-[13px] font-semibold tracking-normal text-text-primary">Your trips</h3>
          <div role="group" aria-label="Your trips by status" className="grid grid-cols-2 gap-2">
            <PipelineCounter label="Drafts" value={pipeline.drafts} onClick={() => goToList("DRAFT")} />
            <PipelineCounter label="In review" value={pipeline.inReview} onClick={() => goToList("IN_REVIEW")} />
            <PipelineCounter
              label="Approved this month"
              value={pipeline.approvedThisMonth}
              onClick={() => goToList("APPROVED_INTERNAL")}
            />
            <PipelineCounter label="Traveling now" value={pipeline.activeNow} onClick={() => goToList("ACTIVE")} />
          </div>
        </div>
      ) : null}

      {Array.isArray(recentViews) ? <RecentlyViewedPanel views={recentViews} onOpenTrip={onOpenViewedTrip} /> : null}

      {recent.length > 0 ? (
        <div>
          <h3 className="mb-2 font-sans text-[13px] font-semibold tracking-normal text-text-primary">Recent trips</h3>
          <div className="flex flex-col gap-2">
            {recent.slice(0, 3).map((trip) => (
              <RecentTripButton key={trip.tripId} trip={trip} onClick={() => onOpenTrip(trip.tripId)} />
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
