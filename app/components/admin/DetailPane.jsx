"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "../icons/index.js";

// Tailwind's `lg` breakpoint: where the pane stops being a drawer and becomes an in-flow column.
const DESKTOP_QUERY = "(min-width: 1024px)";

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mql = window.matchMedia(DESKTOP_QUERY);
    setDesktop(mql.matches);
    const onChange = (e) => setDesktop(e.matches);
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);
  return desktop;
}

/**
 * Responsive detail container.
 *  - lg+: static in-flow right column (~440px), always visible.
 *  - below lg: slide-in drawer from the right with backdrop + swipe-to-dismiss.
 * Children render in a single subtree (no duplicate render across breakpoints).
 *
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {string} title
 * @param {React.ReactNode} children
 * @param {string} [ariaLabel]
 */
export default function DetailPane({ open, onClose, title, children, ariaLabel }) {
  const paneRef = useRef(null);
  const lastFocused = useRef(null);
  const drag = useRef(null);
  // Only the slide-in drawer (below lg) is modal. At lg and up the pane is an ordinary column the
  // rest of the page stays usable beside, so it must not tell assistive tech the page is inert.
  const isDesktop = useIsDesktop();

  // Esc closes (drawer on mobile; clears selection on desktop). A dialog opened from inside the
  // pane (the account actions) handles Escape itself and marks it handled, so it must not also
  // close the pane behind it.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !e.defaultPrevented) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Move focus into the pane on open; restore it on close
  useEffect(() => {
    if (open) {
      lastFocused.current = document.activeElement;
      paneRef.current?.focus?.();
    } else if (lastFocused.current?.focus) {
      lastFocused.current.focus();
      lastFocused.current = null;
    }
  }, [open]);

  // Minimal swipe-to-dismiss — drawer mode (below lg) only
  const onPointerDown = (e) => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) return;
    drag.current = { x: e.clientX, t: Date.now() };
  };
  const onPointerMove = (e) => {
    if (!drag.current || !paneRef.current) return;
    const dx = Math.max(0, e.clientX - drag.current.x);
    paneRef.current.style.transform = `translateX(${dx}px)`;
  };
  const endDrag = (e) => {
    if (!drag.current || !paneRef.current) return;
    const dx = Math.max(0, e.clientX - drag.current.x);
    const dt = Date.now() - drag.current.t || 1;
    paneRef.current.style.transform = "";
    drag.current = null;
    if (dx > 80 || dx / dt > 0.4) onClose?.();
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        ref={paneRef}
        tabIndex={-1}
        role="dialog"
        aria-modal={open && !isDesktop ? "true" : undefined}
        aria-label={ariaLabel || title || "Details"}
        data-open={open ? "true" : "false"}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col overflow-hidden border-l border-border/15 bg-surface-elevated shadow-strong transition-transform duration-300 [transition-timing-function:var(--ease-drawer)] motion-reduce:transition-none ${
          open ? "translate-x-0" : "translate-x-full"
        } lg:static lg:z-auto lg:w-[440px] lg:max-w-none lg:translate-x-0 lg:rounded-md lg:border lg:shadow-soft`}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border/10 bg-surface-elevated px-5 py-4"
        >
          <h2 className="truncate font-serif text-lg text-text-primary">{title}</h2>
          {/* At every breakpoint: the lg+ column has no backdrop to click and a mouse user has no Escape key
              in hand. Not while closed, when the column is only showing an empty state. */}
          {open && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close details"
              className="rounded-full p-2 text-text-muted transition-colors hover:bg-surface hover:text-text-primary active:scale-[0.97]"
            >
              <CloseIcon width={20} height={20} />
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </aside>
    </>
  );
}
