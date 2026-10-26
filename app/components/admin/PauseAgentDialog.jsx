"use client";

import { useEffect, useId, useRef, useState } from "react";
import { adminPauseAgent } from "../../lib/api/index.js";
import { Button, Modal } from "../ui/index.js";
import { displayName } from "./accountLabels.js";
import { fmtInt, fmtUsd } from "./usage/usageFormat.js";

const DURATIONS = [
  { value: "1h", label: "1 hour" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "indefinite", label: "Until I lift it" },
];

const REASON_MAX = 300;

// Plain words for the errors an admin can actually hit; anything else shows the server's own message.
const ERROR_COPY = {
  ACCOUNT_DELETED: "This account has been deleted, so its agent can't be paused.",
  CANNOT_ACT_ON_SELF: "You can't pause the agent on your own account.",
  CANNOT_ACT_ON_SUPER_ADMIN: "Super admin accounts can't be paused here.",
  VALIDATION_ERROR: "That reason isn't valid. Add a short reason (300 characters at most) and try again.",
};

// The account no longer matches what is on screen, so the panel behind should load it again.
const STALE_CODES = new Set(["ACCOUNT_DELETED"]);

const LABEL = "text-xs font-semibold uppercase tracking-wider text-text-muted";
const FIELD =
  "w-full resize-y rounded-sm border border-border/20 bg-background p-3 font-sans text-sm text-text-primary placeholder:text-text-soft focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20";

/**
 * Pause one person's agent access for a while (or until lifted), with a required reason.
 * Resuming is a plain confirm, so it lives in AccountActionDialog ("resume-agent").
 *
 * `spend` ({ label, costUsd, runCount }) is the spend line the caller wants shown, for a caller that knows
 * which period its figures cover (the Usage tab). Without it, the account's `usageThisMonth` is shown as "This month".
 */
export default function PauseAgentDialog({ open, account, spend: spendProp = null, onClose, onDone, onStale }) {
  const [duration, setDuration] = useState("24h");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const reasonRef = useRef(null);
  const ids = { reason: useId(), hint: useId(), count: useId() };

  // A fresh form whenever the dialog opens or closes. The parent hides the dialog after a success
  // and this component stays mounted, so without this a re-open would still say "Pausing…".
  useEffect(() => {
    setDuration("24h");
    setReason("");
    setError(null);
    setBusy(false);
  }, [open]);

  // While a request is in flight, Escape / backdrop / Close do nothing.
  const guardedClose = () => {
    if (!busy) onClose?.();
  };

  if (!account) return null;

  const spend = spendProp ?? (account.usageThisMonth ? { label: "This month", ...account.usageThisMonth } : null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await adminPauseAgent(account.id, { duration, reason });
      onDone?.(data?.user ?? null);
    } catch (e) {
      setError(ERROR_COPY[e?.code] || e?.message || "Couldn't pause the agent. Try again.");
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
      title={`Pause the agent for ${displayName(account)}?`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit} disabled={busy || !reason.trim()}>
            {busy ? "Pausing…" : "Pause agent"}
          </Button>
        </>
      }
    >
      <div className="mb-4 space-y-1 text-sm text-text-muted">
        <p className="leading-relaxed">They can still sign in and edit trips by hand.</p>
        {spend && (
          <p className="tabular-nums">
            {spend.label}: {fmtUsd(spend.costUsd)} · {fmtInt(spend.runCount)} {spend.runCount === 1 ? "run" : "runs"}
          </p>
        )}
      </div>

      <fieldset className={`mb-4 min-w-0 ${busy ? "opacity-60" : ""}`} disabled={busy}>
        <legend className={`mb-2 ${LABEL}`}>Duration</legend>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <label
              key={d.value}
              className={`cursor-pointer rounded-pill border px-3 py-1.5 text-sm transition-[color,background-color,border-color] duration-150 ease-out has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-secondary/50 ${
                duration === d.value
                  ? "border-status-warning/40 bg-status-warning/10 font-semibold text-text-primary"
                  : "border-border/30 text-text-muted [@media(hover:hover)_and_(pointer:fine)]:hover:bg-surface"
              }`}
            >
              <input
                type="radio"
                name="pause-duration"
                value={d.value}
                checked={duration === d.value}
                onChange={() => setDuration(d.value)}
                className="sr-only"
              />
              {d.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label htmlFor={ids.reason} className={`mb-1 block ${LABEL}`}>
        Reason <span className="font-normal normal-case tracking-normal text-text-soft">(required)</span>
      </label>
      <p id={ids.hint} className="mb-1.5 text-xs text-text-muted">
        Shown to the user and their agency's owners and admins.
      </p>
      <textarea
        id={ids.reason}
        ref={reasonRef}
        rows={3}
        required
        maxLength={REASON_MAX}
        className={FIELD}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        readOnly={busy}
        aria-describedby={`${ids.hint} ${ids.count}`}
      />
      <p id={ids.count} className="mt-1 text-right text-xs tabular-nums text-text-soft">
        {reason.length} / {REASON_MAX}
      </p>

      {error && (
        <p role="alert" className="mt-3 rounded-sm bg-status-danger/8 p-3 text-sm text-status-danger">
          {error}
        </p>
      )}
    </Modal>
  );
}
