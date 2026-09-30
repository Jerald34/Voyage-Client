/**
 * RatingsPanel.jsx
 * Recent traveler reviews tail widget — star ratings, review text, testimonial toggle (§3.4)
 */

'use client';

import EmptyState from './EmptyState';

function RelativeDate(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString();
  } catch {
    return isoString;
  }
}

function StarRating({ rating }) {
  return (
    <span
      className="inline-block"
      style={{ color: 'var(--rating-star)' }}
    >
      <span aria-hidden="true">
        {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
      </span>
      <span className="sr-only">{rating} out of 5 stars</span>
    </span>
  );
}

export default function RatingsPanel({ reviews = [], onToggleTestimonial }) {
  const displayReviews = reviews.slice(0, 5);
  const showToggle = onToggleTestimonial !== undefined;

  return (
    <section className="dashboard-card p-6">
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-[0.7rem] font-extrabold uppercase tracking-[0.05em] mb-2">REVIEWS</span>
      <h2 className="mt-2 text-lg font-extrabold text-text-primary mb-4">
        Recent traveler reviews
      </h2>

      {displayReviews.length === 0 ? (
        <EmptyState variant="ratings" />
      ) : (
        <div className="space-y-4">
          {displayReviews.map((review) => (
            <div
              key={review.id}
              className="border-b border-border pb-4 last:border-b-0"
            >
              {/* Star row */}
              <div className="mb-2">
                <StarRating rating={review.rating} />
              </div>

              {/* Metadata line */}
              <p className="text-xs text-text-muted mb-2">
                {review.tripTitle} · {review.respondentName || 'Anonymous'} ·{' '}
                {RelativeDate(review.submittedAt)}
              </p>

              {/* Review text */}
              {review.reviewText && (
                <p className="text-sm text-text-primary line-clamp-3 mb-2">
                  {review.reviewText}
                </p>
              )}

              {/* Testimonial toggle */}
              {showToggle && review.consentToTestimonial && (
                <button
                  type="button"
                  onClick={() => onToggleTestimonial(review.id)}
                  className="text-xs font-bold text-secondary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 rounded-md px-1"
                >
                  Mark as testimonial
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
