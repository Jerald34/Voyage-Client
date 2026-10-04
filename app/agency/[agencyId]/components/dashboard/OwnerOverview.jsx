"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDashboardPoll } from "../../../../hooks/useDashboardPoll";
import AgencyCalendar from "./widgets/AgencyCalendar";
import DashboardGreeting from "./widgets/DashboardGreeting";
import DashboardStaleBanner from "./widgets/DashboardStaleBanner";
import { DASHBOARD_GRID_CLASS, NeedsYouSkeleton, SideColumnSkeleton } from "./widgets/DashboardSkeleton";
import InsightsColumn from "./widgets/InsightsColumn";
import JoinedNotice from "./widgets/JoinedNotice";
import NeedsYouList from "./widgets/NeedsYouList";
import TripSlideOver from "./TripSlideOver";
import { OWNER_NEEDS_YOU_ORDER, buildNeedsYouItems } from "./needsYouItems";

/**
 * Owner/admin dashboard: greeting, "Needs you today" and the calendar on the
 * left, Insights (KPIs, trip progress, recently viewed itineraries, reviews)
 * on the right.
 * Comment rows, calendar actions and Recently viewed rows open the trip
 * slide-over; other to-do rows open the trip in the Command Center.
 * The calendar loads on its own, so it is always mounted: only the parts that
 * need the dashboard payload wait for it, or say it failed.
 */
export default function OwnerOverview({
  agencyId,
  initialData = null,
  viewerName,
  onOpenTrip,
  onNewTrip,
  showJoinedNotice = false,
}) {
  const router = useRouter();
  const [period, setPeriod] = useState("30d");
  const [slideTrip, setSlideTrip] = useState(null); // { tripId, tripTitle, subtitle }
  // Bumped after a reply so the calendar reloads at once, not at its next poll.
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  // Where the slide-over returns focus if the row that opened it was removed by
  // a poll. Also the fallback for slide-overs opened from the Recently viewed card.
  const needsYouRef = useRef(null);

  const { data, isStale, isFetching, error, refetch } = useDashboardPoll({
    agencyId,
    view: "owner",
    period,
    initialData,
  });

  // No data and no failure yet means the first load is still in flight.
  const isLoading = !data && !error;

  const needsYou = buildNeedsYouItems(data?.worklist, OWNER_NEEDS_YOU_ORDER);

  function openSlideOver(tripId, tripTitle, subtitle) {
    setSlideTrip({ tripId, tripTitle: tripTitle ?? "Trip", subtitle: subtitle ?? null });
  }

  function openInCommandCenter(tripId) {
    if (onOpenTrip) {
      onOpenTrip(tripId);
      return;
    }
    router.push(`/agency/${agencyId}/trip/${tripId}`);
  }

  function handleNewTrip() {
    if (onNewTrip) {
      onNewTrip();
      return;
    }
    router.push(`/agency/${agencyId}/trip/new`);
  }

  function handleNeedsYouAction(item) {
    if (item.kind === "unreadComments") openSlideOver(item.tripId, item.tripTitle, item.clientName);
    else openInCommandCenter(item.tripId);
  }

  // A reply changes what needs the agent: reload the to-do list and the calendar now.
  function handleReplied() {
    refetch().catch(() => {}); // a failed refetch already shows the stale-data banner
    setCalendarRefreshKey((key) => key + 1);
  }

  return (
    <div className="px-6 py-6 md:px-8 lg:px-10">
      {showJoinedNotice && <JoinedNotice className="mb-5" />}

      <DashboardGreeting name={viewerName} count={data ? needsYou.length : null} onNewTrip={handleNewTrip} />

      {(isStale || error) && <DashboardStaleBanner hasData={!!data} onRetry={refetch} />}

      <div className={DASHBOARD_GRID_CLASS}>
        <div className="min-w-0 space-y-5">
          {data ? <NeedsYouList ref={needsYouRef} items={needsYou} onAction={handleNeedsYouAction} /> : isLoading ? <NeedsYouSkeleton /> : null}
          <AgencyCalendar agencyId={agencyId} onOpenTrip={openSlideOver} refreshKey={calendarRefreshKey} />
        </div>
        {data ? (
          <InsightsColumn
            data={data}
            period={period}
            onPeriodChange={setPeriod}
            isFetching={isFetching}
            agencyId={agencyId}
            onOpenViewedTrip={openSlideOver}
          />
        ) : isLoading ? (
          <SideColumnSkeleton label="Loading insights" />
        ) : null}
      </div>

      <TripSlideOver
        isOpen={!!slideTrip}
        onClose={() => setSlideTrip(null)}
        agencyId={agencyId}
        tripId={slideTrip?.tripId}
        tripTitle={slideTrip?.tripTitle}
        subtitle={slideTrip?.subtitle}
        returnFocusRef={needsYouRef}
        onReplied={handleReplied}
        onOpenFull={(tripId) => {
          setSlideTrip(null);
          openInCommandCenter(tripId);
        }}
      />
    </div>
  );
}
