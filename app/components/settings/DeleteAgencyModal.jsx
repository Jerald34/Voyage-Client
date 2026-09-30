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
      <p className="mb-4 text-sm text-white/60">
        This deletes all trips, itineraries, and threads. Type the agency name to confirm.
      </p>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
        Agency name: <span className="font-mono text-white/80">{agencyName}</span>
      </p>
      <input
        className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-soft focus:border-rose-400/40 focus:outline-none"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder="Type agency name to confirm"
        autoComplete="off"
      />

      {error && (
        <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300" role="alert">
          {error}
        </p>
      )}

      <footer className="mt-4 flex justify-end gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/5"
          disabled={deleting}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting || !matches}
          className="rounded-lg border border-rose-400/30 px-4 py-2 text-sm text-rose-200/90 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {deleting ? "Deleting…" : "Delete agency"}
        </button>
      </footer>
    </Modal>
  );
}
