"use client";
import { useEffect, useId, useState } from "react";
import Modal from "../../ui/Modal.jsx";

const INPUT =
  "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-base text-text-primary focus:border-secondary focus:outline-none aria-invalid:border-status-danger/60 sm:text-sm";
const CANCEL =
  "rounded-lg border border-border/20 px-4 py-2 text-sm font-semibold text-text-muted hover:bg-border/10 disabled:opacity-60";
const SAVE =
  "rounded-lg bg-secondary-strong px-4 py-2 text-sm font-semibold text-on-secondary-strong hover:opacity-90 disabled:cursor-wait disabled:opacity-60";

export default function RenameDayDialog({ open, day, onSubmit, onClose }) {
  const inputId = useId();
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(day?.title ?? "");
    setError("");
    setBusy(false);
  }, [open, day]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Add a title.");
      return;
    }
    if (trimmed.length > 200) {
      setError("Keep this under 200 characters.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await onSubmit(trimmed);
    if (!result?.ok) {
      setBusy(false);
      setError(result?.message || "Couldn't save your change. Try again.");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Rename day ${day?.dayNumber ?? ""}`} size="sm">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-[0.8rem] font-semibold text-text-primary">Day title</label>
        <input
          id={inputId}
          type="text"
          className={INPUT}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setError("");
          }}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        {error ? <p id={`${inputId}-error`} className="m-0 text-[0.8rem] text-status-danger">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2.5">
          <button type="button" className={CANCEL} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className={SAVE} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}
