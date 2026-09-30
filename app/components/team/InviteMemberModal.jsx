"use client";
import { useState } from "react";
import Modal from "@/app/components/ui/Modal";
import { inviteMember } from "@/app/lib/api/index.js";

export default function InviteMemberModal({ agencyId, onClose, onInvited }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("STAFF");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sentTo, setSentTo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await inviteMember(agencyId, { email: email.trim(), role });
      setSentTo(email.trim());
      await onInvited?.();
    } catch (err) {
      setError(err?.message || "Failed to invite member.");
    } finally {
      setSaving(false);
    }
  };

  if (sentTo) {
    return (
      <Modal open onClose={onClose} title="Invitation sent" size="sm">
        <p className="text-sm text-text-primary leading-6">
          We sent an invitation email to <strong>{sentTo}</strong>. They&apos;ll join the agency once they accept the link.
        </p>
        <footer className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
          >
            Done
          </button>
        </footer>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title="Invite member" size="sm">
      <p className="mb-3 text-xs text-text-muted leading-5">
        We&apos;ll email a Voyage invitation. They join once they accept the link.
      </p>
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@example.com"
            required
            className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-soft focus:border-secondary focus:outline-none"
          />
        </label>

        <fieldset className="grid gap-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-text-muted">Role</legend>
          {["ADMIN", "STAFF"].map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2 text-sm text-text-primary">
              <input
                type="radio"
                name="invite-role"
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
          disabled={saving || !email.trim()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Sending invite…" : "Send invitation"}
        </button>
      </footer>
    </Modal>
  );
}
