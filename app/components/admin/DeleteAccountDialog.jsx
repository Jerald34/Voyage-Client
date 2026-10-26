"use client";

import { useEffect, useId, useRef, useState } from "react";
import { adminDeleteUser } from "../../lib/api/index.js";
import { Button, Modal } from "../ui/index.js";
import { MEMBERSHIP_ROLE_LABELS, displayName } from "./accountLabels.js";

const ERROR_COPY = {
  EMAIL_CONFIRMATION_MISMATCH: "That email doesn't match this account.",
  NEW_OWNER_REQUIRED: "Choose a new owner first.",
  INVALID_NEW_OWNER: "That person can't take over. Pick an active member of the agency.",
  OWNER_HAS_NO_SUCCESSOR: "This agency has no other members, so ownership can't move.",
  OWNERSHIP_CHANGED:
    "This agency's owner changed while you had this open. The account details have been refreshed, so check them and try again.",
  MULTIPLE_OWNED_AGENCIES: "This person owns more than one agency. Each one has to be handed over before the account can be deleted.",
  CANNOT_ACT_ON_SELF: "You can't delete your own account.",
  CANNOT_ACT_ON_SUPER_ADMIN: "Super admin accounts can't be deleted here.",
  ACCOUNT_DELETED: "This account is already deleted.",
  VALIDATION_ERROR: "Some of those details aren't valid. Check the email and the reason, then try again.",
};

// These mean the account changed since the panel loaded it, so the dialog is working from old
// facts (who owns what, who can take over). The parent loads the account again and the dialog redraws.
const STALE_CODES = new Set([
  "OWNERSHIP_CHANGED",
  "INVALID_NEW_OWNER",
  "OWNER_HAS_NO_SUCCESSOR",
  "MULTIPLE_OWNED_AGENCIES",
  "ACCOUNT_DELETED",
]);

const LABEL = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted";
const FIELD =
  "w-full rounded-sm border border-border/20 bg-background p-3 font-sans text-sm text-text-primary placeholder:text-text-soft focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20";

export default function DeleteAccountDialog({ open, account, onClose, onDeleted, onDisableInstead, onStale }) {
  const [confirmEmail, setConfirmEmail] = useState("");
  const [reason, setReason] = useState("");
  const [newOwnerUserId, setNewOwnerUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const ids = { confirm: useId(), reason: useId(), owner: useId() };
  const ownerRef = useRef(null);
  const confirmRef = useRef(null);

  // A fresh form whenever the dialog opens or closes. The parent hides the dialog after a success
  // and this component stays mounted, so without this a re-open would still say "Deleting…".
  useEffect(() => {
    setConfirmEmail("");
    setReason("");
    setNewOwnerUserId("");
    setError(null);
    setBusy(false);
  }, [open]);

  // While a request is in flight, Escape / backdrop / Close do nothing.
  const guardedClose = () => {
    if (!busy) onClose?.();
  };

  if (!account) return null;

  const name = displayName(account);
  const owned = account.ownedAgencies || [];
  const solo = owned.find((a) => a.successors.length === 0);
  const multiple = !solo && owned.length > 1;
  const handOver = !solo && owned.length === 1 ? owned[0] : null;
  // After the account is loaded again the chosen person may no longer be able to take over.
  const ownerChoice = handOver?.successors.some((s) => s.userId === newOwnerUserId) ? newOwnerUserId : "";
  const emailMatches = confirmEmail.trim().toLowerCase() === (account.email || "").toLowerCase();
  const canSubmit = emailMatches && (!handOver || ownerChoice) && !busy;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminDeleteUser(account.id, { confirmEmail, reason, newOwnerUserId: handOver ? ownerChoice : undefined });
      onDeleted?.();
    } catch (e) {
      setError(ERROR_COPY[e?.code] || e?.message || "Couldn't delete this account. Try again.");
      setBusy(false);
      if (STALE_CODES.has(e?.code)) onStale?.();
    }
  };

  const errorAlert = error && (
    <p role="alert" className="mt-4 rounded-sm bg-status-danger/8 p-3 text-sm text-status-danger">
      {error}
    </p>
  );

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
            {/* Not offered when the account is already disabled (the parent leaves onDisableInstead out). */}
            {onDisableInstead && (
              <Button variant="primary" onClick={onDisableInstead}>
                Disable instead
              </Button>
            )}
          </>
        }
      >
        <p className="text-sm leading-relaxed text-text-muted">
          {solo
            ? `${solo.agencyName} has no other members, so ownership can't move to anyone. ${name} must delete the agency from its Settings (Danger zone) first${
                onDisableInstead ? ", or you can disable this account now." : "."
              }`
            : `${name} owns ${owned.map((a) => a.agencyName).join(", ")}. Each of these agencies needs a new owner before this account can be deleted. ${name} can hand each one over from that agency's Settings (Danger zone, Transfer ownership)${
                onDisableInstead ? ", or you can disable this account now." : "."
              }`}
        </p>
        {errorAlert}
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
            value={ownerChoice}
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
          Reason (optional, kept in the audit trail)
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
          Type{" "}
          {/* Shown exactly as it must be typed: the label's uppercase and letter-spacing would misspell it. */}
          <span className="break-all font-mono normal-case tracking-normal text-text-primary">{account.email}</span> to confirm
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

      {errorAlert}
    </Modal>
  );
}
