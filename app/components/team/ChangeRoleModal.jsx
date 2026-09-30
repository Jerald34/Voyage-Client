"use client";
import { useState } from "react";
import Modal from "@/app/components/ui/Modal";
import { changeMemberRole } from "@/app/lib/api/index.js";

export default function ChangeRoleModal({ agencyId, member, onClose, onSaved }) {
  const [role, setRole] = useState(member.role === "OWNER" ? "ADMIN" : member.role);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await changeMemberRole(agencyId, member.id, role);
      await onSaved?.();
    } catch (err) {
      setError(err?.message || "Failed to change role.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Change role — ${member.user.displayName}`} size="sm">
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <fieldset className="grid gap-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-text-muted">New role</legend>
          {["ADMIN", "STAFF"].map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2 text-sm text-text-primary">
              <input
                type="radio"
                name="change-role"
                value={r}
                checked={role === r}
                onChange={() => setRole(r)}
                className="accent-secondary"
              />
              {r}
            </label>
          ))}
        </fieldset>

        {error && (
          <p className="rounded-lg bg-status-danger/10 px-3 py-2 text-sm text-status-danger" role="alert">
            {error}
          </p>
        )}
      </form>

      <footer className="mt-4 flex justify-end gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface-elevated"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </footer>
    </Modal>
  );
}
