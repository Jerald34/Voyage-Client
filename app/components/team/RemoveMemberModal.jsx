"use client";
import { useState } from "react";
import Modal from "@/app/components/ui/Modal";
import { removeMember } from "@/app/lib/api/index.js";

export default function RemoveMemberModal({ agencyId, member, onClose, onRemoved }) {
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleRemove = async () => {
    setError(null);
    setSaving(true);
    try {
      await removeMember(agencyId, member.id);
      await onRemoved?.();
    } catch (err) {
      setError(err?.message || "Failed to remove member.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Remove member" size="sm">
      <p className="text-sm text-text-muted">
        Remove <span className="font-medium text-text-primary">{member.user.displayName}</span>? They will
        lose access immediately.
      </p>

      {error && (
        <p className="mt-3 rounded-lg bg-status-danger/10 px-3 py-2 text-sm text-status-danger" role="alert">
          {error}
        </p>
      )}

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
          onClick={handleRemove}
          disabled={saving}
          className="rounded-lg border border-status-danger px-4 py-2 text-sm text-status-danger hover:bg-status-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Removing…" : "Remove"}
        </button>
      </footer>
    </Modal>
  );
}
