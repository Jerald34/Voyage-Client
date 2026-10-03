"use client";

/** Buttons dip to 97% while pressed. `scale` is the property Tailwind's scale utilities set, so it must be the one transitioned. */
const PRESS = "transition-[color,background-color,scale] duration-150 ease-out active:scale-[0.97]";

/**
 * The one notice both dashboards show when the dashboard payload can't be
 * loaded or refreshed, so a failure looks and reads the same for everyone.
 * - `hasData` false: the first load failed and there is nothing to show. An
 *   alert, because the person needs to act (Retry).
 * - `hasData` true: older data is still on screen. A status, since nothing
 *   is broken, the numbers may just be behind.
 * The calendar loads separately and is never covered by this.
 */
export default function DashboardStaleBanner({ hasData, onRetry }) {
  function handleRetry() {
    // A refetch that fails again rejects; the failure is already shown here,
    // so don't let it surface as an unhandled rejection too.
    Promise.resolve(onRetry?.()).catch(() => {});
  }

  return (
    <div
      role={hasData ? "status" : "alert"}
      className="mt-4 inline-flex flex-wrap items-center gap-3 rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-2 text-sm font-semibold text-secondary-strong"
    >
      <span>
        {hasData
          ? "We couldn’t refresh — what you see may be out of date."
          : "We couldn’t load your dashboard."}
      </span>
      <button
        type="button"
        onClick={handleRetry}
        className={`rounded-pill bg-secondary-strong px-3 py-1 text-xs font-bold text-on-secondary-strong hover:bg-secondary-strong/90 pointer-coarse:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 ${PRESS}`}
      >
        Retry
      </button>
    </div>
  );
}
