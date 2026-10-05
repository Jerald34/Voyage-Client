// ItineraryHeader — the workspace's page header: client name, a status and count line, and the trip's actions. Extracted from ClientItineraryPage.jsx.

import { Spinner } from "../../ui/index.js";
import {
  ArrowLeftIcon,
  PlusIcon,
  ChatIcon,
  ShareIcon,
  DownloadIcon,
} from "../../icons/index.js";
import { formatSavedItineraryCount, getSavedStatusLabel } from "../../../lib/trip-dashboard/savedItineraries.js";
import { getSavedStatusClass } from "../../../lib/formatters.js";
import ReuseLauncher from "../../ratedHistory/entryPoints/ReuseLauncher.jsx";
// By direct path: the page tests mock ui/index.js with a fixed export list.
import PdfDeliveryNotice from "../../ui/PdfDeliveryNotice.jsx";

// The header is a size container (`@container`). Under 720px of its own width the
// actions drop their visible label but keep the icon, tooltip and aria-label, so the
// row never wraps or cuts the client's name off. ReuseButton follows the same rule
// in its "clientItinerary" mode. Padding and gaps stay tight (px-3, gap-1.5) so that,
// at 1280px with Reuse and Approve showing, the name column still fits the status
// line on one row.
const ACTION_BUTTON =
  "inline-flex items-center justify-center gap-1.5 min-w-[40px] min-h-[40px] px-2 @min-[720px]:px-3 rounded-lg border text-[0.85rem] font-bold cursor-pointer transition-[background-color,border-color,color,scale] duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none";
const ACTION_IDLE = "bg-surface-elevated text-text-primary border-border/20 hover:bg-surface hover:border-border/40";
const ACTION_LABEL = "hidden @min-[720px]:inline";

// In review waits on the agent, approved is done, anything else is neutral.
function statusDotClass(label) {
  if (/review/i.test(label)) return "bg-status-warning";
  return getSavedStatusClass(label) === "approved" ? "bg-status-success" : "bg-text-soft";
}

export default function ItineraryHeader({
  selectedClient,
  selectedTrip,
  selectedItineraryId,
  fullItinerary,
  unreadCommentCount,
  pdfLoading,
  // The PDF hook's state. The defaults suit a caller with no PDF hook: nothing to
  // announce, and the button follows the itinerary alone.
  pdfStatus = "idle",
  pdfFallbackUrl = null,
  pdfReady = true,
  showCommentsPanel,
  onBackToList,
  onAddTripForClient,
  onToggleComments,
  onShare,
  onDownloadPdf,
  // Approve shows only when the page passes a handler (the trip is in review).
  onApprove = null,
  isApproving = false,
  // Reuse launcher props (optional for Stage 6A)
  agencyId = null,
  currentTrip = null,
  targetItineraryId = null,
  currentVersion = null,
  onReuseInserted = null,
}) {
  const rawStatus = selectedTrip ? getSavedStatusLabel(selectedTrip) : "";
  // Tutorial data stores lowercase labels ("client approved").
  const statusLabel = rawStatus ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1) : "";

  return (
    <>
      {/* Back to the client list (single-column layout below lg) */}
      <button
        type="button"
        onClick={onBackToList}
        className="lg:hidden flex items-center gap-2 px-4 py-3 text-sm font-semibold text-text-muted border-b border-border/10 bg-transparent cursor-pointer hover:text-text-primary transition-colors"
      >
        <ArrowLeftIcon width={16} height={16} />
        All clients
      </button>
      <header className="@container flex-shrink-0 border-b border-border/10 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="m-0 truncate font-serif text-[28px] leading-tight" title={selectedClient.name}>
              {selectedClient.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-text-muted">
              {statusLabel ? (
                <>
                  <span role="status" className="inline-flex items-center gap-1.5 font-semibold text-text-primary">
                    <span aria-hidden="true" className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${statusDotClass(statusLabel)}`} />
                    {statusLabel}
                  </span>
                  <span aria-hidden="true">·</span>
                </>
              ) : null}
              <span>{formatSavedItineraryCount(selectedClient.trips.length)}</span>
              {onAddTripForClient ? (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => onAddTripForClient(selectedClient.name)}
                    aria-label={`New trip for ${selectedClient.name}`}
                    title={`Start a new trip for ${selectedClient.name}`}
                    className="inline-flex min-h-[28px] cursor-pointer items-center gap-1 rounded-md bg-transparent font-semibold text-secondary-strong underline-offset-2 hover:underline"
                  >
                    <PlusIcon width={12} height={12} strokeWidth={2.5} aria-hidden="true" />
                    New trip
                  </button>
                </>
              ) : null}
            </div>
            <PdfDeliveryNotice status={pdfStatus} fallbackUrl={pdfFallbackUrl} className="mt-1 empty:mt-0" />
          </div>

          <div data-tour-target="cip-actions" className="flex flex-shrink-0 items-center gap-1.5">
            {selectedItineraryId && (
              <>
                {/* Reuse from rated trips — optional launcher for Stage 6A */}
                {agencyId && currentTrip && targetItineraryId && currentVersion !== null && (
                  <ReuseLauncher
                    agencyId={agencyId}
                    currentTrip={currentTrip}
                    targetTripId={currentTrip.tripId}
                    targetItineraryId={targetItineraryId}
                    currentVersion={currentVersion}
                    mode="clientItinerary"
                    onInserted={onReuseInserted || (() => {})}
                  />
                )}

                <button
                  type="button"
                  className={`${ACTION_BUTTON} ${showCommentsPanel ? "bg-secondary-strong text-on-secondary-strong border-secondary-strong" : ACTION_IDLE}`}
                  onClick={onToggleComments}
                  title="View client comments"
                  aria-label="Comments"
                  aria-pressed={showCommentsPanel}
                >
                  <ChatIcon width={14} height={14} aria-hidden="true" />
                  <span className={ACTION_LABEL}>Comments</span>
                  {unreadCommentCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-pill bg-[#dc2626] text-white text-[0.65rem] font-extrabold leading-none flex-shrink-0">
                      {unreadCommentCount > 99 ? "99+" : unreadCommentCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  className={`${ACTION_BUTTON} ${ACTION_IDLE}`}
                  onClick={onShare}
                  title="Share itinerary"
                  aria-label="Share"
                >
                  <ShareIcon width={14} height={14} aria-hidden="true" />
                  <span className={ACTION_LABEL}>Share</span>
                </button>

                <button
                  type="button"
                  className={`${ACTION_BUTTON} ${ACTION_IDLE} disabled:cursor-not-allowed disabled:opacity-60 ${pdfLoading ? "pointer-events-none" : ""}`}
                  onClick={onDownloadPdf}
                  disabled={pdfLoading || !fullItinerary || !pdfReady}
                  title="Download itinerary as PDF"
                  aria-label="Download PDF"
                >
                  {pdfLoading ? <Spinner size="sm" /> : <DownloadIcon width={14} height={14} aria-hidden="true" />}
                  <span className={ACTION_LABEL}>{pdfLoading ? "Generating..." : "PDF"}</span>
                </button>
              </>
            )}

            {onApprove ? (
              <button
                type="button"
                onClick={onApprove}
                disabled={isApproving}
                className="inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-lg bg-secondary-strong px-4 text-[0.85rem] font-semibold text-on-secondary-strong transition-[opacity,scale] duration-150 ease-out hover:opacity-90 active:scale-[0.97] disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
              >
                {isApproving ? "Approving…" : "Approve"}
              </button>
            ) : null}
          </div>
        </div>
      </header>
    </>
  );
}
