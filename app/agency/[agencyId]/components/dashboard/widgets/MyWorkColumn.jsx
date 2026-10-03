"use client";

import { useId } from "react";
import { useRouter } from "next/navigation";
import HeroContinueCard from "./HeroContinueCard";

/** Buttons dip to 97% while pressed. `scale` is the property Tailwind's scale utilities set, so it must be the one transitioned. */
const PRESS = "transition-[color,background-color,scale] duration-150 ease-out active:scale-[0.97]";

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

// Text on a 12% tint of its own colour needs 4.5:1 at 12px. Amber text on the
// draft tint only reaches ~4.3:1, so drafts read in the body colour (the tint
// still says "draft"), and the muted/strong tokens are the ones that pass.
const STATUS_COLOR = {
  DRAFT: "rgb(var(--color-text-rgb))",
  IN_REVIEW: "var(--color-secondary-strong)",
  APPROVED_INTERNAL: "var(--success)",
  ARCHIVED: "rgb(var(--color-text-muted-rgb))",
};

function StatusChip({ status }) {
  if (!status) return null;
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-lg px-2 py-0.5 text-[12px] font-extrabold uppercase tracking-[0.04em]"
      style={{
        backgroundColor: STATUS_BG[status] ?? "rgb(var(--color-border-rgb) / 0.08)",
        color: STATUS_COLOR[status] ?? "rgb(var(--color-text-muted-rgb))",
      }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

/** "Just now", "5m ago", "2h ago", "3d ago"; the raw string if it can't be read. */
function relativeTime(isoString) {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  if (Number.isNaN(diff)) return isoString;
  // A clock a little ahead of the server's makes the difference negative.
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function RecentTripButton({ trip, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`frame-tile flex w-full flex-col gap-1 rounded-[12px] px-3 py-2 text-left hover:bg-text-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${PRESS}`}
    >
      <span className="flex min-w-0 items-start justify-between gap-2">
        <span className="truncate text-[13px] font-semibold leading-snug text-text-primary">{trip.tripTitle}</span>
        <StatusChip status={trip.statusChip} />
      </span>
      <span className="flex items-end justify-between gap-2">
        <span className="truncate text-[12px] text-text-muted">{trip.clientName}</span>
        <span className="shrink-0 text-[12px] tabular-nums text-text-muted">{relativeTime(trip.updatedAt)}</span>
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
 * status (each count opens the filtered list), and up to three recent trips.
 */
export default function MyWorkColumn({ hero, recent = [], pipeline, agencyId, onOpenTrip, onOpenItineraries }) {
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
