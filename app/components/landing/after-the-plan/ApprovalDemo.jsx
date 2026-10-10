"use client";

import { useState } from "react";
import StatusBadge from "../../ui/StatusBadge.jsx";
import { SAMPLE_TRIP } from "../sample/sampleTrip.js";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "../landingClasses.js";

const STAGES = [
  { label: "Draft", variant: "draft", note: "Editable by the assigned agent.", action: "Send for review" },
  { label: "Needs review", variant: "pending", note: "Waiting in the approval queue.", action: "Approve" },
  { label: "Approved", variant: "approved", note: "Locked. Approved itineraries can't be edited.", action: "Reopen for edits" },
];

/** The approval lifecycle with the app's status badges; local state only. */
export default function ApprovalDemo() {
  const [stage, setStage] = useState(0);
  const current = STAGES[stage];
  const isLocked = stage === STAGES.length - 1;

  return (
    <div className="grid gap-4 rounded-[18px] border border-border/15 bg-surface p-4">
      <ol aria-label="Approval steps" className="m-0 flex list-none flex-wrap items-center gap-x-3 gap-y-2 p-0">
        {STAGES.map((item, index) => (
          // Steps still to come sit at 70% (3.3:1 or better, the pale badges' worst case); the current one is underlined.
          <li
            key={item.label}
            aria-current={index === stage ? "step" : undefined}
            className={`border-b-2 pb-1 transition-opacity duration-150 motion-reduce:transition-none ${
              index === stage ? "border-secondary-strong" : "border-transparent"
            } ${index <= stage ? "" : "opacity-70"}`}
          >
            <StatusBadge variant={item.variant} size="md">
              {item.label}
            </StatusBadge>
          </li>
        ))}
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
          className={isLocked ? SECONDARY_BUTTON : PRIMARY_BUTTON}
          onClick={() => setStage((value) => (value + 1) % STAGES.length)}
        >
          {current.action}
        </button>
      </div>
    </div>
  );
}
