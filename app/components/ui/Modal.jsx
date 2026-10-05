// Reusable modal — variants: center (default) or side (right slide-over sheet).
"use client";

import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

const centerSizes = {
  sm: "w-[min(100%,400px)]",
  md: "w-[min(100%,520px)]",
  lg: "w-[min(100%,700px)]",
  xl: "w-[min(100%,920px)]",
};

function CloseButton({ onClick }) {
  return (
    <button
      type="button"
      className="shrink-0 w-[34px] h-[34px] grid place-items-center rounded-[10px] border border-border/20 bg-surface text-text-muted cursor-pointer hover:border-border-strong hover:bg-surface-elevated transition-colors duration-150"
      onClick={onClick}
      aria-label="Close"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

export default function Modal({
  open,
  onClose,
  title,
  size = "md",
  variant = "center",
  children,
  footer,
  // A form names the field to start on; otherwise focus goes to the first control.
  initialFocusRef = null,
}) {
  const panelRef = useRef(null);
  const previousFocus = useRef(null);

  const handleBackdropMouseDown = useCallback(
    (e) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  // Escape key + focus trap
  useEffect(() => {
    if (!open) return;

    previousFocus.current = document.activeElement;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Move focus into panel
    const panel = panelRef.current;
    if (panel) {
      const first =
        initialFocusRef?.current ??
        panel.querySelector('a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])');
      (first ?? panel).focus();
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus.current?.focus?.();
    };
  }, [open, onClose, initialFocusRef]);

  // Prevent body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  if (variant === "side") {
    return createPortal(
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onMouseDown={onClose}
          aria-hidden="true"
        />
        {/* Side panel */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          // Below sm the panel is a bottom sheet, so a form opens over the phone's map
          // instead of covering the whole screen; from sm up it slides in from the right.
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-[20px] border-t border-border/20 bg-surface-elevated shadow-strong focus:outline-none sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:max-h-none sm:w-[480px] sm:rounded-none sm:border-t-0 sm:border-l sm:[animation:slide-in-from-right_0.25s_ease_both]"
        >
          {/* Header */}
          {(title || onClose) && (
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-surface-elevated/80 backdrop-blur-md border-b border-border/10 shrink-0">
              {title && (
                <h2 className="font-serif text-xl text-text-primary truncate pr-4">{title}</h2>
              )}
              <CloseButton onClick={onClose} />
            </div>
          )}
          {/* Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-6">{children}</div>
          {/* Footer */}
          {footer && (
            <div className="shrink-0 flex justify-end gap-2.5 px-6 py-4 border-t border-border/10">
              {footer}
            </div>
          )}
        </div>
      </>,
      document.body
    );
  }

  // Center variant
  return createPortal(
    <div
      className="fixed inset-0 z-[80] grid place-items-center p-5 bg-[rgba(15,23,42,0.42)] backdrop-blur-[8px]"
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`${centerSizes[size] ?? centerSizes.md} max-h-[min(92vh,860px)] flex flex-col bg-white/[0.98] dark:bg-[rgba(17,20,22,0.98)] border border-border dark:border-[rgba(255,255,255,0.08)] rounded-[20px] shadow-[0_28px_60px_rgba(15,23,42,0.18)] overflow-hidden [animation:scale-in_0.2s_ease_both] focus:outline-none`}
      >
        {/* Header */}
        {(title || onClose) && (
          <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border/60 dark:border-[rgba(255,255,255,0.08)] shrink-0">
            {title && (
              <h2 className="m-0 font-serif text-xl leading-snug text-text-primary">{title}</h2>
            )}
            <CloseButton onClick={onClose} />
          </header>
        )}
        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5">{children}</div>
        {/* Footer */}
        {footer && (
          <footer className="shrink-0 flex justify-end gap-2.5 px-6 py-4 border-t border-border/60 dark:border-[rgba(255,255,255,0.08)]">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}
