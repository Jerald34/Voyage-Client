"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDashboardPoll } from "../../../../hooks/useDashboardPoll";
import AgencyCalendar from "./widgets/AgencyCalendar";
import DashboardGreeting from "./widgets/DashboardGreeting";
import DashboardSkeleton, { DASHBOARD_GRID_CLASS } from "./widgets/DashboardSkeleton";
import InsightsColumn from "./widgets/InsightsColumn";
import JoinedNotice from "./widgets/JoinedNotice";
import NeedsYouList from "./widgets/NeedsYouList";
import TripSlideOver from "./TripSlideOver";
import { OWNER_NEEDS_YOU_ORDER, buildNeedsYouItems } from "./needsYouItems";

/**
 * Owner/admin dashboard: greeting, "Needs you today" and the calendar on the
 * left, Insights (KPIs, trip progress, reviews) on the right.
 * Comment rows and calendar actions open the trip slide-over; other to-do
 * rows open the trip in the Command Center.
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

  const { data, isStale, isFetching, refetch } = useDashboardPoll({
    agencyId,
    view: "owner",
    period,
    initialData,
  });

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

  return (
    <div className="px-6 py-6 md:px-8 lg:px-10">
      {showJoinedNotice && <JoinedNotice className="mb-5" />}

      <DashboardGreeting name={viewerName} count={data ? needsYou.length : null} onNewTrip={handleNewTrip} />

      {isStale && (
        <div
          role="alert"
          className="mt-4 inline-flex items-center gap-3 rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-2 text-sm font-semibold text-secondary-strong"
        >
          <span>We couldn&rsquo;t refresh — last loaded a few minutes ago.</span>
          <button
            type="button"
            onClick={refetch}
            className="rounded-pill bg-secondary-strong px-3 py-1 text-xs font-bold text-on-secondary-strong transition-[opacity,scale] duration-150 ease-out hover:opacity-90 active:scale-[0.97] pointer-coarse:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {data === null ? (
        <DashboardSkeleton />
      ) : (
        <div className={DASHBOARD_GRID_CLASS}>
          <div className="min-w-0 space-y-5">
            <NeedsYouList items={needsYou} onAction={handleNeedsYouAction} />
            <AgencyCalendar agencyId={agencyId} onOpenTrip={openSlideOver} />
          </div>
          <InsightsColumn
            data={data}
            period={period}
            onPeriodChange={setPeriod}
            isFetching={isFetching}
            agencyId={agencyId}
          />
        </div>
      )}

      <TripSlideOver
        isOpen={!!slideTrip}
        onClose={() => setSlideTrip(null)}
        agencyId={agencyId}
        tripId={slideTrip?.tripId}
        tripTitle={slideTrip?.tripTitle}
        subtitle={slideTrip?.subtitle}
        onOpenFull={(tripId) => {
          setSlideTrip(null);
          openInCommandCenter(tripId);
        }}
      />
    </div>
  );
}
