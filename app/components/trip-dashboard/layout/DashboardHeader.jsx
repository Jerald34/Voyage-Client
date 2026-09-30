import React from "react";
import ClientSwitcher from "../command-center/ClientSwitcher.jsx";

export default function DashboardHeader({
  isSidebarOpen,
  setIsSidebarOpen,
  liveStatus,
  scopedStreamError,
  scopedIsStreaming,
  getInitials,
  displayName,
  agencyId,
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
  const showCenterActions = activeTab !== "itineraries";
  return (
    <header className="flex items-center justify-between h-[84px] bg-background/80 border-b border-border/10 backdrop-blur-md px-7 flex-shrink-0 z-[100] gap-5 max-[900px]:px-3 max-[900px]:h-[48px] max-[900px]:gap-2">
      {/* Brand logo */}
      <div className="flex items-center gap-3.5 max-[600px]:gap-2">
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
        <span
          className="w-11 h-11 rounded-[14px] bg-secondary text-white inline-flex items-center justify-center shadow-[0_6px_20px_rgba(215,122,97,0.25)] flex-shrink-0 max-[900px]:hidden"
          aria-hidden="true"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.2 6.3 6.8 1-4.9 4.8 1.2 6.8L12 17.7 5.7 21l1.2-6.8L2 9.3l6.8-1L12 2z" />
          </svg>
        </span>
        <div className="max-[900px]:hidden">
          <div className="text-[15px] font-bold tracking-[0.24em] text-primary max-[600px]:text-[13px]">VOYAGE</div>
          <div className="text-xs text-text-muted mt-0.5 max-[900px]:hidden">Agency trip workspace</div>
        </div>
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

      {/* Header actions */}
      <div className="flex items-center gap-3.5">
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
        <div className="flex items-center gap-3 pl-3 border-l border-border/10 max-[900px]:border-none max-[900px]:pl-0 max-[900px]:gap-1">
          <div
            className="w-10 h-10 rounded-full inline-flex items-center justify-center bg-secondary text-white text-[13px] font-bold tracking-[0.04em] flex-shrink-0 max-[900px]:w-8 max-[900px]:h-8 max-[900px]:text-[11px]"
            aria-hidden="true"
          >
            {getInitials(displayName)}
          </div>
          <div className="flex flex-col max-[900px]:hidden">
            <strong className="text-sm text-primary transition-colors">{displayName}</strong>
            <span className="text-xs text-text-soft">{agencyId ? "Agency workspace" : "No agency selected"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
