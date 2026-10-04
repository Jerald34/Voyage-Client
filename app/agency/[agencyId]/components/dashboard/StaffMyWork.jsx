"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useDashboardPoll from "@/app/hooks/useDashboardPoll";
import AgencyCalendar from "./widgets/AgencyCalendar";
import DashboardGreeting from "./widgets/DashboardGreeting";
import DashboardStaleBanner from "./widgets/DashboardStaleBanner";
import { DASHBOARD_GRID_CLASS, NeedsYouSkeleton, SideColumnSkeleton } from "./widgets/DashboardSkeleton";
import JoinedNotice from "./widgets/JoinedNotice";
import MyWorkColumn from "./widgets/MyWorkColumn";
import NeedsYouList from "./widgets/NeedsYouList";
import TripSlideOver from "./TripSlideOver";
import { STAFF_NEEDS_YOU_ORDER, buildNeedsYouItems } from "./needsYouItems";

/**
 * Staff dashboard: greeting, "Needs you today" and the calendar (scoped by
 * the server to trips this person created or organizes) on the left, their
 * own work on the right. Nothing here depends on a period, so there is no
 * period switcher.
 * The calendar loads on its own, so it is always mounted: only the parts that
 * need the dashboard payload wait for it, or say it failed.
 */
export default function StaffMyWork({
  agencyId,
  initialData = null,
  viewerName,
  onOpenTrip,
  onNewTrip,
  onOpenItineraries,
  showJoinedNotice = false,
}) {
  const router = useRouter();

  const { data, isStale, error, refetch } = useDashboardPoll({
    agencyId,
    view: "staff",
    period: "30d",
    initialData,
  });

  // The poll only flips isFetching on after mount, so waiting on it would paint
  // one frame of "All caught up" first. No data and no failure yet means loading.
  const isLoading = !data && !error;
  const [slideTrip, setSlideTrip] = useState(null); // { tripId, tripTitle, subtitle }
  // Bumped after a reply so the calendar reloads at once, not at its next poll.
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  // Where the slide-over returns focus if the row that opened it was removed by a poll.
  const needsYouRef = useRef(null);
  const needsYou = buildNeedsYouItems(data?.worklist, STAFF_NEEDS_YOU_ORDER);

  const openTripSlide = (tripId, tripTitle, subtitle) => {
    setSlideTrip({ tripId, tripTitle: tripTitle ?? "Trip", subtitle: subtitle ?? null });
  };

  const openTrip = (tripId) => {
    if (onOpenTrip) {
      onOpenTrip(tripId);
      return;
    }
    router.push(`/agency/${agencyId}/trip/${tripId}/agent`);
  };

  const newTrip = () => {
    if (onNewTrip) {
      onNewTrip();
      return;
    }
    router.push(`/agency/${agencyId}/trip/new`);
  };

  function handleNeedsYouAction(item) {
    if (item.kind === "unreadComments") openTripSlide(item.tripId, item.tripTitle, item.clientName);
    else openTrip(item.tripId);
  }

  // A reply changes what needs the agent: reload the to-do list and the calendar now.
  function handleReplied() {
    refetch().catch(() => {}); // a failed refetch already shows the stale-data banner
    setCalendarRefreshKey((key) => key + 1);
  }

  return (
    <div className="px-6 py-6 md:px-8 lg:px-10">
      {showJoinedNotice && <JoinedNotice className="mb-5" />}

      <DashboardGreeting name={viewerName} count={data ? needsYou.length : null} onNewTrip={newTrip} />

      {(isStale || error) && <DashboardStaleBanner hasData={!!data} onRetry={refetch} />}

      <div className={DASHBOARD_GRID_CLASS}>
        <div className="min-w-0 space-y-5">
          {data ? <NeedsYouList ref={needsYouRef} items={needsYou} onAction={handleNeedsYouAction} /> : isLoading ? <NeedsYouSkeleton /> : null}
          <AgencyCalendar agencyId={agencyId} onOpenTrip={openTripSlide} refreshKey={calendarRefreshKey} />
        </div>
        {data ? (
          <MyWorkColumn
            hero={data.hero ?? null}
            recent={data.secondaryRecent ?? []}
            pipeline={data.pipeline ?? null}
            agencyId={agencyId}
            onOpenTrip={openTrip}
            onOpenItineraries={onOpenItineraries}
            recentViews={data.recentViews}
            onOpenViewedTrip={openTripSlide}
          />
        ) : isLoading ? (
          <SideColumnSkeleton label="Loading your work" />
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
          openTrip(tripId);
        }}
      />
    </div>
  );
}
