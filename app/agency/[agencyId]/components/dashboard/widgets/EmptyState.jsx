/**
 * EmptyState.jsx
 * Unified empty state component for dashboard widgets (§8.2)
 * Variants: worklist, kpi, funnel, ratings, staff-hero, activity
 */

'use client';

const EMPTY_STATE_CONTENT = {
  worklist: {
    heading: 'All caught up.',
    body: 'Nothing needs your attention right now.',
    cta: null,
  },
  kpi: {
    heading: '—',
    body: 'No closed trips in last 30d',
    cta: null,
  },
  funnel: {
    heading: 'Your funnel will appear here',
    body: 'It builds itself once you create your first trip.',
    cta: 'New trip',
  },
  ratings: {
    heading: 'Reviews appear after trips complete.',
    body: 'First post-trip emails fire 2 days after the trip ends.',
    cta: null,
  },
  'staff-hero': {
    heading: 'Ready when you are.',
    body: 'Pick up where you left off after you create your first trip.',
    cta: 'New trip',
  },
  activity: {
    heading: 'Activity will show up here as your team works.',
    body: '',
    cta: null,
  },
};

export default function EmptyState({ variant, onAction }) {
  const content = EMPTY_STATE_CONTENT[variant];

  if (!content) {
    console.warn(`EmptyState: unknown variant "${variant}"`);
    return null;
  }

  const showCta = content.cta && onAction;

  return (
    <div className="flex flex-col items-center justify-center px-6 py-8 text-center sm:py-12">
      <h3 className="text-sm font-extrabold text-text-primary mb-2">
        {content.heading}
      </h3>
      {content.body && (
        <p className="text-sm text-text-muted mb-4">
          {content.body}
        </p>
      )}
      {showCta && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 h-11 px-5 rounded-lg bg-secondary text-white text-sm font-bold shadow-soft hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
        >
          {content.cta}
        </button>
      )}
    </div>
  );
}
