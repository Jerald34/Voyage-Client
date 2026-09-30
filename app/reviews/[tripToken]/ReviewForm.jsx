"use client";

/**
 * ReviewForm — post-trip traveler review form (flavor B).
 *
 * Props:
 *   tripToken    string
 *   initialRating  number | null   (pre-filled from ?rating= query param)
 */

import { useState, useEffect, useRef } from "react";
import { fetchApi } from "../../lib/api/client.js";
import StarRating from "../../components/common/StarRating.jsx";
import Spinner from "../../components/ui/Spinner.jsx";

/* ── helpers ─────────────────────────────────────────────── */

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/* ── Invalid link state ───────────────────────────────────── */
function InvalidLink() {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-background px-6">
      <div className="max-w-md w-full text-center px-8 py-10 bg-surface border border-border rounded-lg shadow-soft grid gap-4">
        <div className="flex items-center justify-center mx-auto w-14 h-14 rounded-full bg-status-danger/10 text-status-danger">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="font-serif text-2xl font-normal text-primary m-0">
          Invalid or expired link
        </h1>
        <p className="text-[15px] leading-[1.6] text-text-muted m-0">
          This review link is no longer valid. It may have already been used or
          may have expired.
        </p>
        <a
          href="/"
          className="mt-2 text-[14px] font-semibold text-secondary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 rounded-sm"
        >
          Go to homepage
        </a>
      </div>
      <footer className="mt-8">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-soft opacity-60">
          Powered by Voyage
        </span>
      </footer>
    </div>
  );
}

/* ── Thank-you state ─────────────────────────────────────── */
function ThankYou({ rating, submittedAt }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-background px-6">
      <div className="max-w-md w-full text-center px-8 py-10 bg-surface border border-border rounded-lg shadow-soft grid gap-4">
        <div className="flex items-center justify-center mx-auto w-14 h-14 rounded-full bg-[rgba(22,163,74,0.12)] text-[#16a34a]">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="font-serif text-2xl font-normal text-primary m-0">
          Thank you!
        </h1>
        {rating != null && (
          <div className="flex justify-center">
            <StarRating value={rating} disabled size="md" />
          </div>
        )}
        {submittedAt && (
          <p className="text-[15px] leading-[1.6] text-text-muted m-0">
            You reviewed this trip on{" "}
            <strong className="font-semibold text-text-primary">
              {formatDate(submittedAt)}
            </strong>
            . Thank you!
          </p>
        )}
        <a
          href="/"
          className="mt-2 text-[14px] font-semibold text-secondary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 rounded-sm"
        >
          Go to homepage
        </a>
      </div>
      <footer className="mt-8">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-soft opacity-60">
          Powered by Voyage
        </span>
      </footer>
    </div>
  );
}

/* ── Shared input / textarea class ───────────────────────── */
const inputCls =
  "w-full px-4 py-3 border border-border rounded-md bg-[rgba(255,255,255,0.88)] dark:bg-[rgba(26,29,33,0.88)] " +
  "text-[15px] leading-[1.4] font-medium text-text-primary " +
  "placeholder:text-text-soft placeholder:font-normal " +
  "transition-all duration-150 outline-none " +
  "focus:border-secondary focus:shadow-[0_0_0_3px_rgba(215,122,97,0.14)] " +
  "disabled:opacity-55 disabled:cursor-not-allowed";

const labelCls = "block text-[0.86rem] font-bold text-text-primary mb-[7px]";
const hintCls = "block text-[12px] text-text-soft mt-1";

