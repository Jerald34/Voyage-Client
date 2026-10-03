'use client';

import { useId, useState } from 'react';
import EmptyState from './EmptyState';

/** Reviews shown before "All reviews". */
const VISIBLE = 2;

function formatDate(isoString) {
  try {
    return new Date(isoString).toLocaleDateString();
  } catch {
    return isoString;
  }
}

function StarRating({ rating: raw }) {
  const rating = Math.min(5, Math.max(0, Math.round(Number(raw) || 0)));
  return (
    <span className="inline-block text-[13px]" style={{ color: 'var(--rating-star)' }}>
      <span aria-hidden="true">
        {'★'.repeat(rating)}
        {'☆'.repeat(5 - rating)}
      </span>
      <span className="sr-only">{rating} out of 5 stars</span>
    </span>
  );
}

/**
 * Latest traveler reviews for the Insights column: the two newest, with the
 * rest of the payload's reviews (up to five) one click away.
 */
export default function RatingsPanel({ reviews = [], onToggleTestimonial }) {
  const headingId = useId();
  const [expanded, setExpanded] = useState(false);
  const all = reviews.slice(0, 5);
  const shown = expanded ? all : all.slice(0, VISIBLE);
  const showToggle = onToggleTestimonial !== undefined;

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="font-sans text-[13px] font-semibold tracking-normal text-text-primary">
        Latest reviews
      </h3>

      {all.length === 0 ? (
        <div className="mt-1">
          <EmptyState variant="ratings" compact />
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          {shown.map((review) => (
            <div key={review.id} className="frame-tile rounded-[12px] p-3">
              <StarRating rating={review.rating} />
              {review.reviewText ? (
                <p className="mt-1 line-clamp-2 text-[13px] text-text-primary">{review.reviewText}</p>
              ) : null}
              <p className="mt-1 text-[12px] text-text-muted">
                {review.respondentName || 'Anonymous'} · {review.tripTitle} · {formatDate(review.submittedAt)}
              </p>
              {showToggle && review.consentToTestimonial ? (
                <button
                  type="button"
                  onClick={() => onToggleTestimonial(review.id)}
                  className="mt-1 rounded-md px-1 text-xs font-semibold text-secondary-strong hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
                >
                  Mark as testimonial
                </button>
              ) : null}
            </div>
          ))}
          {all.length > VISIBLE ? (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
              className="min-h-[44px] rounded-lg px-1 text-[13px] font-semibold text-secondary-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              {expanded ? 'Show fewer' : `All reviews (${all.length})`}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
