/**
 * HeroContinueCard.jsx
 * Staff dashboard hero card — most recently touched trip with Continue CTA (§4.1)
 */

'use client';

import EmptyState from './EmptyState';

// Status tone mapping for chip color
const STATUS_TONES = {
  DRAFT: 'warning',
  IN_REVIEW: 'accent',
  APPROVED_INTERNAL: 'success',
  ARCHIVED: 'muted',
};

const STATUS_LABELS = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In review',
  APPROVED_INTERNAL: 'Approved',
  ARCHIVED: 'Archived',
};

function StatusChip({ status }) {
  const tone = STATUS_TONES[status] || 'muted';
  const label = STATUS_LABELS[status] || status;

  // Each tone's own colour, used for its tint and border. System tokens, so
  // they track the theme.
  const toneColorMap = {
    warning: 'var(--warning)',
    accent: 'var(--accent)',
    success: 'var(--success)',
    muted: 'rgb(var(--color-text-muted-rgb))',
  };

  // Text on the 12% tint must reach 4.5:1 at 12px. Coloured text (amber,
  // terracotta, green) only gets ~4.2-4.6:1 there, so labels read in the body
  // colour; the tint, border and leading dot carry the status. Muted already
  // clears 4.5:1 for archived.
  const textColorMap = {
    warning: 'rgb(var(--color-text-rgb))',
    accent: 'rgb(var(--color-text-rgb))',
    success: 'rgb(var(--color-text-rgb))',
    muted: 'rgb(var(--color-text-muted-rgb))',
  };

  const bgColorMap = {
    warning: 'color-mix(in srgb, var(--warning) 12%, transparent)',
    accent:  'color-mix(in srgb, var(--accent) 12%, transparent)',
    success: 'color-mix(in srgb, var(--success) 12%, transparent)',
    muted:   'rgb(var(--color-border-rgb) / 0.08)',
  };

  const color = textColorMap[tone];
  const bgColor = bgColorMap[tone];

  const borderColor = toneColorMap[tone]
    ? `color-mix(in srgb, ${toneColorMap[tone]} 20%, transparent)`
    : 'rgb(var(--color-border-rgb) / 0.2)';

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-extrabold uppercase tracking-[0.05em]"
      style={{
        backgroundColor: bgColor,
        color: color,
        border: `1px solid ${borderColor}`,
      }}
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: toneColorMap[tone] }}
      />
      {label}
    </span>
  );
}

export default function HeroContinueCard({ trip, onContinue }) {
  if (!trip) {
    return <EmptyState variant="staff-hero" compact />;
  }

  return (
    <div className="frame-tile flex flex-col gap-3 rounded-[16px] p-4">
      {/* Top: status chip, title, client name */}
      <div>
        <div className="mb-3">
          <StatusChip status={trip.statusChip} />
        </div>
        <h3 className="mb-1 line-clamp-2 font-sans text-[15px] font-semibold tracking-normal text-text-primary">
          {trip.tripTitle}
        </h3>
        <p className="text-sm text-text-muted">
          {trip.clientName}
        </p>
      </div>

      {/* Middle: last activity preview */}
      {trip.lastActivityPreview && (
        <p className="text-sm text-text-primary line-clamp-2">
          {trip.lastActivityPreview}
        </p>
      )}

      {/* Bottom: Continue CTA */}
      <button
        type="button"
        onClick={() => onContinue(trip.tripId)}
        className="h-11 w-full rounded-lg bg-secondary-strong text-sm font-semibold text-on-secondary-strong transition-[opacity,scale] duration-150 ease-out hover:opacity-90 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
      >
        Continue
      </button>
    </div>
  );
}
