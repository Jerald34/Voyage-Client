"use client";

import { useId, useState } from "react";
import { useNowMinute } from "@/app/hooks/useLocalClock";
import { timeAgo } from "@/app/lib/relativeTime";
import { commentPlace } from "../tripPanel/tripPanelFormat";

/** Rows shown before "Show all". */
const VISIBLE = 5;
/** Buttons dip to 97% while pressed. `scale` is the property Tailwind's scale utilities set, so it must be the one transitioned. */
const PRESS = "transition-[color,background-color,scale] duration-150 ease-out active:scale-[0.97]";
/** A full-width row would shift its edges by several pixels at 97%, so it darkens instead (like the rows in "Needs you today"). */
const ROW_PRESS = "transition-colors duration-150 ease-out hover:bg-text-primary/5 active:bg-text-primary/10";

const FILTERS = [
  { key: "waiting", label: "Waiting", empty: "No comments are waiting for a reply." },
  { key: "answered", label: "Answered", empty: "No replies in the last 30 days." },
];

/** "Waiting 6h" for an open comment, "Replied 2d ago" for an answered one; null before the clock is known. */
function rowTime(row, now) {
  if (now === null) return null;
  if (row.agencyRepliedAt) return `Replied ${timeAgo(row.agencyRepliedAt, now).toLowerCase()}`;
  const ago = timeAgo(row.createdAt, now);
  return ago === "Just now" ? "Waiting under a minute" : `Waiting ${ago.replace(/ ago$/, "")}`;
}

/**
 * "Client comments": every comment waiting for the agency, and the ones
 * answered in the last 30 days, so nobody has to hunt for what a client asked
 * or what the team said. Each row opens the trip panel at that comment
 * through `onOpenComment(row)`. `now` (epoch ms) is for tests; the page uses
 * the browser's minute clock so server and browser renders agree.
 *
 * Waiting / Answered is a pair of toggle buttons (`aria-pressed`), so each is
 * a tab stop and Enter or Space switches it.
 */
export default function ClientCommentsCard({ comments, onOpenComment, now: nowProp }) {
  const headingId = useId();
  const clock = useNowMinute();
  const now = nowProp ?? clock;
  const [filter, setFilter] = useState("waiting");
  const [expanded, setExpanded] = useState(false);
  const rows = comments?.[filter] ?? [];
  const shown = expanded ? rows : rows.slice(0, VISIBLE);
  const active = FILTERS.find((f) => f.key === filter);

  return (
    <section aria-labelledby={headingId} className="frame-tile rounded-[20px] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <h2 id={headingId} className="font-sans text-[15px] font-semibold tracking-normal text-text-primary">
          Client comments
        </h2>
        <div role="group" aria-label="Show comments" className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => {
                setFilter(f.key);
                setExpanded(false);
              }}
              className={`min-h-9 rounded-lg px-2.5 text-[12px] font-semibold pointer-coarse:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${PRESS} ${
                filter === f.key ? "bg-secondary-strong text-on-secondary-strong" : "text-text-muted hover:bg-text-primary/5"
              }`}
            >
              {`${f.label} (${comments?.[f.key]?.length ?? 0})`}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="m-0 py-1 text-[13px] text-text-muted">{active.empty}</p>
      ) : (
        // -mx-2 / px-2: the hover tint reaches past the text, which stays lined up with the heading.
        <div role="list" className="-mx-2 flex flex-col divide-y divide-[color:var(--frame-border)]">
          {shown.map((row) => {
            const time = rowTime(row, now);
            const place = `${row.tripTitle} · ${commentPlace(row)}`;
            return (
              <div key={row.id} role="listitem">
                <button
                  type="button"
                  onClick={() => onOpenComment(row)}
                  className={`flex w-full min-w-0 flex-col gap-0.5 rounded-md px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${ROW_PRESS}`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold text-text-primary">{row.authorName}</span>
                    {time ? <span className="shrink-0 text-[12px] tabular-nums text-text-muted">{time}</span> : null}
                  </span>
                  <span className="truncate text-[12px] text-text-muted" title={place}>
                    {place}
                  </span>
                  <span className="line-clamp-2 text-[13px] text-text-primary">{`“${row.excerpt}”`}</span>
                  {row.agencyReply ? (
                    <span className="line-clamp-1 text-[12px] text-text-muted">{`You: ${row.agencyReply}`}</span>
                  ) : null}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {rows.length > VISIBLE ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className={`mt-1 min-h-[44px] rounded-lg px-2 text-[13px] font-semibold text-secondary-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${PRESS}`}
        >
          {expanded ? "Show fewer" : `Show all (${rows.length})`}
        </button>
      ) : null}
    </section>
  );
}
