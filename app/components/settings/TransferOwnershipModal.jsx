"use client";
import { useState } from "react";
import Modal from "@/app/components/ui/Modal";
import { transferOwnership } from "@/app/lib/api/index.js";

export default function TransferOwnershipModal({ agencyId, members, onClose }) {
  const admins = (members || []).filter((m) => m.role === "ADMIN");
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!selectedId) return;
    setError(null);
    setSaving(true);
    try {
      await transferOwnership(agencyId, selectedId);
      // Viewer is no longer OWNER — refresh the full page so the layout updates
      window.location.reload();
    } catch (err) {
      setError(err?.message || "Failed to transfer ownership.");
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Transfer ownership" size="sm">
      {admins.length === 0 ? (
        <p className="text-sm text-text-muted">
          There are no admins to transfer ownership to. Promote a member to Admin first.
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-text-muted">
            Select the admin who will become the new owner. You will become an Admin after transfer.
          </p>
          <div className="grid gap-2">
            {admins.map((m) => (
              <label key={m.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/15 px-3 py-2.5 hover:bg-border/10">
                <input
                  type="radio"
                  name="transfer-target"
                  value={m.id}
                  checked={selectedId === m.id}
                  onChange={() => setSelectedId(m.id)}
                  className="accent-secondary"
                />
                <div>
                  <div className="text-sm text-text-primary">{m.user.displayName}</div>
                  <div className="text-xs text-text-muted">{m.user.email}</div>
                </div>
              </label>
            ))}
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-status-danger/10 px-3 py-2 text-sm text-status-danger" role="alert">
              {error}
            </p>
          )}
        </>
      )}

      <footer className="mt-4 flex justify-end gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border/20 px-4 py-2 text-sm text-text-muted hover:bg-border/10"
          disabled={saving}
        >
          Cancel
        </button>
        {admins.length > 0 && (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving || !selectedId}
            className="rounded-lg border border-border/25 px-4 py-2 text-sm text-text-primary hover:bg-border/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Transferring…" : "Transfer ownership"}
          </button>
        )}
      </footer>
    </Modal>
  );
}
