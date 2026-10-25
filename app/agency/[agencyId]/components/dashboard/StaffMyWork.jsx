"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useDashboardPoll from "@/app/hooks/useDashboardPoll";
import AgencyCalendar from "./widgets/AgencyCalendar";
import ClientCommentsCard from "./widgets/ClientCommentsCard";
import DashboardGreeting from "./widgets/DashboardGreeting";
import DashboardStaleBanner from "./widgets/DashboardStaleBanner";
import { DASHBOARD_GRID_CLASS, NeedsYouSkeleton, SideColumnSkeleton } from "./widgets/DashboardSkeleton";
import JoinedNotice from "./widgets/JoinedNotice";
import MyWorkColumn from "./widgets/MyWorkColumn";
import NeedsYouList from "./widgets/NeedsYouList";
import TripSlideOver from "./TripSlideOver";
import { STAFF_NEEDS_YOU_ORDER, buildNeedsYouItems, needsYouTarget } from "./needsYouItems";

/**
 * Staff dashboard: greeting, "Needs you today", "Client comments" and the
 * calendar (all scoped by the server to trips this person created or
 * organizes) on the left, their own work on the right (continue, trips by
 * status (each lists its trips), recently viewed itineraries, recent trips).
 * Every to-do trip row, comment, calendar action, status-list trip and
 * Recently viewed row opens the trip panel (at the comment or share link it is
 * about); only "Resume" on a stuck draft, "Continue" and Recent trips open the
 * Planner. Nothing here depends on a period, so there is no period switcher.
 * The calendar loads on its own, so it is always mounted: only the parts that
 * need the dashboard payload wait for it, or say it failed.
 */
export default function StaffMyWork({
  agencyId,
  initialData = null,
  viewerName,
  onOpenTrip,
  onNewTrip,
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
  const [slideTrip, setSlideTrip] = useState(null); // { tripId, tripTitle, subtitle, focus }
  // Bumped after a reply or an extension so the calendar reloads at once, not at its next poll.
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  // Where the slide-over returns focus if the row that opened it was removed by
  // a poll. Also the fallback for slide-overs opened from the Recently viewed card.
  const needsYouRef = useRef(null);
  const needsYou = buildNeedsYouItems(data?.worklist, STAFF_NEEDS_YOU_ORDER);

  // focus: null (top), { type: "comment", id } or { type: "share" } — see TripSlideOver.
  // Kept in state with the trip, so reopening the same trip at a new spot works.
  const openTripSlide = (tripId, tripTitle, subtitle, focus = null) => {
    setSlideTrip({ tripId, tripTitle: tripTitle ?? "Trip", subtitle: subtitle ?? null, focus });
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
    const target = needsYouTarget(item);
    if (target.to === "planner") openTrip(item.tripId);
    else openTripSlide(item.tripId, item.tripTitle, item.clientName, target.focus);
  }

  function openComment(row) {
    openTripSlide(row.tripId, row.tripTitle, row.clientName, { type: "comment", id: row.id });
  }

  // A reply or an extension changes what needs the agent: reload the to-do list and the calendar now.
  function handleChanged() {
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
          {/* Tour markers wrap whole sections so the spotlight has a box even while data loads. */}
          <div data-tour-target="dashboard-needs-you" className="empty:hidden">
            {data ? <NeedsYouList ref={needsYouRef} items={needsYou} onAction={handleNeedsYouAction} /> : isLoading ? <NeedsYouSkeleton /> : null}
          </div>
          {data?.clientComments ? <ClientCommentsCard comments={data.clientComments} onOpenComment={openComment} /> : null}
          <div data-tour-target="dashboard-calendar">
            <AgencyCalendar agencyId={agencyId} onOpenTrip={openTripSlide} refreshKey={calendarRefreshKey} />
          </div>
        </div>
        {/* self-start keeps the marker as tall as the column, not the whole grid row. */}
        <div data-tour-target="dashboard-side" className="min-w-0 self-start empty:hidden">
          {data ? (
            <MyWorkColumn
              hero={data.hero ?? null}
              recent={data.secondaryRecent ?? []}
              pipeline={data.pipeline ?? null}
              pipelineTrips={data.pipelineTrips ?? null}
              onOpenTrip={openTrip}
              recentViews={data.recentViews}
              onOpenViewedTrip={openTripSlide}
            />
          ) : isLoading ? (
            <SideColumnSkeleton label="Loading your work" />
          ) : null}
        </div>
      </div>

      <TripSlideOver
        isOpen={!!slideTrip}
        onClose={() => setSlideTrip(null)}
        agencyId={agencyId}
        tripId={slideTrip?.tripId}
        tripTitle={slideTrip?.tripTitle}
        subtitle={slideTrip?.subtitle}
        focus={slideTrip?.focus ?? null}
        returnFocusRef={needsYouRef}
        onChanged={handleChanged}
        onOpenFull={(tripId) => {
          setSlideTrip(null);
          openTrip(tripId);
        }}
      />
    </div>
  );
}
