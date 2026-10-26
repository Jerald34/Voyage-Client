"use client";

import { useRef } from "react";
import { Button, Modal } from "../../ui/index.js";
import { describeUntil } from "../../../lib/agentPause.js";

/** Tells a paused user, calmly, that the agent is off for them, until when, why, and what still works. */
export default function AgentPausedModal({ open, pause, onClose }) {
  // "Got it" takes focus so Enter dismisses; the header's close button stays reachable by Tab.
  const gotItRef = useRef(null);
  if (!pause) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="The agent is paused for your account"
      initialFocusRef={gotItRef}
      footer={
        <Button ref={gotItRef} variant="primary" onClick={onClose}>
          Got it
        </Button>
      }
    >
      <p className="mb-4 text-sm leading-relaxed text-text-muted">An administrator has paused your access to the agent {describeUntil(pause)}.</p>
      {pause.reason && (
        <div className="mb-4 rounded-sm border border-border/15 bg-surface p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">Reason</p>
          <p className="whitespace-pre-wrap break-words text-sm text-text-primary">{pause.reason}</p>
        </div>
      )}
      <p className="text-sm leading-relaxed text-text-muted">You can still view and edit itineraries and trips by hand.</p>
    </Modal>
  );
}
