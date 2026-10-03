"use client";

import { useId, useState } from "react";
import EmptyState from "./EmptyState";
import WorklistRow from "./WorklistRow";

/** Rows shown before "Show all". */
export const NEEDS_YOU_VISIBLE = 5;

/** Rows fade in 40ms apart, capped so a long list never lags. */
const STAGGER_MS = 40;
const STAGGER_ROWS = 6;

/** Buttons dip to 97% while pressed. `scale` is the property Tailwind's scale utilities set, so it must be the one transitioned. */
const PRESS = "transition-[color,background-color,scale] duration-150 ease-out active:scale-[0.97]";

/**
 * "Needs you today": the flattened worklist, most urgent first. Shows five
 * rows and the rest on request. `onAction(item)` runs for the row body and
 * its action button.
 */
export default function NeedsYouList({ items, onAction }) {
  const headingId = useId();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, NEEDS_YOU_VISIBLE);
  // Rows revealed by "Show all" stagger from the first new row, not from the top.
  const staggerFrom = expanded ? NEEDS_YOU_VISIBLE : 0;

  return (
    <section aria-labelledby={headingId} className="frame-tile rounded-[20px] px-4 py-3">
      <div className="flex items-center justify-between gap-3 pb-1">
        <h2 id={headingId} className="font-sans text-[15px] font-semibold tracking-normal text-text-primary">
          Needs you today
        </h2>
        {items.length > 0 ? (
          <span className="text-[12px] text-text-muted">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState variant="worklist" />
      ) : (
        <>
          <div role="list" className="divide-y divide-[color:var(--frame-border)]">
            {visible.map((item, index) => (
              <WorklistRow
                key={item.key}
                enterDelay={Math.min(Math.max(index - staggerFrom, 0), STAGGER_ROWS) * STAGGER_MS}
                kind={item.kind}
                tone={item.tone}
                title={item.title}
                subtitle={item.subtitle}
                hint={item.hint}
                actionLabel={item.actionLabel}
                onAction={() => onAction(item)}
                onRowClick={() => onAction(item)}
              />
            ))}
          </div>
          {items.length > NEEDS_YOU_VISIBLE ? (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
              className={`mt-1 min-h-[44px] rounded-lg px-2 text-[13px] font-semibold text-secondary-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${PRESS}`}
            >
              {expanded ? "Show fewer" : `Show all (${items.length})`}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
