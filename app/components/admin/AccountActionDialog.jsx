"use client";

import { useEffect, useRef, useState } from "react";
import { adminDisableUser, adminEnableUser, adminSignOutUser } from "../../lib/api/index.js";
import { Button, Modal } from "../ui/index.js";
import { displayName } from "./accountLabels.js";

/** One entry per reversible account action. Part 3 adds "resume-agent" here. */
export const ACCOUNT_ACTIONS = {
  disable: {
    title: (name) => `Disable ${name}?`,
    body: "They're signed out everywhere and can't sign in until you enable the account. Their trips and itineraries stay with the agency.",
    confirm: "Disable",
    tone: "danger",
    run: (id, reason) => adminDisableUser(id, reason),
  },
  enable: {
    title: (name) => `Enable ${name}?`,
    body: "They can sign in again straight away.",
    confirm: "Enable",
    tone: "primary",
    run: (id, reason) => adminEnableUser(id, reason),
  },
  "sign-out": {
    title: (name) => `Sign ${name} out everywhere?`,
    body: "Every device they're signed in on is signed out. They can sign back in.",
    confirm: "Sign out everywhere",
    tone: "primary",
    run: (id, reason) => adminSignOutUser(id, reason),
  },
};

// Plain words for the errors an admin can actually hit; anything else shows the server's own message.
const ERROR_COPY = {
  ACCOUNT_DELETED: "This account has been deleted, so it can't be changed.",
  CANNOT_ACT_ON_SELF: "You can't do this to your own account.",
  CANNOT_ACT_ON_SUPER_ADMIN: "Super admin accounts can't be changed here.",
  VALIDATION_ERROR: "That reason isn't valid. Shorten it and try again.",
};

// The account no longer matches what is on screen, so the panel behind should load it again.
const STALE_CODES = new Set(["ACCOUNT_DELETED"]);

const FIELD =
  "w-full resize-y rounded-sm border border-border/20 bg-background p-3 font-sans text-sm text-text-primary placeholder:text-text-soft focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20";

export default function AccountActionDialog({ open, action, account, onClose, onDone, onStale }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const reasonRef = useRef(null);
  const config = ACCOUNT_ACTIONS[action];

  // A fresh form whenever the dialog opens or closes. The parent hides the dialog after a success
  // and this component stays mounted, so without this a re-open would still say "Working…".
  useEffect(() => {
    setReason("");
    setError(null);
    setBusy(false);
  }, [open, action]);

  // While a request is in flight, Escape / backdrop / Close do nothing.
  const guardedClose = () => {
    if (!busy) onClose?.();
  };

  if (!config || !account) return null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await config.run(account.id, reason);
      onDone?.(data?.user ?? null);
    } catch (e) {
      setError(ERROR_COPY[e?.code] || e?.message || "That didn't work. Try again.");
      setBusy(false);
      if (STALE_CODES.has(e?.code)) onStale?.();
    }
  };

  return (
    <Modal
      open={open}
      onClose={guardedClose}
      size="sm"
      initialFocusRef={reasonRef}
      title={config.title(displayName(account))}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={config.tone === "danger" ? "danger" : "primary"} onClick={submit} disabled={busy}>
            {busy ? "Working…" : config.confirm}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm leading-relaxed text-text-muted">{config.body}</p>
      <label htmlFor="account-action-reason" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
        Reason (optional, kept in the audit trail)
      </label>
      <textarea
        id="account-action-reason"
        ref={reasonRef}
        rows={3}
        className={FIELD}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
        readOnly={busy}
      />
      {error && (
        <p role="alert" className="mt-3 rounded-sm bg-status-danger/8 p-3 text-sm text-status-danger">
          {error}
        </p>
      )}
    </Modal>
  );
}
