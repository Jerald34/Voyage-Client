"use client";
// A yes/no question whose "yes" can fail: the error shows in place and the dialog
// stays open. Used for Delete stop and Reopen for edits.
import { useEffect, useState } from "react";
import Modal from "../../ui/Modal.jsx";

const CANCEL =
  "rounded-lg border border-border/20 px-4 py-2 text-sm font-semibold text-text-muted hover:bg-border/10 disabled:opacity-60";
const CONFIRM = {
  danger:
    "rounded-lg border border-status-danger/40 px-4 py-2 text-sm font-semibold text-status-danger hover:bg-status-danger/10 disabled:cursor-wait disabled:opacity-60",
  default:
    "rounded-lg bg-secondary-strong px-4 py-2 text-sm font-semibold text-on-secondary-strong hover:opacity-90 disabled:cursor-wait disabled:opacity-60",
};

export default function ConfirmActionDialog({ open, title, body, confirmLabel, busyLabel, tone = "default", onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setBusy(false);
    setError("");
  }, [open]);

  const handleConfirm = async () => {
    setBusy(true);
    setError("");
    const result = await onConfirm();
    if (!result?.ok) {
      setBusy(false);
      setError(result?.message || "Something went wrong. Try again.");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="m-0 text-sm leading-relaxed text-text-muted">{body}</p>
      {error ? (
        <p role="alert" className="mb-0 mt-3 rounded-lg bg-status-danger/10 px-3 py-2 text-sm text-status-danger">{error}</p>
      ) : null}
      <div className="mt-5 flex justify-end gap-2.5">
        <button type="button" className={CANCEL} onClick={onClose} disabled={busy}>Cancel</button>
        <button type="button" className={CONFIRM[tone] ?? CONFIRM.default} onClick={handleConfirm} disabled={busy}>
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
