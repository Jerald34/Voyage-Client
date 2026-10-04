"use client";

import { useId, useState } from "react";
import { useNowMinute } from "@/app/hooks/useLocalClock";
import { timeAgo, timeAgoSpoken } from "@/app/lib/relativeTime";
import EmptyState from "./EmptyState";
import KindIcon from "./KindIcon";

/** Rows shown before "Show all". */
const VISIBLE = 3;
/** The most rows the card ever lists, whatever the server sends. */
const MAX_ROWS = 5;
/** Buttons dip to 97% while pressed. `scale` is the property Tailwind's scale utilities set, so it must be the one transitioned. */
const PRESS = "transition-[color,background-color,scale] duration-150 ease-out active:scale-[0.97]";

const viewsText = (count) => (count === 1 ? "1 view" : `${count} views`);

/**
 * Itineraries clients opened in the last 30 days, newest view first, at most
 * five. Each row opens its trip with
 * `onOpenTrip(tripId, tripTitle, clientName)`. Times wait for the browser's
 * clock, so server-rendered HTML matches the browser's first render. The
 * dashboard's period switcher doesn't apply here.
 */
export default function RecentlyViewedPanel({ views = [], onOpenTrip }) {
  const headingId = useId();
  const [expanded, setExpanded] = useState(false);
  const now = useNowMinute();
  const listed = views.slice(0, MAX_ROWS);
  const shown = expanded ? listed : listed.slice(0, VISIBLE);

  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 id={headingId} className="font-sans text-[13px] font-semibold tracking-normal text-text-primary">
          Recently viewed
        </h3>
        <span className="text-[12px] text-text-muted">Last 30 days</span>
      </div>

      {views.length === 0 ? (
        <div className="mt-1">
          <EmptyState variant="views" compact />
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          {shown.map((view) => {
            const ago = now === null ? null : timeAgo(view.lastViewedAt, now);
            const spokenAgo = now === null ? null : timeAgoSpoken(view.lastViewedAt, now);
            const label = [view.tripTitle, view.clientName, viewsText(view.viewCount), spokenAgo && `last viewed ${spokenAgo}`]
              .filter(Boolean)
              .join(", ");
            return (
              <button
                key={view.tripId}
                type="button"
                aria-label={label}
                onClick={() => onOpenTrip?.(view.tripId, view.tripTitle, view.clientName)}
                className={`frame-tile flex w-full flex-col gap-1 rounded-[12px] px-3 py-2 text-left hover:bg-text-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${PRESS}`}
              >
                <span className="flex min-w-0 items-start justify-between gap-2">
                  <span className="truncate text-[13px] font-semibold leading-snug text-text-primary" title={view.tripTitle}>
                    {view.tripTitle}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-[12px] tabular-nums text-text-muted">
                    <KindIcon kind="client_viewed" className="h-3.5 w-3.5" />
                    {viewsText(view.viewCount)}
                  </span>
                </span>
                <span className="flex items-end justify-between gap-2">
                  {/* A non-breaking space keeps this line's height when there is no client name: the time beside it waits for the browser's clock, so without it the row grows after hydration. */}
                  <span className="truncate text-[12px] text-text-muted">{view.clientName || " "}</span>
                  {ago ? (
                    <time dateTime={view.lastViewedAt} className="shrink-0 text-[12px] tabular-nums text-text-muted">
                      {ago}
                    </time>
                  ) : null}
                </span>
              </button>
            );
          })}
          {listed.length > VISIBLE ? (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
              className="min-h-[44px] self-start rounded-lg px-1 text-[13px] font-semibold text-secondary-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              {expanded ? "Show fewer" : `Show all (${listed.length})`}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
