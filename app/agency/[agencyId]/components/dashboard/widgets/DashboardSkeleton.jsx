"use client";

/** Two columns from 1024px: main content, then a 280px (320px from 1280px) side column. */
export const DASHBOARD_GRID_CLASS =
  "mt-6 grid gap-5 min-[1024px]:grid-cols-[minmax(0,1fr)_280px] min-[1280px]:grid-cols-[minmax(0,1fr)_320px]";

/**
 * Placeholders for the parts of the dashboard that wait for the dashboard
 * payload. The calendar is not here: it loads on its own and has its own
 * loading state, so it is always the real one.
 */

/** Stands in for the "Needs you today" card. */
export function NeedsYouSkeleton() {
  return (
    <div className="frame-tile h-40 motion-safe:animate-pulse rounded-[20px]" role="status" aria-label="Loading your to-do list" />
  );
}

/** Stands in for the side column (Insights or Your work). */
export function SideColumnSkeleton({ label = "Loading side panel" }) {
  return <div className="frame-tile h-[520px] motion-safe:animate-pulse rounded-[20px]" role="status" aria-label={label} />;
}
