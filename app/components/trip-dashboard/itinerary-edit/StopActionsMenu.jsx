"use client";
// The ⋯ menu on a stop card: Edit details, Move up, Move down, Move to another day,
// Delete stop. A menu button pattern: arrows move between items, Escape closes, and
// focus goes back to the button so the dialog an action opens can return it there.
import { useEffect, useId, useRef, useState } from "react";
import { MoreIcon } from "../../icons/index.js";

const TRIGGER =
  "inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-border/20 bg-surface-elevated text-text-soft transition-colors duration-150 hover:border-border/40 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary";
const ITEM =
  "flex w-full items-center rounded-md px-3 py-2 text-left text-[0.85rem] font-semibold transition-colors duration-150 hover:bg-surface focus:bg-surface focus:outline-none";

export default function StopActionsMenu({
  stopTitle,
  canMoveUp = false,
  canMoveDown = false,
  canMoveToDay = false,
  onEdit,
  onMoveUp,
  onMoveDown,
  onMoveToDay,
  onDelete,
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();

  const actions = [
    { key: "edit", label: "Edit details", run: onEdit },
    canMoveUp && { key: "up", label: "Move up", run: onMoveUp },
    canMoveDown && { key: "down", label: "Move down", run: onMoveDown },
    canMoveToDay && { key: "day", label: "Move to another day", run: onMoveToDay },
    { key: "delete", label: "Delete stop", run: onDelete, danger: true },
  ].filter(Boolean);

  useEffect(() => {
    if (!open) return undefined;
    menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    const closeOnOutsidePress = (event) => {
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsidePress);
    return () => document.removeEventListener("mousedown", closeOnOutsidePress);
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const handleMenuKeyDown = (event) => {
    const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? []);
    const index = items.indexOf(document.activeElement);
    const focusAt = (next) => items[(next + items.length) % items.length]?.focus();
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      focusAt(index + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusAt(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusAt(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusAt(items.length - 1);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className={TRIGGER}
        aria-label={`Actions for ${stopTitle}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreIcon width={16} height={16} aria-hidden="true" />
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={`Actions for ${stopTitle}`}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-border/20 bg-surface-elevated p-1 shadow-strong"
        >
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={`${ITEM} ${action.danger ? "text-status-danger" : "text-text-primary"}`}
              onClick={() => {
                close();
                action.run?.();
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
