"use client";

import { useId, useRef, useState } from "react";
import Modal from "../../../../components/ui/Modal.jsx";

const FIELD_CLASS =
  "w-full box-border px-3 py-2 border rounded-sm bg-background text-[14px] text-text-primary outline-none transition-all duration-150 focus:border-secondary focus:ring-[3px] focus:ring-secondary/15";

/**
 * The first time someone opens a share link: who shared it, and a name (email
 * optional) so comments can say who they are from. `onContinue(name, email)` saves
 * it; `onSkip` (also Escape, the close button and the backdrop) just shows the trip.
 */
export default function ShareWelcomeDialog({ open, senderName, onContinue, onSkip }) {
  const fieldId = useId();
  const nameRef = useRef(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nameError, setNameError] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(true);
      nameRef.current?.focus();
      return;
    }
    onContinue(trimmed, email.trim() || null);
  }

  return (
    <Modal open={open} onClose={onSkip} title="Welcome to your trip" size="sm" initialFocusRef={nameRef}>
      <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
        <p className="m-0 text-[14px] leading-[1.55] text-text-muted">
          {`${senderName} shared this itinerary with you. Add your name so they know who's commenting.`}
        </p>

        <div className="grid gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${fieldId}-name`} className="text-[12px] font-semibold text-text-muted">Your name</label>
            <input
              ref={nameRef}
              id={`${fieldId}-name`}
              type="text"
              autoComplete="name"
              className={`${FIELD_CLASS} ${nameError ? "border-status-danger ring-[3px] ring-status-danger/10" : "border-border/40"}`}
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(false); }}
              maxLength={80}
              aria-invalid={nameError || undefined}
              aria-describedby={nameError ? `${fieldId}-name-error` : undefined}
            />
            {nameError && (
              <span id={`${fieldId}-name-error`} className="text-[12px] text-status-danger font-medium">Please enter your name</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${fieldId}-email`} className="text-[12px] font-semibold text-text-muted">Email (optional)</label>
            <input
              id={`${fieldId}-email`}
              type="email"
              autoComplete="email"
              className={`${FIELD_CLASS} border-border/40`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <p className="m-0 text-[12px] leading-[1.5] text-text-soft">
          You&apos;ll only be asked once on this device.
        </p>

        <div className="grid gap-2">
          <button
            type="submit"
            className="min-h-10 px-4 py-2 bg-secondary-strong text-on-secondary-strong border-none rounded-sm text-[14px] font-semibold cursor-pointer transition-all duration-150 hover:opacity-90 active:scale-97"
          >
            Continue
          </button>
          <button
            type="button"
            className="min-h-10 px-4 py-2 border border-border/30 rounded-sm bg-transparent text-text-muted text-[14px] font-medium cursor-pointer transition-colors duration-150 hover:bg-primary/[0.06]"
            onClick={onSkip}
          >
            Just view the trip
          </button>
        </div>
      </form>
    </Modal>
  );
}
