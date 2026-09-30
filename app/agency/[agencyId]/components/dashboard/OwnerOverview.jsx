"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useDashboardPoll } from "../../../../hooks/useDashboardPoll";
import KpiTile from "./widgets/KpiTile";
import FunnelChart from "./widgets/FunnelChart";
import WorklistRow from "./widgets/WorklistRow";
import RatingsPanel from "./widgets/RatingsPanel";
import ActivityRibbon from "./widgets/ActivityRibbon";
import EmptyState from "./widgets/EmptyState";
import PeriodSwitcher from "./widgets/PeriodSwitcher";
import JoinedNotice from "./widgets/JoinedNotice";
import TeamPage from "../../../../components/team/TeamPage";
import TripSlideOver from "./TripSlideOver";
import { describeWorklistItem } from "./worklistContext";

// ---------------------------------------------------------------------------
// Worklist group definitions (spec §3.1)
// ---------------------------------------------------------------------------
const WORKLIST_GROUPS = [
  {
    key: "unreadComments",
    heading: "Client comments to answer",
    tone: "info",
    actionLabel: "Reply",
  },
  {
    key: "viewedNotReplied",
    heading: "Viewed by the client, no follow-up yet",
    tone: "info",
    actionLabel: "Open trip",
  },
  {
    key: "draftsStuck",
    heading: "Drafts untouched for over a week",
    tone: "warning",
    actionLabel: "Resume",
  },
  {
    key: "sharesExpiring",
    heading: "Itinerary links expiring within 2 days",
    tone: "warning",
    actionLabel: "Extend",
  },
  {
    key: "lowRated",
    heading: "Low ratings from clients",
    tone: "danger",
    actionLabel: "Open trip",
  },
];

const PERIOD_DAYS = { "7d": 7, "30d": 30, "90d": 90 };

const formatOneDecimal = (v) => v.toFixed(1);

