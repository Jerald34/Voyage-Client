import { useState } from "react";
import RolePill from "./RolePill";

export default function MemberRow({ member, viewerRole, onChangeRole, onRemove }) {
  const canManage = (viewerRole === "OWNER" || viewerRole === "ADMIN") && member.role !== "OWNER";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <div className="h-8 w-8 rounded-full bg-surface-elevated shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <div className="truncate text-sm text-text-primary">{member.user.displayName}</div>
          <div className="truncate text-xs text-text-muted">{member.user.email}</div>
        </div>
      </div>
      <RolePill role={member.role} />
      <div className="text-xs text-text-soft w-28 text-right shrink-0">
        {new Date(member.createdAt).toLocaleDateString()}
      </div>
      {canManage ? (
        <div className="relative shrink-0">
          <button
            type="button"
            className="rounded px-2 py-1 text-text-muted hover:bg-surface-elevated"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Member actions"
          >
            &hellip;
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-8 z-10 min-w-[140px] rounded-lg border border-border bg-surface-elevated py-1 shadow-lg"
              onBlur={() => setMenuOpen(false)}
            >
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-surface"
                onClick={() => { setMenuOpen(false); onChangeRole?.(member); }}
              >
                Change role
              </button>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-status-danger hover:bg-surface"
                onClick={() => { setMenuOpen(false); onRemove?.(member); }}
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