/* ── Main form ───────────────────────────────────────────── */
export default function ReviewForm({ tripToken, initialRating }) {
  /* ── check state ── */
  const [checking, setChecking] = useState(true);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [priorReview, setPriorReview] = useState(null); // { rating, submittedAt }

  /* ── form fields ── */
  const [rating, setRating] = useState(initialRating ?? null);
  const [npsScore, setNpsScore] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [respondentName, setRespondentName] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
  const [consentToTestimonial, setConsentToTestimonial] = useState(false);

  /* ── submission state ── */
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedRating, setSubmittedRating] = useState(null);

  /* ── rating error ── */
  const [ratingError, setRatingError] = useState(false);
  const starSectionRef = useRef(null);

  /* ── check on mount ── */
  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const data = await fetchApi(`/reviews/${tripToken}/check`);
        if (cancelled) return;

        if (data.hasSubmitted) {
          setAlreadySubmitted(true);
          setPriorReview(data.prior ?? null);
        }
      } catch (err) {
        if (cancelled) return;
        if (err.status === 401 || err.code === "INVALID_REVIEW_TOKEN") {
          setLinkInvalid(true);
        }
        // Other errors: fall through and show form (network hiccup, etc.)
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [tripToken]);

  /* ── submit handler ── */
  async function handleSubmit(e) {
    e.preventDefault();

    if (!rating) {
      setRatingError(true);
      starSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      starSectionRef.current?.focus();
      return;
    }

    setRatingError(false);
    setSubmitError(null);
    setSubmitting(true);

    const body = {
      rating,
      consentToTestimonial,
    };

    const nps = parseInt(npsScore, 10);
    if (!isNaN(nps) && nps >= 0 && nps <= 10) body.npsScore = nps;
    if (reviewText.trim()) body.reviewText = reviewText.trim();
    if (respondentName.trim()) body.respondentName = respondentName.trim();
    if (respondentEmail.trim()) body.respondentEmail = respondentEmail.trim();

    try {
      await fetchApi(`/reviews/${tripToken}/submit`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      setSubmittedRating(rating);
      setSubmitted(true);
    } catch (err) {
      if (err.code === "REVIEW_ALREADY_SUBMITTED") {
        setSubmittedRating(rating);
        setSubmitted(true);
        return;
      }
      setSubmitError(
        err.message || "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* ── render states ── */
  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-background gap-4">
        <Spinner size="lg" />
        <p className="text-[14px] text-text-soft font-medium m-0">Loading…</p>
      </div>
    );
  }

  if (linkInvalid) return <InvalidLink />;

  if (alreadySubmitted || submitted) {
    return (
      <ThankYou
        rating={submitted ? submittedRating : priorReview?.rating}
        submittedAt={submitted ? new Date().toISOString() : priorReview?.submittedAt}
      />
    );
  }

  /* ── form ── */
  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* header bar */}
      <header className="flex items-center justify-center px-6 py-4 bg-sidebar text-white flex-shrink-0">
        <span className="font-serif text-[20px] tracking-[0.02em]">Voyage</span>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-md">
          {/* page heading */}
          <div className="mb-8 text-center">
            <h1 className="font-serif text-[2rem] font-normal text-primary m-0 mb-2">
              How was your trip?
            </h1>
            <p className="text-[15px] text-text-muted m-0">
              Share a quick review — takes about a minute.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="grid gap-6 bg-surface border border-border rounded-lg shadow-soft px-6 py-8 sm:px-8"
          >
            {/* ── 1. Star rating ── */}
            <div ref={starSectionRef} tabIndex={-1} className="outline-none">
              <span className={labelCls}>
                Overall rating{" "}
                <span className="text-status-danger" aria-hidden="true">*</span>
              </span>
              <StarRating
                value={rating}
                onChange={(n) => {
                  setRating(n);
                  setRatingError(false);
                }}
                size="lg"
              />
              {ratingError && (
                <p className="mt-2 text-[13px] font-medium text-status-danger" role="alert">
                  Please select a star rating before submitting.
                </p>
              )}
            </div>

            {/* ── 2. NPS score ── */}
            <div>
              <label htmlFor="nps-score" className={labelCls}>
                How likely are you to recommend us?{" "}
                <span className="font-normal text-text-soft">(0–10, optional)</span>
              </label>
              <input
                id="nps-score"
                type="number"
                min="0"
                max="10"
                step="1"
                value={npsScore}
                onChange={(e) => setNpsScore(e.target.value)}
                placeholder="0–10"
                className={inputCls + " max-w-[120px]"}
                disabled={submitting}
              />
              <span className={hintCls}>0 = not at all likely, 10 = extremely likely</span>
            </div>

            {/* ── 3. Review text ── */}
            <div>
              <label htmlFor="review-text" className={labelCls}>
                Tell us about your trip{" "}
                <span className="font-normal text-text-soft">(optional)</span>
              </label>
              <textarea
                id="review-text"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Tell us about your trip"
                maxLength={4000}
                rows={4}
                className={inputCls + " resize-y min-h-[100px]"}
                disabled={submitting}
              />
              <span className={hintCls} aria-live="polite">
                {reviewText.length}/4000 characters
              </span>
            </div>

            {/* ── 4. Respondent name ── */}
            <div>
              <label htmlFor="respondent-name" className={labelCls}>
                Your name{" "}
                <span className="font-normal text-text-soft">(optional)</span>
              </label>
              <input
                id="respondent-name"
                type="text"
                value={respondentName}
                onChange={(e) => setRespondentName(e.target.value)}
                placeholder="Jane Smith"
                maxLength={200}
                className={inputCls}
                disabled={submitting}
              />
            </div>

            {/* ── 5. Respondent email ── */}
            <div>
              <label htmlFor="respondent-email" className={labelCls}>
                Your email{" "}
                <span className="font-normal text-text-soft">(optional)</span>
              </label>
              <input
                id="respondent-email"
                type="email"
                value={respondentEmail}
                onChange={(e) => setRespondentEmail(e.target.value)}
                placeholder="jane@example.com"
                maxLength={320}
                className={inputCls}
                disabled={submitting}
              />
            </div>

            {/* ── 6. Consent to testimonial ── */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex-shrink-0 mt-[2px]">
                <input
                  type="checkbox"
                  checked={consentToTestimonial}
                  onChange={(e) => setConsentToTestimonial(e.target.checked)}
                  disabled={submitting}
                  className="sr-only peer"
                />
                <div
                  className={[
                    "w-5 h-5 rounded-[5px] border-2 transition-all duration-150",
                    "flex items-center justify-center",
                    "peer-focus-visible:ring-2 peer-focus-visible:ring-secondary/50",
                    consentToTestimonial
                      ? "bg-secondary border-secondary"
                      : "bg-transparent border-border group-hover:border-secondary/60",
                    submitting ? "opacity-55 cursor-not-allowed" : "",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {consentToTestimonial && (
                    <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="1.5 6 4.5 9 10.5 3" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-[14px] leading-[1.5] text-text-primary select-none">
                Voyage may use my review as a testimonial.
              </span>
            </label>

            {/* ── submit error ── */}
            {submitError && (
              <p
                role="alert"
                className="text-[13px] font-medium text-status-danger bg-status-danger/[0.07] border border-status-danger/20 rounded-md px-4 py-3 m-0"
              >
                {submitError}
              </p>
            )}

            {/* ── submit button ── */}
            <button
              type="submit"
              disabled={submitting}
              className={[
                "inline-flex items-center justify-center gap-2",
                "w-full min-h-[52px] px-6 py-3 rounded-pill",
                "text-[16px] font-extrabold text-white",
                "bg-secondary border-transparent",
                "shadow-[0_10px_24px_rgba(215,122,97,0.28)]",
                "transition-all duration-150",
                "hover:not-disabled:-translate-y-px hover:not-disabled:shadow-lg",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50",
                "disabled:opacity-55 disabled:cursor-not-allowed disabled:transform-none",
              ].join(" ")}
            >
              {submitting ? (
                <>
                  <Spinner size="sm" />
                  Submitting…
                </>
              ) : (
                "Submit Review"
              )}
            </button>
          </form>

          <footer className="mt-8 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-soft opacity-60">
              Powered by Voyage
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}
