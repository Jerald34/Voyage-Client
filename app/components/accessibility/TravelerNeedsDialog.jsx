"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MAX_TRAVELER_NOTES, TRAVELER_NEED_OPTIONS, normalizeTravelerNeeds } from "../../lib/accessibility/travelerNeeds.js";

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export default function TravelerNeedsDialog({ open, initialNeeds = null, onCancel, onSave }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const firstOptionRef = useRef(null);
  const initialNeedsRef = useRef(initialNeeds);
  const [selected, setSelected] = useState([]);
  const [notes, setNotes] = useState("");

  initialNeedsRef.current = initialNeeds;

  // Seed the form and move focus in when the dialog opens; hand focus back to
  // the control that opened it when it closes. Keyed on `open` only, so a parent
  // re-render with a new `initialNeeds` object never wipes in-progress edits.
  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    const start = normalizeTravelerNeeds(initialNeedsRef.current) ?? { needs: [], notes: null };
    setSelected(start.needs);
    setNotes(start.notes ?? "");
    firstOptionRef.current?.focus();
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onCancel?.();
        return;
      }
      // Focus can land outside the dialog (e.g. after clicking the backdrop
      // edge); the first Tab pulls it back in instead of tabbing the page behind.
      if (event.key === "Tab" && dialogRef.current && !dialogRef.current.contains(document.activeElement)) {
        event.preventDefault();
        firstOptionRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const toggle = (id) =>
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave?.(normalizeTravelerNeeds({ needs: selected, notes }));
  };

  // Keep Tab inside the dialog: the page behind it is inert to the user.
  const trapFocus = (event) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll(FOCUSABLE) ?? []);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center p-5 bg-[rgba(15,23,42,0.42)] backdrop-blur-[8px] transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] starting:opacity-0"
      role="presentation"
      onMouseDown={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-[min(100%,520px)] max-h-[calc(100dvh-40px)] overflow-y-auto bg-white/[0.98] dark:bg-[#1e293b] border border-[#e5e7eb] dark:border-[#334155] rounded-[20px] shadow-[0_28px_60px_rgba(15,23,42,0.18)] transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] starting:opacity-0 starting:scale-[0.97] motion-reduce:starting:scale-100 focus:outline-none"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={trapFocus}
      >
        <header className="px-5 pt-[18px] pb-3.5 border-b border-[#eef2f7] dark:border-[#334155]">
          <p className="m-0 mb-1 text-[11px] font-extrabold tracking-[0.08em] uppercase text-[#b65d48] dark:text-[#e0906f]">Accessibility</p>
          <h2 id={titleId} className="m-0 text-lg leading-[1.3] text-[#111827] dark:text-[#f1f5f9]">Traveler needs</h2>
          <p className="m-0 mt-1 text-[13px] leading-[1.5] text-[#4b5563] dark:text-[#94a3b8]">
            The agent plans every stop around these. They are sent with your next message and kept with this plan,
            visible to your agency only.
          </p>
        </header>

        <form className="grid gap-4 px-5 pt-4 pb-5" onSubmit={handleSubmit}>
          <fieldset className="m-0 grid gap-2 border-0 p-0">
            <legend className="sr-only">Needs</legend>
            {TRAVELER_NEED_OPTIONS.map((option, index) => {
              const isChecked = selected.includes(option.id);
              return (
                <label
                  key={option.id}
                  className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-[12px] border px-3 py-2.5 transition-[border-color,background-color,box-shadow] duration-150 focus-within:shadow-[0_0_0_3px_rgba(182,93,72,0.25)] ${isChecked ? "border-[#b65d48] bg-[rgba(182,93,72,0.06)]" : "border-[#e5e7eb] dark:border-[#334155] [@media(hover:hover)_and_(pointer:fine)]:hover:border-[#d1d5db] dark:[@media(hover:hover)_and_(pointer:fine)]:hover:border-[#475569]"}`}
                >
                  <input
                    ref={index === 0 ? firstOptionRef : undefined}
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(option.id)}
                    className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#b65d48]"
                  />
                  <span className="grid gap-0.5">
                    <span className="text-sm font-bold text-[#111827] dark:text-[#f1f5f9]">{option.label}</span>
                    <span className="text-xs leading-[1.45] text-[#4b5563] dark:text-[#94a3b8]">{option.description}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <label className="grid gap-2">
            <span className="flex items-baseline justify-between gap-3 text-xs font-bold text-[#4b5563] dark:text-[#94a3b8]">
              <span>Notes for the agent (optional)</span>
              <span className="font-semibold tabular-nums" aria-hidden="true">{notes.length}/{MAX_TRAVELER_NOTES}</span>
            </span>
            <textarea
              value={notes}
              maxLength={MAX_TRAVELER_NOTES}
              rows={3}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="e.g. Uses a foldable wheelchair; can manage 2–3 steps with help."
              className="w-full resize-y rounded-sm border border-[#dbe2ea] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 py-[11px] text-base sm:text-sm text-[#111827] dark:text-[#f1f5f9] placeholder:text-[#6b7280] dark:placeholder:text-[#94a3b8] focus:outline-none focus:border-[#b65d48] focus:shadow-[0_0_0_4px_rgba(182,93,72,0.12)]"
            />
          </label>

          <footer className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-11 rounded-sm border border-[#e5e7eb] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#0f172a] px-4 py-[11px] text-sm font-bold text-[#374151] dark:text-[#94a3b8] cursor-pointer transition-transform duration-150 ease-out active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-11 rounded-sm border-none bg-[#b65d48] px-4 py-[11px] text-sm font-bold text-white shadow-[0_10px_18px_rgba(182,93,72,0.22)] cursor-pointer transition-transform duration-150 ease-out active:scale-[0.97]"
            >
              Save needs
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
