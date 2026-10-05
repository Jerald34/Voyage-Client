"use client";

import { ACCOUNT_TYPE_LABELS } from "./accountLabels.js";

// Same footprint as AgencyStatusPill, with a hairline border so the pills carry
// their shape in both themes. Tones use existing tokens only:
//  - Personal         secondary family (the strong terracotta reads on tint in light and dark)
//  - Agency           primary family
//  - Setup incomplete neutral and dashed, so "unfinished" is not told by colour alone
const PILL = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill border px-2.5 py-0.5 text-xs font-semibold tracking-wide";

const TYPE_TONES = {
  PERSONAL: "border-secondary/25 bg-secondary/10 text-secondary-strong",
  AGENCY_USER: "border-primary/15 bg-primary/10 text-primary",
  PENDING: "border-dashed border-text-soft/50 text-text-muted",
};

const STATUS_TONES = {
  ACTIVE: { pill: "bg-status-success/10 text-status-success", dot: "bg-status-success", label: "Active" },
  DISABLED: { pill: "bg-status-danger/10 text-status-danger", dot: "bg-status-danger", label: "Disabled" },
};

export function AccountTypePill({ type }) {
  return (
    <span className={`${PILL} ${TYPE_TONES[type] || "border-transparent bg-surface text-text-muted"}`}>
      {ACCOUNT_TYPE_LABELS[type] || type}
    </span>
  );
}

export function AccountStatusPill({ status }) {
  const tone = STATUS_TONES[status];
  return (
    <span className={`${PILL} border-transparent ${tone?.pill || "bg-surface text-text-muted"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${tone?.dot || "bg-text-soft"}`} aria-hidden="true" />
      {tone?.label || status}
    </span>
  );
}

/** Small chip marking a platform administrator. Text carries the meaning; the teal tint is only a cue. */
export function SuperAdminChip() {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-pill border border-status-info/30 bg-status-info/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-status-info">
      Super admin
    </span>
  );
}
