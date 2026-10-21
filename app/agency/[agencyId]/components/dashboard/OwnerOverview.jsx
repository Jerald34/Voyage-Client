"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDashboardPoll } from "../../../../hooks/useDashboardPoll";
import AgencyCalendar from "./widgets/AgencyCalendar";
import ClientCommentsCard from "./widgets/ClientCommentsCard";
import DashboardGreeting from "./widgets/DashboardGreeting";
import DashboardStaleBanner from "./widgets/DashboardStaleBanner";
import { DASHBOARD_GRID_CLASS, NeedsYouSkeleton, SideColumnSkeleton } from "./widgets/DashboardSkeleton";
import InsightsColumn from "./widgets/InsightsColumn";
import JoinedNotice from "./widgets/JoinedNotice";
import NeedsYouList from "./widgets/NeedsYouList";
import TripSlideOver from "./TripSlideOver";
import { OWNER_NEEDS_YOU_ORDER, buildNeedsYouItems, needsYouTarget } from "./needsYouItems";

/**
 * Owner/admin dashboard: greeting, "Needs you today", "Client comments" and
 * the calendar on the left, Insights on the right. Every trip row, comment,
 * calendar action, trip-progress trip and Recently viewed row opens the trip
 * panel (at the comment or share link it is about); only "Resume" on a stuck
 * draft opens the Planner.
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
  const [slideTrip, setSlideTrip] = useState(null); // { tripId, tripTitle, subtitle, focus }
  // Bumped after a reply or an extension so the calendar reloads at once, not at its next poll.
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

  // focus: null (top), { type: "comment", id } or { type: "share" } — see TripSlideOver.
  // Kept in state with the trip, so reopening the same trip at a new spot works.
  function openSlideOver(tripId, tripTitle, subtitle, focus = null) {
    setSlideTrip({ tripId, tripTitle: tripTitle ?? "Trip", subtitle: subtitle ?? null, focus });
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
    const target = needsYouTarget(item);
    if (target.to === "planner") openInCommandCenter(item.tripId);
    else openSlideOver(item.tripId, item.tripTitle, item.clientName, target.focus);
  }

  function openComment(row) {
    openSlideOver(row.tripId, row.tripTitle, row.clientName, { type: "comment", id: row.id });
  }

  // A reply or an extension changes what needs the agent: reload the to-do list and the calendar now.
  function handleChanged() {
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
          {/* Tour markers wrap whole sections so the spotlight has a box even while data loads. */}
          <div data-tour-target="dashboard-needs-you" className="empty:hidden">
            {data ? <NeedsYouList ref={needsYouRef} items={needsYou} onAction={handleNeedsYouAction} /> : isLoading ? <NeedsYouSkeleton /> : null}
          </div>
          {data?.clientComments ? <ClientCommentsCard comments={data.clientComments} onOpenComment={openComment} /> : null}
          <div data-tour-target="dashboard-calendar">
            <AgencyCalendar agencyId={agencyId} onOpenTrip={openSlideOver} refreshKey={calendarRefreshKey} />
          </div>
        </div>
        {/* self-start keeps the marker as tall as the column, not the whole grid row. */}
        <div data-tour-target="dashboard-side" className="min-w-0 self-start empty:hidden">
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
          openInCommandCenter(tripId);
        }}
      />
    </div>
  );
}