// ---------------------------------------------------------------------------
// Skeleton placeholder — rendered when data === null (no SSR payload)
// ---------------------------------------------------------------------------
function DashboardSkeleton() {
  return (
    <div
      className="animate-pulse space-y-6"
      role="status"
      aria-label="Loading dashboard"
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-32 rounded-lg bg-surface-elevated" />
        <div className="flex gap-3">
          <div className="h-9 w-24 rounded-lg bg-surface-elevated" />
          <div className="h-9 w-32 rounded-lg bg-surface-elevated" />
        </div>
      </div>
      {/* Worklist skeleton */}
      <div className="dashboard-card p-6 space-y-3">
        <div className="h-4 w-48 rounded-lg bg-surface-elevated" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 w-full rounded-lg bg-surface-elevated" />
        ))}
      </div>
      {/* KPI strip skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-[120px] dashboard-card"
          />
        ))}
      </div>
      {/* Funnel skeleton */}
      <div className="h-48 dashboard-card" />
      {/* Tail skeleton */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="h-48 dashboard-card" />
        <div className="h-48 dashboard-card" />
      </div>
      <span className="sr-only">Loading dashboard…</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OwnerOverview
// ---------------------------------------------------------------------------
export default function OwnerOverview({ agencyId, initialData = null, onOpenTrip, onNewTrip, showJoinedNotice = false }) {
  const router = useRouter();
  const kpiHeadingId = useId();
  const [period, setPeriod] = useState("30d");

  // ── Slide-over state ──
  const [slideTrip, setSlideTrip] = useState(null); // { tripId, tripTitle, subtitle }

  const { data, isStale, isFetching, refetch } = useDashboardPoll({
    agencyId,
    view: "owner",
    period,
    initialData,
  });

  // -------------------------------------------------------------------------
  // Action — opens slide-over panel instead of navigating away
  // -------------------------------------------------------------------------
  function handleTripAction(tripId, tripTitle, subtitle) {
    setSlideTrip({ tripId, tripTitle: tripTitle ?? "Trip", subtitle: subtitle ?? null });
  }

  function handleOpenInCommandCenter(tripId) {
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

  // -------------------------------------------------------------------------
  // Derived: worklist total
  // -------------------------------------------------------------------------
  const worklist = data?.worklist ?? {};
  const totalWorklistItems = WORKLIST_GROUPS.reduce(
    (sum, group) => sum + (worklist[group.key]?.length ?? 0),
    0,
  );

  // -------------------------------------------------------------------------
  // KPI helpers
  // -------------------------------------------------------------------------
  const kpis = data?.kpis ?? {};

  // Label the numbers with the period they were computed for (the payload's),
  // not the switcher's, which runs ahead of the data while a refetch is in flight.
  const periodDays = PERIOD_DAYS[data?.period ?? period] ?? 30;
  const periodLabel = `Last ${periodDays} days`;

  // "3 of 10 rated": how many shared itineraries the average rating is based on.
  function formatRatedCount(kpi) {
    const { rated, total } = kpi?.responseRate ?? {};
    if (rated == null || !total) return undefined;
    return `${rated} of ${total} rated`;
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-[1280px] px-6 py-8 md:px-8 lg:px-10">
      {showJoinedNotice && <JoinedNotice className="mb-6" />}

      {/* Stale banner */}
      {isStale && (
        <div
          role="alert"
          className="inline-flex items-center gap-3 mb-6 rounded-lg bg-secondary/10 border border-secondary/30 px-4 py-2 text-sm font-bold text-secondary"
        >
          <span>We couldn&rsquo;t refresh — last loaded a few minutes ago.</span>
          <button
            type="button"
            onClick={refetch}
            className="rounded-pill bg-secondary text-white px-3 py-1 text-xs font-bold hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Page header                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-[0.7rem] font-extrabold uppercase tracking-[0.05em] mb-2">OVERVIEW</span>
          {/* max-w-none: the global h1 style caps headings at 12ch. */}
          <h1 className="max-w-none text-2xl font-extrabold text-text-primary">How your agency is doing</h1>
          <p className="mt-1 text-sm text-text-muted">What needs your attention today, and how your trips are going.</p>
        </div>

        <div className="flex items-center gap-3">
          <PeriodSwitcher
            value={period}
            onChange={setPeriod}
            disabled={isFetching}
          />

          <button
            type="button"
            onClick={handleNewTrip}
            className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-secondary px-5 text-sm font-bold text-white shadow-soft transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
          >
            New trip
          </button>

        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Skeleton when no data at all                                        */}
      {/* ------------------------------------------------------------------ */}
      {data === null ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6">
          {/* -------------------------------------------------------------- */}
          {/* Worklist hero — "Needs your eyes today"                         */}
          {/* -------------------------------------------------------------- */}
          <section
            aria-label="Needs your eyes today"
            className="dashboard-card p-6"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-[0.7rem] font-extrabold uppercase tracking-[0.05em] mb-2">WORKLIST</span>
            <h2 className="mt-2 mb-4 text-lg font-extrabold text-text-primary">
              Needs your eyes today
            </h2>

            {totalWorklistItems === 0 ? (
              <EmptyState variant="worklist" />
            ) : (
              <div className="space-y-4" role="list">
                {WORKLIST_GROUPS.map((group) => {
                  const items = worklist[group.key] ?? [];
                  if (items.length === 0) return null;

                  return (
                    <div key={group.key}>
                      <p className="mb-1 px-3 text-[0.7rem] font-extrabold uppercase tracking-[0.05em] text-text-soft">
                        {group.heading} ({items.length})
                      </p>
                      {items.map((item, idx) => {
                        // A trip can appear more than once in a group (two
                        // unread comments), so key by the row's own record.
                        const { subtitle, hint } = describeWorklistItem(group.key, item);
                        return (
                          <WorklistRow
                            key={item.id ?? item.shareId ?? item.tripId ?? `${group.key}-${idx}`}
                            tone={group.tone}
                            title={item.tripTitle ?? item.title ?? "Untitled trip"}
                            subtitle={subtitle}
                            hint={hint}
                            actionLabel={group.actionLabel}
                            onAction={() =>
                              group.key === "unreadComments"
                                ? handleTripAction(item.tripId, item.tripTitle, item.clientName)
                                : handleOpenInCommandCenter(item.tripId)
                            }
                            onRowClick={() =>
                              group.key === "unreadComments"
                                ? handleTripAction(item.tripId, item.tripTitle, item.clientName)
                                : handleOpenInCommandCenter(item.tripId)
                            }
                            style={{ transitionDelay: `${idx * 40}ms` }}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* -------------------------------------------------------------- */}
          {/* KPI strip                                                        */}
          {/* -------------------------------------------------------------- */}
          <section aria-labelledby={kpiHeadingId}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-[0.7rem] font-extrabold uppercase tracking-[0.05em]">YOUR NUMBERS</span>
            <h2 id={kpiHeadingId} className="mt-2 text-lg font-extrabold text-text-primary">
              {periodLabel}
            </h2>
            <p className="mt-1 mb-4 text-sm text-text-muted">
              Compared with the {periodDays} days before. Green is better, red is worse.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* null = no signal this period; KpiTile renders it as "—". */}
              <KpiTile
                label="Win rate"
                value={kpis.winRate?.value ?? null}
                unit="%"
                deltaVsPrior={kpis.winRate?.deltaVsPrior ?? null}
                sparkline={kpis.winRate?.sparkline ?? []}
                formatValue={formatOneDecimal}
                description="Approved trips out of all approved and archived trips"
              />
              <KpiTile
                label="Time to share"
                value={kpis.timeToFirstShareDays?.value ?? null}
                unit="days"
                deltaVsPrior={kpis.timeToFirstShareDays?.deltaVsPrior ?? null}
                sparkline={kpis.timeToFirstShareDays?.sparkline ?? []}
                formatValue={formatOneDecimal}
                description="Average days from a new trip to sharing its first itinerary"
                lowerIsBetter
              />
              <KpiTile
                label="Time to reply"
                value={kpis.medianCommentResponseHours?.value ?? null}
                unit="h"
                deltaVsPrior={kpis.medianCommentResponseHours?.deltaVsPrior ?? null}
                sparkline={kpis.medianCommentResponseHours?.sparkline ?? []}
                formatValue={formatOneDecimal}
                description="Typical time your team takes to answer a client comment"
                lowerIsBetter
              />
              <KpiTile
                label="Client rating"
                value={kpis.avgProposalRating?.value ?? null}
                unit="★"
                deltaVsPrior={kpis.avgProposalRating?.deltaVsPrior ?? null}
                sparkline={kpis.avgProposalRating?.sparkline ?? []}
                formatValue={formatOneDecimal}
                subtitle={formatRatedCount(kpis.avgProposalRating)}
                description="Average stars clients gave your shared itineraries"
              />
            </div>
          </section>

          {/* -------------------------------------------------------------- */}
          {/* Trip progress (funnel)                                          */}
          {/* -------------------------------------------------------------- */}
          {data.funnel?.stages?.length > 0 && (
            <FunnelChart
              stages={data.funnel.stages}
              agencyId={agencyId}
              periodLabel={periodLabel}
            />
          )}

          {/* -------------------------------------------------------------- */}
          {/* Tail: ratings + activity                                        */}
          {/* -------------------------------------------------------------- */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <RatingsPanel reviews={data.recentReviews ?? []} />
            <ActivityRibbon events={data.activityRibbon ?? []} />
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Team section — combined into Dashboard                          */}
          {/* -------------------------------------------------------------- */}
          <section aria-label="Team" className="dashboard-card p-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-[0.7rem] font-extrabold uppercase tracking-[0.05em] mb-2">TEAM</span>
            <h2 className="mt-2 mb-4 text-lg font-extrabold text-text-primary">
              Your team
            </h2>
            <TeamPage agencyId={agencyId} />
          </section>
        </div>
      )}

      {/* ── Trip slide-over panel ── */}
      <TripSlideOver
        isOpen={!!slideTrip}
        onClose={() => setSlideTrip(null)}
        agencyId={agencyId}
        tripId={slideTrip?.tripId}
        tripTitle={slideTrip?.tripTitle}
        subtitle={slideTrip?.subtitle}
        onOpenFull={(tripId) => {
          setSlideTrip(null);
          if (onOpenTrip) onOpenTrip(tripId);
          else router.push(`/agency/${agencyId}/trip/${tripId}`);
        }}
      />
    </div>
  );
}
