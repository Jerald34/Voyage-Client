"use client";

/**
 * StaffMyWork — Staff-side dashboard composition (§4, §6.6, §7.4)
 *
 * Sections:
 *   1. Header — title + "New trip" quick action
 *   2. Stale banner / loading skeleton
 *   3. Hero — HeroContinueCard (§4.1)
 *   4. Secondary-recent cards row (§4.1 overflow)
 *   5. "Clients waiting on you" worklist (§4.2)
 *   6. Pipeline strip — 4 counters (§4.3)
 *   7. "Starting soon" horizontal scroller (§4.4)
 *
 * Layout: max-w-[1280px] centered, 8-col-like column grid (§6.6).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import useDashboardPoll from "@/app/hooks/useDashboardPoll";
import HeroContinueCard from "./widgets/HeroContinueCard";
import WorklistRow from "./widgets/WorklistRow";
import EmptyState from "./widgets/EmptyState";
import JoinedNotice from "./widgets/JoinedNotice";
import TeamPage from "@/app/components/team/TeamPage";
import TripSlideOver from "./TripSlideOver";
import { describeWorklistItem } from "./worklistContext";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns a short relative-time string, e.g. "2h ago", "3d ago".
 * Falls back to the ISO string if parsing fails.
 */
function relativeTime(isoString) {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  if (isNaN(diff)) return isoString;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const STATUS_LABELS = {
  DRAFT: "Draft",
  IN_REVIEW: "In review",
  APPROVED_INTERNAL: "Approved",
  ARCHIVED: "Archived",
};

const STATUS_BG = {
  DRAFT: "color-mix(in srgb, var(--warning) 12%, transparent)",
  IN_REVIEW: "color-mix(in srgb, var(--accent) 12%, transparent)",
  APPROVED_INTERNAL: "color-mix(in srgb, var(--success) 12%, transparent)",
  ARCHIVED: "rgb(var(--color-border-rgb) / 0.08)",
};

const STATUS_COLOR = {
  DRAFT: "var(--warning)",
  IN_REVIEW: "var(--accent)",
  APPROVED_INTERNAL: "var(--success)",
  ARCHIVED: "rgb(var(--color-text-soft-rgb))",
};

function StatusChip({ status }) {
  if (!status) return null;
  return (
    <span
      className="inline-flex items-center rounded-lg px-3 py-1 text-xs font-extrabold uppercase tracking-[0.04em]"
      style={{
        backgroundColor: STATUS_BG[status] ?? "rgb(var(--color-border-rgb) / 0.08)",
        color: STATUS_COLOR[status] ?? "rgb(var(--color-text-soft-rgb))",
      }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function Skeleton({ className }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-surface-elevated ${className}`}
      aria-hidden="true"
    />
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      {/* Hero skeleton */}
      <Skeleton className="h-[200px] w-full" />
      {/* Secondary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      {/* Worklist */}
      <Skeleton className="h-40 w-full" />
      {/* Pipeline strip */}
      <Skeleton className="h-10 w-full" />
      {/* Starting soon */}
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

// ─── Stale banner ────────────────────────────────────────────────────────────

function StaleBanner({ onRefresh }) {
  return (
    <div
      role="status"
      className="inline-flex items-center gap-3 rounded-lg bg-secondary/10 border border-secondary/30 px-4 py-2 text-sm font-bold text-secondary"
    >
      <span>Data may be outdated.</span>
      <button
        type="button"
        onClick={onRefresh}
        className="ml-1 rounded-pill bg-secondary text-white px-3 py-1 text-xs font-bold hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
      >
        Refresh
      </button>
    </div>
  );
}

// ─── Secondary recent card ───────────────────────────────────────────────────

function SecondaryCard({ trip, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-24 w-full dashboard-card p-4 text-left flex flex-col justify-between hover:bg-surface-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
      style={{ transitionDuration: "120ms", transitionTimingFunction: "var(--ease-out)" }}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <span className="truncate text-[14px] font-extrabold text-text-primary leading-snug">
          {trip.tripTitle}
        </span>
        <StatusChip status={trip.statusChip} />
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="truncate text-[13px] text-text-muted">
          {trip.clientName}
        </span>
        <span className="shrink-0 text-[12px] text-text-muted tabular-nums">
          {relativeTime(trip.updatedAt)}
        </span>
      </div>
    </button>
  );
}

// ─── Pipeline strip ──────────────────────────────────────────────────────────

function PipelineCounter({ label, value, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[14px] font-extrabold tabular-nums text-text-muted hover:bg-surface-elevated hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
      style={{ transitionDuration: "120ms", transitionTimingFunction: "var(--ease-out)" }}
    >
      <span className="font-semibold text-text-primary tabular-nums">{value ?? 0}</span>
      <span>{label}</span>
    </button>
  );
}

function PipelineStrip({ pipeline, agencyId, onOpenItineraries }) {
  const router = useRouter();

  function goToList(status) {
    if (onOpenItineraries) {
      onOpenItineraries(status);
      return;
    }
    router.push(`/agency/${agencyId}/trip?status=${status}`);
  }

  return (
    <div className="space-y-2">
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-[0.7rem] font-extrabold uppercase tracking-[0.05em]">YOUR TRIPS</span>
    <div
      role="group"
      aria-label="Your trips by status"
      className="flex flex-wrap items-center gap-x-1 gap-y-1 dashboard-card px-6 py-4"
    >
      <PipelineCounter
        label="Drafts"
        value={pipeline?.drafts}
        onClick={() => goToList("DRAFT")}
      />
      <span aria-hidden className="text-[14px] text-text-muted select-none">·</span>
      <PipelineCounter
        label="In review"
        value={pipeline?.inReview}
        onClick={() => goToList("IN_REVIEW")}
      />
      <span aria-hidden className="text-[14px] text-text-muted select-none">·</span>
      <PipelineCounter
        label="Approved this month"
        value={pipeline?.approvedThisMonth}
        onClick={() => goToList("APPROVED_INTERNAL")}
      />
      <span aria-hidden className="text-[14px] text-text-muted select-none">·</span>
      <PipelineCounter
        label="Traveling now"
        value={pipeline?.activeNow}
        onClick={() => goToList("ACTIVE")}
      />
    </div>
    </div>
  );
}

// ─── Starting-soon scroller ──────────────────────────────────────────────────

function StartingSoonCard({ trip, agencyId, onOpenTrip }) {
  const router = useRouter();
  const daysLabel =
    trip.daysToStart === 0
      ? "Today"
      : trip.daysToStart === 1
      ? "Tomorrow"
      : `${trip.daysToStart}d`;

  function openThisTrip() {
    if (onOpenTrip) {
      onOpenTrip(trip.tripId);
      return;
    }
    router.push(`/agency/${agencyId}/trip/${trip.tripId}/agent`);
  }

  return (
    <button
      type="button"
      onClick={openThisTrip}
      className="snap-start min-w-[240px] dashboard-card p-5 text-left flex flex-col gap-2 rounded-md hover:bg-surface-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
      style={{ transitionDuration: "120ms", transitionTimingFunction: "var(--ease-out)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[14px] font-extrabold text-text-primary leading-snug line-clamp-2">
          {trip.tripTitle}
        </span>
        <span className="shrink-0 rounded bg-success/10 px-2 py-0.5 text-xs font-medium text-[color:var(--success)] tabular-nums whitespace-nowrap">
          {daysLabel}
        </span>
      </div>
      <span className="text-[13px] text-text-muted truncate">{trip.clientName}</span>
      {trip.travelerCount != null && (
        <span className="text-[12px] text-text-muted tabular-nums">
          {trip.travelerCount} traveler{trip.travelerCount !== 1 ? "s" : ""}
        </span>
      )}
    </button>
  );
}

function StartingSoonScroller({ trips, agencyId, onOpenTrip }) {
  if (!trips?.length) return null;

  return (
    <section aria-label="Starting soon">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-[0.7rem] font-extrabold uppercase tracking-[0.05em]">STARTING SOON</span>
      </div>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1">
        {trips.map((trip) => (
          <StartingSoonCard key={trip.tripId} trip={trip} agencyId={agencyId} onOpenTrip={onOpenTrip} />
        ))}
      </div>
    </section>
  );
}

// ─── Worklist section ────────────────────────────────────────────────────────

function WorklistSection({ worklist, agencyId, onOpenSlide, onOpenTrip }) {
  const rows = [];

  // Keys use each row's own record: one trip can have several unread comments.
  (worklist?.unreadComments ?? []).forEach((item) => {
    rows.push({
      key: `comment-${item.id}`,
      tone: "info",
      title: item.tripTitle,
      ...describeWorklistItem("unreadComments", item),
      actionLabel: "Reply",
      onAction: () => onOpenSlide(item.tripId, item.tripTitle, item.clientName),
    });
  });

  (worklist?.myDraftsStuck ?? []).forEach((item) => {
    rows.push({
      key: `draft-${item.tripId}`,
      tone: "warning",
      title: item.tripTitle,
      ...describeWorklistItem("myDraftsStuck", item),
      actionLabel: "Resume",
      onAction: () => onOpenTrip(item.tripId),
    });
  });

  (worklist?.mySharesExpiring ?? []).forEach((item) => {
    rows.push({
      key: `share-${item.shareId}`,
      tone: "warning",
      title: item.tripTitle,
      ...describeWorklistItem("mySharesExpiring", item),
      actionLabel: "Nudge",
      onAction: () => onOpenTrip(item.tripId),
    });
  });

  (worklist?.startingSoon ?? []).forEach((item) => {
    rows.push({
      key: `soon-${item.tripId}`,
      tone: "success",
      title: item.tripTitle,
      ...describeWorklistItem("startingSoon", item),
      actionLabel: "Open trip",
      onAction: () => onOpenTrip(item.tripId),
    });
  });

  return (
    <section aria-label="Clients waiting on you" className="dashboard-card p-6">
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-[0.7rem] font-extrabold uppercase tracking-[0.05em] mb-2">WORKLIST</span>
      <h2 className="mt-2 mb-4 text-lg font-extrabold text-text-primary">
        Clients waiting on you
      </h2>
      <div
        role="list"
        className="divide-y divide-border/10 overflow-hidden"
      >
        {rows.length === 0 ? (
          <EmptyState variant="worklist" />
        ) : (
          rows.map((row, i) => (
            <div key={row.key} style={{ transitionDelay: `${i * 40}ms` }}>
              <WorklistRow
                tone={row.tone}
                title={row.title}
                subtitle={row.subtitle}
                hint={row.hint}
                actionLabel={row.actionLabel}
                onAction={row.onAction}
              />
            </div>
          ))
        )}
      </div>
    </section>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function StaffMyWork({
  agencyId,
  initialData = null,
  onOpenTrip,
  onNewTrip,
  onOpenItineraries,
  showJoinedNotice = false,
}) {
  const router = useRouter();

  // Nothing on My work depends on a period (the server only echoes it back),
  // so there is no period switcher here.
  const { data, isStale, isFetching, error, refetch } = useDashboardPoll({
    agencyId,
    view: "staff",
    period: "30d",
    initialData,
  });

  const isLoading = !data && isFetching;

  // ── Slide-over state ──
  const [slideTrip, setSlideTrip] = useState(null); // { tripId, tripTitle, subtitle }

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

  return (
    <div className="mx-auto max-w-[1280px] px-6 md:px-8 lg:px-10 py-8 space-y-6">
      {showJoinedNotice && <JoinedNotice />}

      {/* ── Header ── */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">My work</h1>
          <p className="mt-1 text-sm text-text-muted">Pick up where you left off.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={newTrip}
            className="h-11 rounded-lg bg-secondary px-5 text-sm font-bold text-white shadow-soft hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
          >
            New trip
          </button>
        </div>
      </header>

      {/* ── Stale banner ── */}
      {isStale && <StaleBanner onRefresh={refetch} />}

      {/* ── Error banner (non-blocking) ── */}
      {error && !isStale && (
        <div
          role="alert"
          className="dashboard-card px-4 py-3 text-[13px] text-text-muted border-danger/30 bg-danger/5"
        >
          Could not refresh data.{" "}
          <button
            type="button"
            onClick={refetch}
            className="font-medium text-secondary hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* ── Loading skeleton (first load only) ── */}
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* ── 3. Hero ── */}
          <HeroContinueCard
            trip={data?.hero ?? null}
            onContinue={(tripId) => openTrip(tripId)}
          />

          {/* ── 4. Secondary recent cards ── */}
          {data?.secondaryRecent?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.secondaryRecent.slice(0, 3).map((trip) => (
                <SecondaryCard
                  key={trip.tripId}
                  trip={trip}
                  onClick={() => openTrip(trip.tripId)}
                />
              ))}
            </div>
          )}

          {/* ── 5. Worklist ── */}
          <WorklistSection
            worklist={data?.worklist}
            agencyId={agencyId}
            onOpenSlide={openTripSlide}
            onOpenTrip={openTrip}
          />

          {/* ── 6. Pipeline strip ── */}
          {data?.pipeline && (
            <PipelineStrip
              pipeline={data.pipeline}
              agencyId={agencyId}
              onOpenItineraries={onOpenItineraries}
            />
          )}

          {/* ── 7. Starting-soon scroller ── */}
          <StartingSoonScroller
            trips={data?.startingSoon}
            agencyId={agencyId}
            onOpenTrip={openTrip}
          />

          {/* ── 8. Team section — combined into Dashboard ── */}
          <section aria-label="Team" className="dashboard-card p-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-[0.7rem] font-extrabold uppercase tracking-[0.05em] mb-2">TEAM</span>
            <h2 className="mt-2 mb-4 text-lg font-extrabold text-text-primary">
              Your team
            </h2>
            <TeamPage agencyId={agencyId} />
          </section>
        </>
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
          openTrip(tripId);
        }}
      />
    </div>
  );
}
