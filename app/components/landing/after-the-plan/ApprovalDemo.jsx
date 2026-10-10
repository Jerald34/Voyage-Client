"use client";

import { useState } from "react";
import StatusBadge from "../../ui/StatusBadge.jsx";
import { SAMPLE_TRIP } from "../sample/sampleTrip.js";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "../landingClasses.js";

const BADGES = [
  { label: "Draft", variant: "draft" },
  { label: "In review", variant: "pending" },
  { label: "Approved", variant: "approved" },
];

// Reopening an approved trip sends it back to In review (not Draft), where it needs approval again.
const STATES = [
  { badge: 0, note: "Editable while you plan.", action: "Save to Client", next: 1 },
  { badge: 1, note: "Waiting for approval.", action: "Approve", next: 2 },
  { badge: 2, note: "Locked. Approved itineraries can't be edited.", action: "Reopen for edits", next: 3 },
  { badge: 1, note: "Reopened: editable again, and it needs approval again.", action: "Approve", next: 2 },
];
const APPROVED = 2;

/** The approval lifecycle with the app's status badges; local state only. */
export default function ApprovalDemo() {
  const [step, setStep] = useState(0);
  const current = STATES[step];

  return (
    <div className="grid gap-4 rounded-[18px] border border-border/15 bg-surface p-4">
      <ol role="list" aria-label="Approval steps" className="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-2 p-0">
        {BADGES.map((item, index) => {
          const isCurrent = index === current.badge;
          const isUpcoming = index > current.badge;
          return (
            // The current step is underlined; steps still to come get a dashed outline. Never opacity:
            // the pale badges would drop under 4.5:1 text contrast.
            <li key={item.label} aria-current={isCurrent ? "step" : undefined} className={`border-b-2 pb-1 ${isCurrent ? "border-secondary-strong" : "border-transparent"}`}>
              <span className={`inline-flex rounded-[8px] ${isUpcoming ? "outline-1 outline-dashed outline-offset-2 outline-text-muted/70" : ""}`}>
                <StatusBadge variant={item.variant} size="md">
                  {item.label}
                </StatusBadge>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/15 p-3">
        <div>
          <p className="m-0 text-sm font-semibold text-text-primary">{SAMPLE_TRIP.itinerary.title}</p>
          <p className="m-0 text-sm text-text-muted" aria-live="polite">
            {current.note}
          </p>
        </div>
        <button
          type="button"
          className={current.badge === APPROVED ? SECONDARY_BUTTON : PRIMARY_BUTTON}
          onClick={() => setStep(current.next)}
        >
          {current.action}
        </button>
      </div>
    </div>
  );
}
