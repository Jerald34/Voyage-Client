// ClientList — sidebar listing saved clients with search and delete-confirm UI. Extracted from ClientItineraryPage.jsx.

import { useState } from "react";
import { EmptyState } from "../../ui/index.js";
import { SearchIcon, TrashIcon, UsersIcon } from "../../icons/index.js";

export default function ClientList({
  clients,
  filteredClients,
  searchQuery,
  setSearchQuery,
  selectedClientId,
  onSelectClient,
  onRequestDeleteClient,
  unreadByClientId = {},
}) {
  const [showClientDeleteConfirm, setShowClientDeleteConfirm] = useState(null);
  const [isDeletingClient, setIsDeletingClient] = useState(false);

  const handleConfirmDelete = async (client) => {
    if (isDeletingClient) return;
    setIsDeletingClient(true);
    try {
      await onRequestDeleteClient?.(client);
      setShowClientDeleteConfirm(null);
    } finally {
      setIsDeletingClient(false);
    }
  };

  return (
    <>
      {/* Pane header */}
      <div className="px-4 py-4 border-b border-border grid gap-2.5">
        <h3 className="font-serif text-[1.6rem] text-text-primary m-0 tracking-tight">Client Directory</h3>
        <div className="relative flex items-center">
          <SearchIcon width={18} height={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-soft pointer-events-none z-[1]" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-3 pr-4 pl-12 rounded-md border border-border/10 bg-surface text-[0.95rem] font-[inherit] text-text-primary placeholder:text-text-soft transition-all duration-200 focus:outline-none focus:border-secondary focus:bg-surface-elevated focus:shadow-[0_0_0_4px_rgba(215,122,97,0.1)]"
          />
        </div>
      </div>

      {/* Client list */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
        {filteredClients.length > 0 ? (
          filteredClients.map(c => {
            const initials = c.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            const isConfirming = showClientDeleteConfirm === c.id;
            const isSelected = selectedClientId === c.id;
            const unread = unreadByClientId[c.id] || 0;

            return (
              <div
                key={c.id}
                className={`flex items-center gap-2 p-1 rounded-md transition-all duration-300 relative mb-0.5 ${isSelected
                  ? "bg-secondary/20 shadow-soft border border-secondary/30"
                  : "hover:bg-background border border-transparent"
                  }`}
              >
                <button
                  className="all-unset flex-1 flex items-center gap-3.5 px-3 py-2.5 cursor-pointer min-w-0 rounded-sm"
                  onClick={() => onSelectClient?.(c)}
                  title={`View ${c.name}'s itineraries`}
                >
                  <div className="relative flex-shrink-0">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-[0.85rem] shadow-[0_4px_10px_rgba(0,0,0,0.1)] transition-all duration-200 ${isSelected ? "bg-secondary text-white" : "bg-secondary/40 text-white"
                      }`}>
                      {initials}
                    </div>
                    {unread > 0 && (
                      <span
                        className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-[#dc2626] text-white text-[0.65rem] font-extrabold leading-none ring-2 ring-surface"
                        title={`${unread} unread comment${unread === 1 ? "" : "s"}`}
                      >
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <strong className={`block text-[0.95rem] font-bold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis transition-colors duration-200 ${isSelected ? "text-secondary font-black" : "text-text-primary"
                      }`}>
                      {c.name}
                    </strong>
                    {!isConfirming && (
                      <span className={`text-[0.75rem] font-semibold opacity-70 transition-colors duration-200 ${isSelected ? "text-text-primary" : "text-text-soft"
                        }`}>
                        {c.trips.length} saved itineraries
                      </span>
                    )}
                  </div>
                </button>

                {isConfirming ? (
                  <div className="flex gap-1 pr-2 flex-shrink-0" style={{ animation: "cip-slide-in 0.2s ease-out" }}>
                    <button
                      className="px-2.5 py-1.5 rounded-[6px] border-none bg-[#dc2626] text-white text-[0.7rem] font-extrabold cursor-pointer transition-all duration-200 shadow-[0_2px_8px_rgba(220,38,38,0.25)] whitespace-nowrap hover:enabled:bg-[#b91c1c] hover:enabled:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isDeletingClient}
                      onClick={() => handleConfirmDelete(c)}
                    >
                      {isDeletingClient ? "..." : "Delete"}
                    </button>
                    <button
                      className="px-2 py-1.5 rounded-[6px] border border-border bg-surface text-[0.7rem] font-bold text-text-soft cursor-pointer transition-all duration-200 whitespace-nowrap hover:enabled:bg-background"
                      disabled={isDeletingClient}
                      onClick={() => setShowClientDeleteConfirm(null)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className={`border-none w-8 h-8 flex items-center justify-center cursor-pointer rounded-lg transition-all duration-200 flex-shrink-0 mr-1 ${isSelected
                      ? "bg-transparent text-white/60 hover:bg-white/15 hover:text-white"
                      : "bg-transparent text-text-soft hover:bg-[#fef2f2] hover:text-[#dc2626] hover:scale-110"
                      }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowClientDeleteConfirm(c.id);
                    }}
                    title="Delete client record"
                  >
                    <TrashIcon width={14} height={14} />
                  </button>
                )}
              </div>
            );
          })
        ) : (
          clients.length === 0 ? (
            <EmptyState
              icon={<UsersIcon width={40} height={40} strokeWidth={1.5} className="text-secondary opacity-45 transition-opacity duration-300 hover:opacity-70" />}
              title="No client directory yet."
              className="flex-1 m-3 border-2 border-dashed border-border rounded-md bg-[rgba(34,56,67,0.02)] min-h-[240px]"
            />
          ) : searchQuery.trim() ? (
            <div className="px-3.5 py-[22px] text-center text-text-soft italic text-[0.9rem] leading-relaxed">
              No saved clients match your search.
            </div>
          ) : null
        )}
      </div>
    </>
  );
}
