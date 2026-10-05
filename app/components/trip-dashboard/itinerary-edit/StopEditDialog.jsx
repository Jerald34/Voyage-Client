"use client";
// The form behind "Edit details" and "Add stop". The place a stop points to isn't
// editable here: swapping places stays with the agent, which checks the new place.
import { useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Modal from "../../ui/Modal.jsx";
import {
  STOP_TYPE_OPTIONS,
  emptyStopForm,
  stopFormFromItem,
  validateStopForm,
} from "../../../lib/trip-dashboard/itineraryEditing.js";

// 16px text on phones stops iOS zooming into the field.
const INPUT =
  "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-base text-text-primary placeholder:text-text-soft focus:border-secondary focus:outline-none aria-invalid:border-status-danger/60 sm:text-sm";
const CANCEL =
  "rounded-lg border border-border/20 px-4 py-2 text-sm font-semibold text-text-muted hover:bg-border/10 disabled:opacity-60";
const SAVE =
  "rounded-lg bg-secondary-strong px-4 py-2 text-sm font-semibold text-on-secondary-strong hover:opacity-90 disabled:cursor-wait disabled:opacity-60";
// The order the fields appear in, so a failed check goes to the first one with a problem.
const FIELD_ORDER = ["title", "startTime", "endTime", "description", "clientNotes", "staffNotes"];

function Field({ id, label, hint, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.8rem] font-semibold text-text-primary">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="m-0 text-[0.8rem] text-status-danger">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="m-0 text-[0.75rem] text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export default function StopEditDialog({ open, mode = "edit", item = null, dayLabel = "", onSubmit, onClose }) {
  const baseId = useId();
  const titleRef = useRef(null);
  const [form, setForm] = useState(() => (item ? stopFormFromItem(item) : emptyStopForm()));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // A fresh form each time the dialog opens, filled from the stop it opened on.
  useEffect(() => {
    if (!open) return;
    setForm(item ? stopFormFromItem(item) : emptyStopForm());
    setErrors({});
    setSaving(false);
    setSubmitError("");
  }, [open, item]);

  const fieldId = (name) => `${baseId}-${name}`;
  const setField = (name) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };

  const textField = (name, label, { hint, multiline = false, placeholder, inputRef } = {}) => {
    const id = fieldId(name);
    const Tag = multiline ? "textarea" : "input";
    const describedBy = errors[name] ? `${id}-error` : hint ? `${id}-hint` : undefined;
    return (
      <Field id={id} label={label} hint={hint} error={errors[name]}>
        <Tag
          ref={inputRef}
          id={id}
          className={INPUT}
          value={form[name]}
          onChange={setField(name)}
          placeholder={placeholder}
          aria-invalid={errors[name] ? "true" : undefined}
          aria-describedby={describedBy}
          {...(multiline ? { rows: 3 } : { type: "text" })}
        />
      </Field>
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validateStopForm(form);
    // Render the messages first, so the field is read with its message, then go there.
    flushSync(() => setErrors(found));
    const firstProblem = FIELD_ORDER.find((name) => found[name]);
    if (firstProblem) {
      document.getElementById(fieldId(firstProblem))?.focus();
      return;
    }
    setSaving(true);
    setSubmitError("");
    const result = await onSubmit(form);
    if (!result?.ok) {
      setSaving(false);
      setSubmitError(result?.message || "Couldn't save your change. Try again.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="side"
      title={mode === "add" ? `Add a stop to ${dayLabel}` : "Edit stop"}
      initialFocusRef={titleRef}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {textField("title", "Title", { inputRef: titleRef })}
        <Field id={fieldId("type")} label="Type">
          <select id={fieldId("type")} className={INPUT} value={form.type} onChange={setField("type")}>
            {STOP_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          {textField("startTime", "Start time", { placeholder: "9:00 AM" })}
          {textField("endTime", "End time", { placeholder: "11:00 AM" })}
        </div>
        {textField("description", "Description", { multiline: true })}
        {textField("clientNotes", "Notes for the client", { multiline: true, hint: "Shown on the shared itinerary." })}
        {textField("staffNotes", "Staff notes", { multiline: true, hint: "Only your agency sees these." })}
        {submitError ? (
          <p role="alert" className="m-0 rounded-lg bg-status-danger/10 px-3 py-2 text-sm text-status-danger">
            {submitError}
          </p>
        ) : null}
        <div className="flex justify-end gap-2.5 border-t border-border/10 pt-4">
          <button type="button" className={CANCEL} onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className={SAVE} disabled={saving}>
            {saving ? "Saving…" : mode === "add" ? "Add stop" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
