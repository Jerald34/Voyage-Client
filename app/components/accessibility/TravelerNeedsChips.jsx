import AccessibilityIcon from "./AccessibilityIcon.jsx";
import { TRAVELER_NEED_OPTIONS, hasTravelerNeeds } from "../../lib/accessibility/travelerNeeds.js";

/** Selected needs shown above the composer, so staff always see what the agent will use. */
export default function TravelerNeedsChips({ travelerNeeds, onEdit, className = "" }) {
  if (!hasTravelerNeeds(travelerNeeds)) return null;
  const labels = travelerNeeds.needs
    .map((id) => TRAVELER_NEED_OPTIONS.find((option) => option.id === id)?.label)
    .filter(Boolean);

  return (
    <div role="group" aria-label="Traveler needs" className={`flex flex-wrap items-center gap-1.5 ${className}`.trim()}>
      <AccessibilityIcon size={14} className="text-secondary" />
      {labels.map((label) => (
        <span key={label} className="rounded-full border border-secondary/25 bg-secondary/10 px-2 py-0.5 text-[0.7rem] font-bold text-text-muted">
          {label}
        </span>
      ))}
      {travelerNeeds.notes ? (
        <span className="rounded-full border border-border/30 px-2 py-0.5 text-[0.7rem] font-semibold text-text-muted">Notes added</span>
      ) : null}
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit traveler needs"
          className="relative cursor-pointer border-0 bg-transparent px-1 text-[0.7rem] font-bold text-text-muted underline-offset-2 before:absolute before:-inset-x-2 before:-inset-y-3 before:content-[''] hover:underline"
        >
          Edit
        </button>
      ) : null}
    </div>
  );
}
