"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { adminDeleteUser } from "../../lib/api/index.js";
import { Button, Modal } from "../ui/index.js";
import { MEMBERSHIP_ROLE_LABELS, displayName } from "./accountLabels.js";

const ERROR_COPY = {
  EMAIL_CONFIRMATION_MISMATCH: "That email doesn't match this account.",
  NEW_OWNER_REQUIRED: "Choose a new owner first.",
  INVALID_NEW_OWNER: "That person can't take over. Pick an active member of the agency.",
  OWNER_HAS_NO_SUCCESSOR: "This agency has no other members, so ownership can't move.",
  OWNERSHIP_CHANGED: "This agency's owner changed while you had this open. Close it, reload the account and try again.",
  MULTIPLE_OWNED_AGENCIES: "This person owns more than one agency. Hand each one over before deleting.",
  CANNOT_ACT_ON_SELF: "You can't delete your own account.",
  CANNOT_ACT_ON_SUPER_ADMIN: "Super admin accounts can't be deleted here.",
  ACCOUNT_DELETED: "This account is already deleted.",
};

const LABEL = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted";
const FIELD =
  "w-full rounded-sm border border-border/20 bg-background p-3 font-sans text-sm text-text-primary placeholder:text-text-soft focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20";

export default function DeleteAccountDialog({ open, account, onClose, onDeleted, onDisableInstead }) {
  const [confirmEmail, setConfirmEmail] = useState("");
  const [reason, setReason] = useState("");
  const [newOwnerUserId, setNewOwnerUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const ids = { confirm: useId(), reason: useId(), owner: useId() };
  const ownerRef = useRef(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    if (open) {
      setConfirmEmail("");
      setReason("");
      setNewOwnerUserId("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  // Stable identity: Modal re-runs its focus handling whenever onClose changes.
  // While a request is in flight, Escape / backdrop / Close do nothing.
  const guardedClose = useCallback(() => {
    if (!busy) onClose?.();
  }, [busy, onClose]);

  if (!account) return null;

  const name = displayName(account);
  const owned = account.ownedAgencies || [];
  const solo = owned.find((a) => a.successors.length === 0);
  const multiple = !solo && owned.length > 1;
  const handOver = !solo && owned.length === 1 ? owned[0] : null;
  const emailMatches = confirmEmail.trim().toLowerCase() === (account.email || "").toLowerCase();
  const canSubmit = emailMatches && (!handOver || newOwnerUserId) && !busy;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminDeleteUser(account.id, { confirmEmail, reason, newOwnerUserId: handOver ? newOwnerUserId : undefined });
      onDeleted?.();
    } catch (e) {
      setError(ERROR_COPY[e?.code] || "Couldn't delete this account. Try again.");
      setBusy(false);
    }
  };

  if (solo || multiple) {
    return (
      <Modal
        open={open}
        onClose={guardedClose}
        size="sm"
        title={`${name} owns ${solo ? solo.agencyName : "more than one agency"}`}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button variant="primary" onClick={onDisableInstead}>
              Disable instead
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-text-muted">
          {solo
            ? `${solo.agencyName} has no other members, so ownership can't move to anyone. The owner must delete the agency in Settings first, or you can disable this account now.`
            : "Ownership has to be handed over in each agency before this account can be deleted. You can disable it now."}
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={guardedClose}
      size="md"
      initialFocusRef={handOver ? ownerRef : confirmRef}
      title={`Delete ${name}?`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit} disabled={!canSubmit}>
            {busy ? "Deleting…" : handOver ? "Transfer and delete" : "Delete account"}
          </Button>
        </>
      }
    >
      <p className="mb-5 text-sm leading-relaxed text-text-muted">
        Their name, email, password and Google sign-in are erased and they're signed out everywhere. Trips, itineraries and chats they made
        stay with the agency, shown as "Deleted user". This can't be undone.
      </p>

      {handOver && (
        <div className="mb-4">
          <label htmlFor={ids.owner} className={LABEL}>
            New owner of {handOver.agencyName}
          </label>
          <select
            id={ids.owner}
            ref={ownerRef}
            className={FIELD}
            value={newOwnerUserId}
            onChange={(e) => setNewOwnerUserId(e.target.value)}
            disabled={busy}
          >
            <option value="">Choose a member…</option>
            {handOver.successors.map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.displayName} — {MEMBERSHIP_ROLE_LABELS[s.role] || s.role}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-4">
        <label htmlFor={ids.reason} className={LABEL}>
          Reason (kept in the audit trail)
        </label>
        <textarea
          id={ids.reason}
          rows={2}
          className={`${FIELD} resize-y`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          readOnly={busy}
        />
      </div>

      <div>
        <label htmlFor={ids.confirm} className={LABEL}>
          Type {account.email} to confirm
        </label>
        <input
          id={ids.confirm}
          ref={confirmRef}
          type="text"
          autoComplete="off"
          spellCheck={false}
          className={FIELD}
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          readOnly={busy}
        />
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-sm bg-status-danger/8 p-3 text-sm text-status-danger">
          {error}
        </p>
      )}
    </Modal>
  );
}
