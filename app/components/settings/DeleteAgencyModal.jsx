"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/app/components/ui/Modal";
import { deleteAgency } from "@/app/lib/api/index.js";

export default function DeleteAgencyModal({ agencyId, agencyName, onClose }) {
  const [typed, setTyped] = useState("");
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const matches = typed === agencyName;

  const handleDelete = async () => {
    if (!matches) return;
    setError(null);
    setDeleting(true);
    try {
      await deleteAgency(agencyId, typed);
      // Clear cached user data and redirect home
      try { localStorage.removeItem("voyage-user"); } catch {}
      router.replace("/");
    } catch (err) {
      setError(err?.message || "Failed to delete agency.");
      setDeleting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Delete agency" size="sm">
      <p className="mb-4 text-sm text-text-muted">
        This deletes all trips, itineraries, and threads. Type the agency name to confirm.
      </p>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Agency name: <span className="font-mono text-text-primary">{agencyName}</span>
      </p>
      <input
        className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-soft focus:border-status-danger/50 focus:outline-none"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder="Type agency name to confirm"
        autoComplete="off"
      />

      {error && (
        <p className="mt-3 rounded-lg bg-status-danger/10 px-3 py-2 text-sm text-status-danger" role="alert">
          {error}
        </p>
      )}

      <footer className="mt-4 flex justify-end gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border/20 px-4 py-2 text-sm text-text-muted hover:bg-border/10"
          disabled={deleting}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting || !matches}
          className="rounded-lg border border-status-danger/40 px-4 py-2 text-sm text-status-danger hover:bg-status-danger/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {deleting ? "Deleting…" : "Delete agency"}
        </button>
      </footer>
    </Modal>
  );
}
