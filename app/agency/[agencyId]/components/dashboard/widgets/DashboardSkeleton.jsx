"use client";

/** Two columns from 1024px: main content, then a 280px (320px from 1280px) side column. */
export const DASHBOARD_GRID_CLASS =
  "mt-6 grid gap-5 min-[1024px]:grid-cols-[minmax(0,1fr)_280px] min-[1280px]:grid-cols-[minmax(0,1fr)_320px]";

/** Loading placeholder in the dashboard's own layout. */
export default function DashboardSkeleton() {
  return (
    <div className={`${DASHBOARD_GRID_CLASS} animate-pulse`} role="status" aria-label="Loading dashboard">
      <div className="space-y-5">
        <div className="frame-tile h-40 rounded-[20px]" />
        <div className="frame-tile h-[420px] rounded-[20px]" />
      </div>
      <div className="frame-tile h-[520px] rounded-[20px]" />
    </div>
  );
}
