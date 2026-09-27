"use client";

import { useState } from "react";
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

// ---------------------------------------------------------------------------
// Worklist group definitions (spec §3.1)
// ---------------------------------------------------------------------------
const WORKLIST_GROUPS = [
  {
    key: "unreadComments",
    heading: "Unread comments",
    tone: "info",
    actionLabel: "Reply",
  },
  {
    key: "viewedNotReplied",
    heading: "Viewed not replied",
    tone: "info",
    actionLabel: "Open trip",
  },
  {
    key: "draftsStuck",
    heading: "Drafts stuck",
    tone: "warning",
    actionLabel: "Resume",
  },
  {
    key: "sharesExpiring",
    heading: "Shares expiring",
    tone: "warning",
    actionLabel: "Extend",
  },
  {
    key: "lowRated",
    heading: "Low rated",
    tone: "danger",
    actionLabel: "Open trip",
  },
];

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

  function formatResponseRate(kpi) {
    if (!kpi) return undefined;
    const { responseCount, totalCount, responseRate } = kpi;
    if (responseCount == null || totalCount == null) return undefined;
    const pct =
      responseRate != null
        ? responseRate.toFixed(0)
        : totalCount > 0
          ? ((responseCount / totalCount) * 100).toFixed(0)
          : 0;
    return `${responseCount} of ${totalCount} rated (${pct}%)`;
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-[0.7rem] font-extrabold uppercase tracking-[0.05em] mb-2">OVERVIEW · 30d</span>
          <h1 className="text-2xl font-extrabold text-text-primary">Where conversion is leaking</h1>
          <p className="mt-1 text-sm text-text-muted">Track KPIs, funnel health and what to action next.</p>
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
                      {items.map((item, idx) => (
                        <WorklistRow
                          key={item.tripId ?? `${group.key}-${idx}`}
                          tone={group.tone}
                          title={item.tripTitle ?? item.title ?? "Untitled trip"}
                          subtitle={item.subtitle ?? item.clientName ?? null}
                          hint={item.hint ?? null}
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
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* -------------------------------------------------------------- */}
          {/* KPI strip                                                        */}
          {/* -------------------------------------------------------------- */}
          <section aria-label="Key performance indicators">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* null = no signal this period; KpiTile renders it as "—". */}
              <KpiTile
                label="Win rate"
                value={kpis.winRate?.value ?? null}
                unit="%"
                deltaVsPrior={kpis.winRate?.deltaVsPrior ?? null}
                sparkline={kpis.winRate?.sparkline ?? []}
                formatValue={formatOneDecimal}
              />
              <KpiTile
                label="Time to first share"
                value={kpis.timeToFirstShareDays?.value ?? null}
                unit="days"
                deltaVsPrior={kpis.timeToFirstShareDays?.deltaVsPrior ?? null}
                sparkline={kpis.timeToFirstShareDays?.sparkline ?? []}
                formatValue={formatOneDecimal}
                lowerIsBetter
              />
              <KpiTile
                label="Median response time"
                value={kpis.medianCommentResponseHours?.value ?? null}
                unit="h"
                deltaVsPrior={kpis.medianCommentResponseHours?.deltaVsPrior ?? null}
                sparkline={kpis.medianCommentResponseHours?.sparkline ?? []}
                formatValue={formatOneDecimal}
                lowerIsBetter
              />
              <KpiTile
                label="Avg proposal rating"
                value={kpis.avgProposalRating?.value ?? null}
                unit="★"
                deltaVsPrior={kpis.avgProposalRating?.deltaVsPrior ?? null}
                sparkline={kpis.avgProposalRating?.sparkline ?? []}
                formatValue={formatOneDecimal}
                subtitle={formatResponseRate(kpis.avgProposalRating)}
              />
            </div>
          </section>

          {/* -------------------------------------------------------------- */}
          {/* Conversion funnel                                               */}
          {/* -------------------------------------------------------------- */}
          {data.funnel?.stages?.length > 0 && (
            <FunnelChart
              stages={data.funnel.stages}
              agencyId={agencyId}
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
