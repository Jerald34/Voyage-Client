"use client";
// The buttons under a day's stops. Rename day appears only where the day's title has
// no pencil of its own (the phone list); the desktop day view puts it by the title.
import { PencilIcon, PlusIcon } from "../../icons/index.js";

const BUTTON =
  "inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-dashed border-border/40 px-3 text-[0.85rem] font-semibold text-text-muted transition-colors duration-150 hover:border-secondary/50 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary";

// `dayId` marks Add stop, so the editor can put focus there when the day's last stop leaves.
export default function DayEditActions({ dayNumber, dayId = undefined, onAddStop, onRenameDay = null }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={BUTTON} onClick={onAddStop} data-add-stop={dayId}>
        <PlusIcon width={14} height={14} aria-hidden="true" />
        Add stop
      </button>
      {onRenameDay ? (
        <button type="button" className={BUTTON} onClick={onRenameDay} aria-label={`Rename day ${dayNumber}`}>
          <PencilIcon width={14} height={14} aria-hidden="true" />
          Rename day
        </button>
      ) : null}
    </div>
  );
}
