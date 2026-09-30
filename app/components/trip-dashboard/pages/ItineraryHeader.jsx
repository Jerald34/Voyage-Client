// ItineraryHeader — workspace header with client title, status badge, and action buttons. Extracted from ClientItineraryPage.jsx.

import { Spinner, StatusBadge } from "../../ui/index.js";
import {
  ArrowLeftIcon,
  PlusIcon,
  ChatIcon,
  ShareIcon,
  DownloadIcon,
  BookmarkIcon,
  CheckIcon,
} from "../../icons/index.js";
import { getSavedStatusLabel } from "../../../lib/trip-dashboard/savedItineraries.js";
import { getSavedStatusClass } from "../../../lib/formatters.js";
import ReuseLauncher from "../../ratedHistory/entryPoints/ReuseLauncher.jsx";

export default function ItineraryHeader({
  selectedClient,
  selectedTrip,
  selectedItineraryId,
  fullItinerary,
  unreadCommentCount,
  pdfLoading,
  showCommentsPanel,
  onBackToList,
  onAddTripForClient,
  onToggleComments,
  onShare,
  onDownloadPdf,
  // Reuse launcher props (optional for Stage 6A)
  agencyId = null,
  currentTrip = null,
  targetItineraryId = null,
  currentVersion = null,
  onReuseInserted = null,
}) {
  return (
    <>
      {/* Mobile back button */}
      <button
        type="button"
        onClick={onBackToList}
        className="lg:hidden flex items-center gap-2 px-4 py-3 text-sm font-semibold text-text-muted border-b border-border/10 bg-transparent cursor-pointer hover:text-text-primary transition-colors"
      >
        <ArrowLeftIcon width={16} height={16} />
        All clients
      </button>
      {/* Workspace header */}
      <header className="px-4 sm:px-6 py-3 sm:py-4 bg-transparent flex justify-between items-start sm:items-center gap-3 border-b border-border/10 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0">
          <h2 className="font-serif text-[1.4rem] sm:text-[1.8rem] m-0 leading-tight truncate">{selectedClient.name}</h2>
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-[0.75rem] font-extrabold uppercase tracking-[0.05em]">
            <BookmarkIcon width={12} height={12} strokeWidth={3} />
            Saved itineraries
          </div>
          <span className="text-[0.8rem] sm:text-[0.9rem] text-text-soft font-semibold">
            {selectedClient.trips.length} saved
          </span>
        </div>
        {selectedClient && onAddTripForClient && (
          <button
            type="button"
            onClick={() => onAddTripForClient(selectedClient.name)}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-lg border border-secondary/30 bg-secondary/10 text-secondary text-[0.85rem] font-bold cursor-pointer transition-all duration-200 hover:bg-secondary/20 hover:border-secondary/50"
            title={`Start a new trip for ${selectedClient.name}`}
          >
            <PlusIcon width={14} height={14} strokeWidth={2.5} aria-hidden="true" />
            <span className="truncate max-w-[12ch]">New trip for {selectedClient.name}</span>
          </button>
        )}
        <div data-tour-target="cip-actions" className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {selectedTrip && (
            <StatusBadge variant={getSavedStatusClass(getSavedStatusLabel(selectedTrip)) === "approved" ? "approved" : "default"} size="sm">
              <CheckIcon width={10} height={10} strokeWidth={3} />
              {getSavedStatusLabel(selectedTrip)}
            </StatusBadge>
          )}
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

              {/* Comments — icon-only on mobile, icon+label on sm+ */}
              <button
                className={`inline-flex items-center justify-center gap-2 min-w-[40px] min-h-[40px] px-2 sm:px-3.5 rounded-lg border text-[0.85rem] font-bold cursor-pointer transition-all duration-200 ${showCommentsPanel
                  ? "bg-secondary text-white border-secondary shadow-soft"
                  : "bg-surface-elevated text-text-primary border-border/20 hover:bg-surface hover:border-border/40"
                  }`}
                onClick={onToggleComments}
                title="View client comments"
                aria-label="Comments"
              >
                <ChatIcon width={14} height={14} aria-hidden="true" />
                <span className="hidden sm:inline">Comments</span>
                {unreadCommentCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-pill bg-[#dc2626] text-white text-[0.65rem] font-extrabold leading-none flex-shrink-0">
                    {unreadCommentCount > 99 ? "99+" : unreadCommentCount}
                  </span>
                )}
              </button>

              {/* Share */}
              <button
                className="inline-flex items-center justify-center gap-2 min-w-[40px] min-h-[40px] px-2 sm:px-3.5 rounded-lg border border-border/20 bg-surface-elevated text-text-primary text-[0.85rem] font-bold cursor-pointer transition-all duration-200 hover:bg-surface hover:border-border/40"
                onClick={onShare}
                aria-label="Share"
              >
                <ShareIcon width={14} height={14} aria-hidden="true" />
                <span className="hidden sm:inline">Share</span>
              </button>

              {/* PDF */}
              <button
                className={`inline-flex items-center justify-center gap-2 min-w-[40px] min-h-[40px] px-2 sm:px-3.5 rounded-lg border border-border/20 bg-surface-elevated text-text-primary text-[0.85rem] font-bold cursor-pointer transition-all duration-200 hover:bg-surface hover:border-border/40 ${pdfLoading ? "opacity-60 cursor-not-allowed pointer-events-none" : ""}`}
                onClick={onDownloadPdf}
                disabled={pdfLoading || !fullItinerary}
                title="Download itinerary as PDF"
                aria-label="Download PDF"
              >
                {pdfLoading ? (
                  <Spinner size="sm" />
                ) : (
                  <DownloadIcon width={14} height={14} aria-hidden="true" />
                )}
                <span className="hidden sm:inline">{pdfLoading ? "Generating..." : "PDF"}</span>
              </button>
            </>
          )}
        </div>
      </header>
    </>
  );
}
