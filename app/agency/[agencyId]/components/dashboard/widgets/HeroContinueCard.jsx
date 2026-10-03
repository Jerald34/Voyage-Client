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

  // CSS color mappings for each tone — use system tokens so colors track theme
  const toneColorMap = {
    warning: 'var(--warning)',
    accent: 'var(--accent)',
    success: 'var(--success)',
    muted: 'rgb(var(--color-text-soft-rgb))',
  };

  const bgColorMap = {
    warning: 'color-mix(in srgb, var(--warning) 12%, transparent)',
    accent:  'color-mix(in srgb, var(--accent) 12%, transparent)',
    success: 'color-mix(in srgb, var(--success) 12%, transparent)',
    muted:   'rgb(var(--color-border-rgb) / 0.08)',
  };

  const color = toneColorMap[tone];
  const bgColor = bgColorMap[tone];

  const borderColor = toneColorMap[tone]
    ? `color-mix(in srgb, ${toneColorMap[tone]} 20%, transparent)`
    : 'rgb(var(--color-border-rgb) / 0.2)';

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.7rem] font-extrabold uppercase tracking-[0.05em]"
      style={{
        backgroundColor: bgColor,
        color: color,
        border: `1px solid ${borderColor}`,
      }}
    >
      {label}
    </span>
  );
}

export default function HeroContinueCard({ trip, onContinue }) {
  if (!trip) {
    return <EmptyState variant="staff-hero" />;
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
