import { useEffect, useId, useRef, useState } from "react";
import RolePill from "./RolePill";

export default function MemberRow({ member, viewerRole, onChangeRole, onRemove }) {
  const canManage = (viewerRole === "OWNER" || viewerRole === "ADMIN") && member.role !== "OWNER";
  const [menuOpen, setMenuOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();
  const joined = new Date(member.createdAt).toLocaleDateString();

  // Menu button pattern: the first item takes focus, a press outside or Escape closes it.
  useEffect(() => {
    if (!menuOpen) return undefined;
    menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    const closeOnOutsidePress = (event) => {
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsidePress);
    return () => document.removeEventListener("mousedown", closeOnOutsidePress);
  }, [menuOpen]);

  const handleMenuKeyDown = (event) => {
    const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? []);
    const index = items.indexOf(document.activeElement);
    const focusAt = (next) => items[(next + items.length) % items.length]?.focus();
    if (event.key === "Escape") {
      event.preventDefault();
      setMenuOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      focusAt(index + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusAt(index - 1);
    } else if (event.key === "Tab") {
      setMenuOpen(false);
    }
  };

  const pick = (run) => {
    setMenuOpen(false);
    run?.(member);
  };

  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <div className="h-8 w-8 rounded-full bg-surface-elevated shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <div className="truncate text-sm text-text-primary">{member.user.displayName}</div>
          <div className="truncate text-xs text-text-muted">{member.user.email}</div>
          {/* Phones have no room for the date column, so it moves under the email. */}
          <div className="text-xs text-text-soft sm:hidden">Joined {joined}</div>
        </div>
      </div>
      <RolePill role={member.role} />
      <div className="hidden w-28 shrink-0 text-right text-xs text-text-soft sm:block">{joined}</div>
      {canManage ? (
        <div className="relative shrink-0">
          <button
            ref={buttonRef}
            type="button"
            className="rounded px-2 py-1 text-text-muted hover:bg-surface-elevated"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Member actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? menuId : undefined}
          >
            &hellip;
          </button>
          {menuOpen && (
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={`Actions for ${member.user.displayName}`}
              onKeyDown={handleMenuKeyDown}
              className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-lg border border-border bg-surface-elevated py-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-surface focus:bg-surface focus:outline-none"
                onClick={() => pick(onChangeRole)}
              >
                Change role
              </button>
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                className="w-full px-3 py-2 text-left text-sm text-status-danger hover:bg-surface focus:bg-surface focus:outline-none"
                onClick={() => pick(onRemove)}
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="w-8 shrink-0" />
      )}
    </div>
  );
}
