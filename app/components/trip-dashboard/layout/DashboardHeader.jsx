import React from "react";
import ClientSwitcher from "../command-center/ClientSwitcher.jsx";

/**
 * Top bar for the Command Center, Itineraries, Settings and Admin tabs:
 * New Itinerary, the client/trip switcher, "Save to Client" and the agent's
 * live status. The brand and the account live in the rail.
 *
 * `variant="compact"` (phones, Dashboard tab) keeps only the menu button and
 * the logo. On desktop the Dashboard renders no header at all.
 */
export default function DashboardHeader({
  variant = "full",
  isSidebarOpen,
  setIsSidebarOpen,
  liveStatus,
  scopedStreamError,
  scopedIsStreaming,
  getInitials,
  activeTab,
  // Trip management props
  onNewItinerary,
  isCreatingDraftThread,
  isClientMenuOpen,
  setIsClientMenuOpen,
  clientMenuRef,
  hasOptions,
  activeTripClientName,
  activeTripInitials,
  activeTripOrganizerInitials,
  clientMenuEmptyTitle,
  clientMenuEmptyBody,
  safeOptions,
  activeOption,
  onPlanningOptionDelete,
  deletingThreadId,
  onPlanningOptionChange,
  onRenameThread,
  canApproveDraft,
  onApproveDraft
}) {
  const isFull = variant === "full";
  const showCenterActions = isFull && activeTab !== "itineraries";
  return (
    <header className="flex h-[84px] flex-shrink-0 items-center justify-between gap-5 border-b border-[color:var(--frame-border)] px-7 max-[900px]:h-[48px] max-[900px]:gap-2 max-[900px]:px-3">
      <div className="flex items-center gap-2">
        <button
          className="hidden max-[900px]:flex bg-transparent border-none text-primary p-2 cursor-pointer"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isSidebarOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        {!isFull ? <img src="/icon.svg" alt="Voyage" className="h-7 w-7" /> : null}
      </div>

      {showCenterActions && (
        <div className="flex items-center gap-3 flex-1 justify-center min-w-0 max-[900px]:gap-1.5">
          <button
            data-tour-target="new-itinerary"
            className="inline-flex items-center gap-2 border border-border/10 rounded-pill bg-white/10 text-text-primary px-[18px] text-[13px] font-bold tracking-[-0.01em] cursor-pointer whitespace-nowrap shadow-sm transition-all duration-200 h-11 hover:-translate-y-px hover:bg-white/15 hover:shadow-md disabled:cursor-wait disabled:opacity-50 disabled:translate-y-0 max-[900px]:w-8 max-[900px]:h-8 max-[900px]:px-0 max-[900px]:justify-center max-[900px]:rounded-full max-[900px]:border-none max-[900px]:shadow-none"
            onClick={() => onNewItinerary?.()}
            disabled={isCreatingDraftThread}
            type="button"
            aria-label="New Itinerary"
          >
            <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-pill bg-white/10 text-sm leading-none" aria-hidden="true">+</span>
            <span className="max-[900px]:hidden">{isCreatingDraftThread ? "Creating..." : "New Itinerary"}</span>
          </button>

          <div className="flex items-center gap-3 min-w-0 max-[900px]:gap-1.5">
            <div data-tour-target="client-switcher" className="min-w-0">
              <ClientSwitcher
                isClientMenuOpen={isClientMenuOpen}
                setIsClientMenuOpen={setIsClientMenuOpen}
                clientMenuRef={clientMenuRef}
                hasOptions={hasOptions}
                activeTripClientName={activeTripClientName}
                activeTripInitials={activeTripInitials}
                activeTripOrganizerInitials={activeTripOrganizerInitials}
                clientMenuEmptyTitle={clientMenuEmptyTitle}
                clientMenuEmptyBody={clientMenuEmptyBody}
                safeOptions={safeOptions}
                activeOption={activeOption}
                getInitials={getInitials}
                onPlanningOptionDelete={onPlanningOptionDelete}
                deletingThreadId={deletingThreadId}
                onPlanningOptionChange={onPlanningOptionChange}
                onRenameThread={onRenameThread}
              />
            </div>
            {canApproveDraft && (
              <button
                className="inline-flex items-center justify-center border border-border/10 rounded-pill bg-surface-elevated text-text-primary px-4 text-[13px] font-extrabold cursor-pointer whitespace-nowrap h-11 hover:border-secondary hover:text-secondary transition-colors shadow-sm max-[900px]:h-8 max-[900px]:px-2.5 max-[900px]:text-[11px]"
                onClick={() => onApproveDraft?.()}
                type="button"
              >
                Save<span className="max-[900px]:hidden"> to Client</span>
              </button>
            )}
          </div>
        </div>
      )}

      {isFull ? (
        <div className="flex items-center">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-pill text-xs font-semibold border transition-colors max-[900px]:hidden ${
              scopedStreamError
                ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900"
                : scopedIsStreaming
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900"
                : "bg-white/5 text-text-primary border-border/10"
            }`}
          >
            <span className="w-2 h-2 rounded-pill bg-current" />
            {liveStatus}
          </div>
        </div>
      ) : null}
    </header>
  );
}
