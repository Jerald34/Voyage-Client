import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function ClientSwitcher({
  isClientMenuOpen,
  setIsClientMenuOpen,
  clientMenuRef,
  hasOptions,
  activeTripClientName,
  activeTripInitials,
  activeTripOrganizerInitials,
  clientMenuEmptyTitle,
  safeOptions,
  activeOption,
  getInitials,
  onPlanningOptionDelete,
  deletingThreadId,
  onPlanningOptionChange,
  clientMenuEmptyBody,
  onRenameThread,
}) {
  const triggerRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState(null);
  const [editingThreadId, setEditingThreadId] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  useEffect(() => {
    if (!isClientMenuOpen) {
      setDropdownPos(null);
      return;
    }
    const compute = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const isCompact = window.innerWidth <= 900;
      if (isCompact) {
        setDropdownPos({
          position: "fixed",
          top: 48,
          left: 12,
          right: 12,
          maxHeight: "70vh",
        });
      } else {
        const desiredWidth = Math.max(320, r.width);
        const left = Math.min(
          Math.max(12, r.left),
          Math.max(12, window.innerWidth - desiredWidth - 12),
        );
        setDropdownPos({
          position: "fixed",
          top: r.bottom + 8,
          left,
          width: desiredWidth,
          maxHeight: 420,
        });
      }
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [isClientMenuOpen]);

  return (
    <div className="relative min-w-0" ref={clientMenuRef}>
      <button
        ref={triggerRef}
        className={`flex items-center gap-3 h-11 px-3 pr-2.5 rounded-pill border text-text-primary min-w-0 max-w-[340px] cursor-pointer transition-all max-[900px]:h-8 max-[900px]:px-2 max-[900px]:pr-1.5 max-[900px]:gap-1.5 max-[900px]:max-w-[160px] ${
          isClientMenuOpen
            ? "border-secondary bg-white/10 shadow-soft"
            : "border-border/20 bg-white/5 hover:bg-white/10 hover:border-border/40"
        }`}
        onClick={() => setIsClientMenuOpen((current) => !current)}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isClientMenuOpen}
        aria-label={hasOptions ? `Current client: ${activeTripClientName}` : clientMenuEmptyTitle}
      >
        {activeTripClientName ? (
          <>
            <span className="flex items-center flex-shrink-0" aria-hidden="true">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-[10px] font-bold max-[900px]:w-5 max-[900px]:h-5 max-[900px]:text-[8px]">
                {activeTripInitials}
              </span>
              {activeTripOrganizerInitials && (
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-secondary text-white text-[10px] font-bold -ml-2 border-2 border-background max-[900px]:w-5 max-[900px]:h-5 max-[900px]:text-[8px] max-[900px]:-ml-1.5">
                  {activeTripOrganizerInitials}
                </span>
              )}
            </span>
            <span className="text-sm font-semibold truncate min-w-0 max-[900px]:text-xs">{activeTripClientName}</span>
          </>
        ) : (
          <span className="text-sm font-semibold text-text-muted truncate">{clientMenuEmptyTitle}</span>
        )}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className="flex-shrink-0 ml-1">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isClientMenuOpen && typeof document !== "undefined" && createPortal(
        <div
          data-clientmenu-portal
          className="min-w-[320px] overflow-y-auto rounded-md bg-surface-elevated border border-border/20 shadow-strong z-[200]"
          style={dropdownPos ?? undefined}
          role="listbox"
          aria-label="Current client"
        >
          {hasOptions ? (
            safeOptions.map((option) => {
              const isSelected = option?.type === activeOption?.type && option?.id === activeOption?.id;
              const optionName = option?.clientName || option?.label || "Planning item";
              const initials = getInitials(optionName);
              const optionThreadId = option?.threadId ?? (option?.type === "draft" ? option?.id : null);
              const canDeleteThread = Boolean(optionThreadId && onPlanningOptionDelete);
              const isDeletingThread = Boolean(optionThreadId && deletingThreadId === optionThreadId);

              return (
                <div
                  key={`${option?.type ?? "option"}:${option?.id ?? optionName}`}
                  className={`flex items-stretch gap-1 border-b border-border/10 last:border-b-0 ${
                    isSelected ? "bg-secondary/8" : "hover:bg-border/5"
                  }`}
                >
                  <button
                    type="button"
                    className="flex-1 flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer min-w-0"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onPlanningOptionChange?.({ type: option?.type, id: option?.id });
                      setIsClientMenuOpen(false);
                    }}
                  >
                    <span className="inline-flex items-center justify-center w-9 h-9 flex-shrink-0 rounded-full bg-primary text-white text-[11px] font-bold" aria-hidden="true">
                      {initials}
                    </span>
                    <span className="flex flex-col min-w-0 flex-1">
                      {editingThreadId === optionThreadId ? (
                        <input
                          autoFocus
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              onRenameThread?.(optionThreadId, editingValue);
                              setEditingThreadId(null);
                            } else if (e.key === "Escape") {
                              setEditingThreadId(null);
                            }
                          }}
                          onBlur={() => {
                            if (editingValue.trim() && editingValue.trim() !== optionName) {
                              onRenameThread?.(optionThreadId, editingValue);
                            }
                            setEditingThreadId(null);
                          }}
                          className="text-sm font-semibold bg-transparent border-b border-secondary outline-none min-w-0 flex-1"
                        />
                      ) : (
                        <strong className="text-sm text-text-primary truncate">{optionName}</strong>
                      )}
                      {option?.destination && (
                        <span className="text-xs text-text-muted truncate">{option.destination}</span>
                      )}
                      {option?.statusLabel && (
                        <small className="text-[11px] text-text-soft">{option.statusLabel}</small>
                      )}
                    </span>
                    {isSelected && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className="text-secondary flex-shrink-0">
                        <path d="m20 6-11 11-5-5" />
                      </svg>
                    )}
                  </button>
                  {optionThreadId && onRenameThread && editingThreadId !== optionThreadId && (
                    <button
                      type="button"
                      className="flex-shrink-0 w-9 flex items-center justify-center text-text-soft hover:text-secondary transition-colors cursor-pointer"
                      aria-label={`Rename ${optionName}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingThreadId(optionThreadId);
                        setEditingValue(optionName);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                    </button>
                  )}
                  {canDeleteThread && (
                    <button
                      type="button"
                      className="flex-shrink-0 w-9 flex items-center justify-center text-text-soft hover:text-status-danger transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                      aria-label={`Delete ${optionName} thread`}
                      disabled={isDeletingThread}
                      onClick={() => onPlanningOptionDelete?.(option)}
                    >
                      {isDeletingThread ? (
                        <span aria-hidden="true" className="text-xs">...</span>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v5" />
                          <path d="M14 11v5" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="px-4 py-6 text-center" role="status" aria-live="polite">
              <strong className="block text-sm text-text-primary">{clientMenuEmptyTitle}</strong>
              <p className="mt-1 text-xs text-text-muted">{clientMenuEmptyBody}</p>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
