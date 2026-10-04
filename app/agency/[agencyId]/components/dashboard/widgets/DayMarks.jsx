"use client";

import KindIcon from "./KindIcon";

/** How each action looks on a tile and in the legend: an existing KindIcon and a status colour. */
export const ACTION_STYLE = {
  reply: { icon: "client_commented", tone: "text-status-danger", legend: "Needs reply" },
  lowRating: { icon: "proposal_rated", tone: "text-status-danger", legend: "Low rating" },
  expiring: { icon: "share_expires", tone: "text-status-warning", legend: "Link expires" },
  departing: { icon: "startingSoon", tone: "text-status-success", legend: "Departs soon" },
};

const COUNT = "text-[11px] font-semibold leading-none tabular-nums";

function ActionMark({ action, className, countClassName }) {
  const { icon, tone } = ACTION_STYLE[action.kind];
  return (
    <span data-action={action.kind} className={`${className} items-center gap-0.5 ${tone}`}>
      <KindIcon kind={icon} className="h-3 w-3 flex-none" />
      {action.count > 1 ? <span className={`${countClassName} ${COUNT}`}>{action.count}</span> : null}
    </span>
  );
}

/**
 * The marks in a day tile's corner. The tile is a CSS container, so what
 * shows follows the tile's own width:
 * - narrow: the most urgent icon only;
 * - medium: that icon with its count, then +N counting the items of the other kinds;
 * - wide: two icons with counts, +N counting the items of any further
 *   kinds, and ·N for quiet activity when only one kind of action is drawn.
 * A day with no action shows only ·N. The marks are aria-hidden: the tile's
 * label says the same in words.
 *
 * The thresholds are written for the container's CONTENT box (@min-[46px] and
 * @min-[70px]), which is the tile's outer width less the 14px of padding and
 * border DayTile adds (p-1.5 = 12px, plus a 1px border each side). By outer
 * tile width that is: narrow under 60px, medium 60–83px, wide 84px and up.
 * Keep the class strings literal so Tailwind can see them.
 */
export function DayMarks({ summary }) {
  const { actions, actionCount, quietCount } = summary;
  if (actions.length === 0) {
    return quietCount > 0 ? (
      <span aria-hidden="true" data-day-marks="" className="text-[11px] leading-none tabular-nums text-text-muted">
        ·{quietCount}
      </span>
    ) : null;
  }

  const [first, second] = actions;
  const afterFirst = actionCount - first.count;
  const afterTwo = afterFirst - (second?.count ?? 0);
  return (
    <span aria-hidden="true" data-day-marks="" className="flex items-center gap-1 leading-none">
      <ActionMark action={first} className="inline-flex" countClassName="hidden @min-[46px]:inline" />
      {second ? <ActionMark action={second} className="hidden @min-[70px]:inline-flex" countClassName="inline" /> : null}
      {afterFirst > 0 ? (
        <span data-more="" className={`hidden @min-[46px]:inline @min-[70px]:hidden ${COUNT} text-text-primary`}>
          +{afterFirst}
        </span>
      ) : null}
      {afterTwo > 0 ? (
        <span data-more="" className={`hidden @min-[70px]:inline ${COUNT} text-text-primary`}>
          +{afterTwo}
        </span>
      ) : null}
      {actions.length === 1 && quietCount > 0 ? (
        <span data-quiet="" className="hidden @min-[70px]:inline text-[11px] leading-none tabular-nums text-text-muted">
          ·{quietCount}
        </span>
      ) : null}
    </span>
  );
}

/** The calendar's key: the trip bar, the four action icons and the quiet count. */
export function CalendarLegend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="h-[3px] w-3 rounded-full bg-secondary" />
        Trip
      </span>
      {Object.entries(ACTION_STYLE).map(([kind, { icon, tone, legend }]) => (
        <span key={kind} className="inline-flex items-center gap-1.5">
          <KindIcon kind={icon} className={`h-3 w-3 flex-none ${tone}`} />
          {legend}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="font-semibold tabular-nums">
          ·N
        </span>
        Other activity
      </span>
    </div>
  );
}
