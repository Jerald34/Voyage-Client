"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Modal } from "../../ui/index.js";
import { describePause } from "../../../lib/agentPause.js";

const NOTES = {
  still: "Still paused. Checked just now.",
  failed: "Couldn't check right now. Try again in a moment.",
};

/**
 * Tells a paused user, calmly, that the agent is off for them, until when, why, and what still works.
 * `onRecheck` (optional) asks the server again and resolves true if it answered; when the pause has been
 * lifted the parent drops `pause` and this closes by itself.
 */
export default function AgentPausedModal({ open, pause, onClose, onRecheck }) {
  // "Got it" takes focus so Enter dismisses; the header's close button stays reachable by Tab.
  const gotItRef = useRef(null);
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState(null); // "still" | "failed" | null

  // Every opening starts without the last answer.
  useEffect(() => {
    if (!open) {
      setChecking(false);
      setNote(null);
    }
  }, [open]);

  if (!pause) return null;

  const checkAgain = async () => {
    // aria-disabled, not disabled, so the button keeps keyboard focus while it waits.
    if (checking) return;
    setChecking(true);
    setNote(null);
    let answered = false;
    try {
      answered = await onRecheck();
    } catch {
      // Reads as "couldn't check", like an answer of false.
    }
    setChecking(false);
    setNote(answered ? "still" : "failed");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="The agent is paused for your account"
      initialFocusRef={gotItRef}
      footer={
        <>
          {onRecheck && (
            <Button variant="secondary" onClick={checkAgain} aria-disabled={checking} className="aria-disabled:cursor-wait aria-disabled:opacity-55">
              {checking ? "Checking…" : "Check again"}
            </Button>
          )}
          <Button ref={gotItRef} variant="primary" onClick={onClose}>
            Got it
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm leading-relaxed text-text-muted">{describePause(pause)}</p>
      {pause.reason && (
        <div className="mb-4 rounded-sm border border-border/15 bg-surface p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">Reason</p>
          <p className="whitespace-pre-wrap break-words text-sm text-text-primary">{pause.reason}</p>
        </div>
      )}
      <p className="text-sm leading-relaxed text-text-muted">You can still view and edit itineraries and trips by hand.</p>
      {/* Always in the page, so the answer is announced when it appears. */}
      <p role="status" className={note ? "mt-3 text-sm font-medium text-text-primary" : "sr-only"}>
        {note ? NOTES[note] : ""}
      </p>
    </Modal>
  );
}
