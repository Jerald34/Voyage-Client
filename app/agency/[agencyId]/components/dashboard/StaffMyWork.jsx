"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useDashboardPoll from "@/app/hooks/useDashboardPoll";
import AgencyCalendar from "./widgets/AgencyCalendar";
import DashboardGreeting from "./widgets/DashboardGreeting";
import DashboardSkeleton, { DASHBOARD_GRID_CLASS } from "./widgets/DashboardSkeleton";
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

  const { data, isStale, isFetching, error, refetch } = useDashboardPoll({
    agencyId,
    view: "staff",
    period: "30d",
    initialData,
  });

  // The poll only flips isFetching on after mount, so waiting on it would paint
  // one frame of "All caught up" first. No data and no failure yet means loading.
  const isLoading = !data && !error;
  const [slideTrip, setSlideTrip] = useState(null); // { tripId, tripTitle, subtitle }
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

  return (
    <div className="px-6 py-6 md:px-8 lg:px-10">
      {showJoinedNotice && <JoinedNotice className="mb-5" />}

      <DashboardGreeting name={viewerName} count={data ? needsYou.length : null} onNewTrip={newTrip} />

      {isStale && (
        <div
          role="status"
          className="mt-4 inline-flex items-center gap-3 rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-2 text-sm font-semibold text-secondary-strong"
        >
          <span>Data may be outdated.</span>
          <button
            type="button"
            onClick={refetch}
            className="rounded-pill bg-secondary-strong px-3 py-1 text-xs font-bold text-on-secondary-strong transition-[opacity,scale] duration-150 ease-out hover:opacity-90 active:scale-[0.97] pointer-coarse:min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
          >
            Refresh
          </button>
        </div>
      )}

      {error && !isStale && (
        <div role="alert" className="frame-tile mt-4 rounded-xl px-4 py-3 text-[13px] text-text-muted">
          Could not refresh data.{" "}
          <button type="button" onClick={refetch} className="font-semibold text-secondary-strong hover:underline">
            Try again
          </button>
        </div>
      )}

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className={DASHBOARD_GRID_CLASS}>
          <div className="min-w-0 space-y-5">
            <NeedsYouList items={needsYou} onAction={handleNeedsYouAction} />
            <AgencyCalendar agencyId={agencyId} onOpenTrip={openTripSlide} />
          </div>
          <MyWorkColumn
            hero={data?.hero ?? null}
            recent={data?.secondaryRecent ?? []}
            pipeline={data?.pipeline ?? null}
            agencyId={agencyId}
            onOpenTrip={openTrip}
            onOpenItineraries={onOpenItineraries}
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
          openTrip(tripId);
        }}
      />
    </div>
  );
}
