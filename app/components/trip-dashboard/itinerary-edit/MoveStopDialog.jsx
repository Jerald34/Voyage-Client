"use client";
// "Move to another day": pick a day; the stop goes to the end of it.
import { useEffect, useId, useState } from "react";
import Modal from "../../ui/Modal.jsx";

const CANCEL =
  "rounded-lg border border-border/20 px-4 py-2 text-sm font-semibold text-text-muted hover:bg-border/10 disabled:opacity-60";
const SUBMIT =
  "rounded-lg bg-secondary-strong px-4 py-2 text-sm font-semibold text-on-secondary-strong hover:opacity-90 disabled:cursor-wait disabled:opacity-60";

export default function MoveStopDialog({ open, stopTitle, days, onSubmit, onClose }) {
  const groupName = useId();
  const [toDayId, setToDayId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // `days` must be memoized by the caller, or this would reset the choice on every render.
  useEffect(() => {
    if (!open) return;
    setToDayId(days[0]?.id ?? "");
    setBusy(false);
    setError("");
  }, [open, days]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!toDayId) return;
    setBusy(true);
    setError("");
    const result = await onSubmit(toDayId);
    if (!result?.ok) {
      setBusy(false);
      setError(result?.message || "Couldn't move this stop. Try again.");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Move "${stopTitle}"`} size="sm">
      <form onSubmit={handleSubmit}>
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 text-[0.8rem] font-semibold text-text-primary">Move to</legend>
          {days.map((day) => (
            <label
              key={day.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border/20 px-3 py-2.5 text-sm text-text-primary has-[:checked]:border-secondary/60 has-[:checked]:bg-secondary/10"
            >
              <input type="radio" name={groupName} value={day.id} checked={toDayId === day.id} onChange={() => setToDayId(day.id)} />
              {day.label}
            </label>
          ))}
        </fieldset>
        <p className="mb-0 mt-3 text-[0.8rem] text-text-muted">The stop goes to the end of that day.</p>
        {error ? (
          <p role="alert" className="mb-0 mt-3 rounded-lg bg-status-danger/10 px-3 py-2 text-sm text-status-danger">{error}</p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2.5">
          <button type="button" className={CANCEL} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className={SUBMIT} disabled={busy || !toDayId}>{busy ? "Moving…" : "Move stop"}</button>
        </div>
      </form>
    </Modal>
  );
}
