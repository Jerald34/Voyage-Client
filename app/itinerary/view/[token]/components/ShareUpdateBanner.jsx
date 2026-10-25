"use client";

/**
 * The polite notice on the public share page: the agency edited the itinerary
 * while it was open. Nothing on the page changes until the reader taps
 * "Show latest", so someone mid-read or mid-comment is never disrupted.
 *
 * The live region is always in the DOM, empty until there is something to say,
 * so screen readers announce the banner when it arrives (a region inserted along
 * with its text is often missed). It sits above the itinerary's own scroller,
 * not inside it, so it stays in view however far down the reader is. That pushes
 * the scroller down by the banner's height; the page scrolls by the same amount
 * (see the layout effect in page.jsx) so the text being read stays where it is.
 *
 * @param {boolean} visible an update is waiting
 * @param {boolean} busy "Show latest" is loading; the button stays focusable (aria-busy, not disabled)
 * @param {boolean} failed the last reload failed; the banner stays with a short note
 * @param {boolean} confirmed the update was just shown; a screen-reader-only confirmation, since the banner is gone
 * @param {() => void} onShowLatest
 * @param {import("react").Ref<HTMLDivElement>} [ref] the live region, so the page can tell whether focus was inside it
 */
export default function ShareUpdateBanner({ visible, busy = false, failed = false, confirmed = false, onShowLatest, ref }) {
  return (
    <div ref={ref} role="status" aria-live="polite" aria-atomic="false" aria-label="Itinerary updates" className="shrink-0">
      {visible ? (
        <div className="frame-pop-in mx-7 mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-sm border border-secondary/30 border-l-[3px] border-l-secondary bg-secondary/10 px-4 py-2.5 max-sm:mx-4 max-[400px]:mx-3">
          <div className="min-w-0 flex-1 basis-[12rem]">
            <p className="m-0 text-[13px] font-semibold leading-[1.45] text-text-primary">Your agent updated this itinerary</p>
            {failed ? (
              <p className="m-0 mt-0.5 text-[12px] font-medium leading-[1.45] text-status-danger">Couldn&apos;t load the update. Try again.</p>
            ) : null}
          </div>
          {/* aria-busy, not disabled: a disabled button drops out of the tab order and loses focus mid-load. */}
          <button
            type="button"
            onClick={onShowLatest}
            aria-busy={busy || undefined}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-pill bg-secondary-strong px-3.5 text-[12px] font-semibold text-on-secondary-strong transition-[opacity,scale] duration-150 ease-out hover:opacity-90 active:scale-[0.97] aria-busy:cursor-progress aria-busy:opacity-70 pointer-coarse:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary motion-reduce:transition-none"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={busy ? "motion-safe:animate-spin" : undefined}
            >
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
            Show latest
          </button>
        </div>
      ) : null}
      {confirmed && !visible ? <p className="sr-only">Itinerary updated.</p> : null}
    </div>
  );
}
