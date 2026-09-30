/**
 * ActivityRibbon.jsx
 * Compact union activity feed — recent shares, status changes, approvals (§3.4)
 */

'use client';

import EmptyState from './EmptyState';

// Action labels and colors per kind
const KIND_CONFIG = {
  share_sent: {
    label: 'Share sent',
    color: 'var(--accent)',
  },
  trip_status_changed: {
    label: 'Status changed',
    color: 'var(--warning)',
  },
  itinerary_approved: {
    label: 'Itinerary approved',
    color: 'var(--success)',
  },
};

function RelativeDate(isoString) {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return isoString;
  }
}

export default function ActivityRibbon({ events = [] }) {
  const displayEvents = events.slice(0, 6);

  return (
    <section className="dashboard-card p-6">
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-[0.7rem] font-extrabold uppercase tracking-[0.05em] mb-2">ACTIVITY</span>
      <h2 className="mt-2 text-lg font-extrabold text-text-primary mb-4">
        Recent team activity
      </h2>

      {displayEvents.length === 0 ? (
        <EmptyState variant="activity" />
      ) : (
        <div className="space-y-2">
          {displayEvents.map((event, idx) => {
            const config = KIND_CONFIG[event.kind] || KIND_CONFIG.share_sent;

            return (
              <div
                key={`${event.kind}-${event.tripId}-${idx}`}
                className="flex items-start gap-3"
              >
                {/* Leading colored bar */}
                <div
                  className="w-1 h-6 rounded-full mt-0.5 flex-shrink-0"
                  style={{ backgroundColor: config.color }}
                  aria-hidden="true"
                />

                {/* Action + trip title */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">
                    {config.label} for{' '}
                    <span className="font-medium">{event.tripTitle}</span>
                  </p>
                </div>

                {/* Timestamp (right-aligned) */}
                <p className="text-xs text-text-muted flex-shrink-0 whitespace-nowrap">
                  {RelativeDate(event.occurredAt)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
