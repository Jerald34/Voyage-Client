"use client";

import { useEffect, useId, useRef, useState } from "react";

const ROLE_LABELS = { OWNER: "Owner", ADMIN: "Admin", STAFF: "Staff" };

/**
 * The avatar at the bottom of the rail and its account menu (WAI-ARIA menu
 * button). Click, Enter, Space or ArrowDown opens it with focus on the first
 * item; arrows, Home and End move between items; Escape closes it and returns
 * focus to the avatar; clicking outside or tabbing away closes it. Choosing an
 * item also returns focus to the avatar, so it is not lost when the menu
 * unmounts. The signed-in identity sits above the menu, not inside it, and
 * describes it.
 */
export default function AccountMenu({ initials, displayName, email, role, agencyName, onOpenSettings, onSignOut }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const identityId = useId();
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const menuRef = useRef(null);

  const menuItems = () => Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? []);

  useEffect(() => {
    if (!open) return undefined;
    menuItems()[0]?.focus();
    function handlePointerDown(event) {
      if (popoverRef.current?.contains(event.target) || buttonRef.current?.contains(event.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function handleMenuKeyDown(event) {
    const items = menuItems();
    const index = items.indexOf(document.activeElement);
    const moves = {
      ArrowDown: (index + 1) % items.length,
      ArrowUp: (index - 1 + items.length) % items.length,
      Home: 0,
      End: items.length - 1,
    };
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key in moves) {
      event.preventDefault();
      items[moves[event.key]]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  function choose(action) {
    setOpen(false);
    // The focused item is about to unmount; hand focus back before running the action.
    buttonRef.current?.focus();
    action?.();
  }

  const roleLine = [ROLE_LABELS[role], agencyName].filter(Boolean).join(" · ");
  const itemClass =
    "flex w-full items-center rounded-lg px-2 py-2 text-left text-[13px] text-text-primary hover:bg-text-primary/5 focus-visible:bg-text-primary/10 focus-visible:outline-none";

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-[12px] font-bold tracking-[0.04em] text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {initials}
      </button>
      {open ? (
        <div
          ref={popoverRef}
          className="frame-popover frame-pop-in absolute bottom-0 left-[calc(100%+12px)] z-50 w-60 origin-bottom-left rounded-2xl p-2"
        >
          <div id={identityId} className="mb-1 border-b border-[color:var(--frame-border)] px-2 pb-2 pt-1">
            <p className="truncate text-[13px] font-semibold text-text-primary">{displayName}</p>
            {email ? <p className="truncate text-[12px] text-text-muted">{email}</p> : null}
            {roleLine ? <p className="truncate text-[12px] text-text-muted">{roleLine}</p> : null}
          </div>
          <div ref={menuRef} id={menuId} role="menu" aria-label="Account" aria-describedby={identityId} onKeyDown={handleMenuKeyDown}>
            <button type="button" role="menuitem" tabIndex={-1} className={itemClass} onClick={() => choose(onOpenSettings)}>
              Account settings
            </button>
            <button type="button" role="menuitem" tabIndex={-1} className={itemClass} onClick={() => choose(onSignOut)}>
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
