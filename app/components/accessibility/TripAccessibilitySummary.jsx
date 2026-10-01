import AccessibilityIcon from "./AccessibilityIcon.jsx";
import { formatAccessibilitySummary, summarizeAccessibility } from "../../lib/accessibility/placeAccessibility.js";

export default function TripAccessibilitySummary({ days, label = "Accessibility check", className = "" }) {
  const summary = summarizeAccessibility(days);
  // Say nothing until at least one stop was actually checked.
  if (summary.total === 0 || summary.checked === 0) return null;

  return (
    <p className={`m-0 flex items-start gap-2 text-[0.8rem] font-semibold text-text-muted ${className}`.trim()}>
      <AccessibilityIcon size={15} className="mt-0.5 flex-shrink-0 text-secondary" />
      <span>
        <span className="text-text-primary">{label}:</span> {formatAccessibilitySummary(summary)}
      </span>
    </p>
  );
}
