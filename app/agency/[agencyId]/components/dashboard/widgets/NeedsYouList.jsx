"use client";

import { useId, useState } from "react";
import EmptyState from "./EmptyState";
import WorklistRow from "./WorklistRow";

/** Rows shown before "Show all". */
export const NEEDS_YOU_VISIBLE = 5;

/**
 * "Needs you today": the flattened worklist, most urgent first. Shows five
 * rows and the rest on request. `onAction(item)` runs for the row body and
 * its action button.
 */
export default function NeedsYouList({ items, onAction }) {
  const headingId = useId();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, NEEDS_YOU_VISIBLE);

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
            {visible.map((item) => (
              <WorklistRow
                key={item.key}
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
              className="mt-1 min-h-[44px] rounded-lg px-2 text-[13px] font-semibold text-secondary-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              {expanded ? "Show fewer" : `Show all (${items.length})`}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
