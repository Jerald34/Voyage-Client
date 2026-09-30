"use client";

/**
 * StarRating — accessible 1–5 star picker.
 *
 * Props:
 *   value        number | null   — currently selected rating
 *   onChange     (n: number) => void
 *   disabled     boolean
 *   size         "sm" | "md" | "lg"   (default "md")
 *   id           string — forwarded to the hidden live region (optional)
 */

import { useState, useRef } from "react";

const sizeMap = {
  sm: "w-7 h-7 text-2xl",
  md: "w-9 h-9 text-3xl",
  lg: "w-11 h-11 text-4xl",
};

const labels = ["Terrible", "Poor", "Okay", "Good", "Excellent"];

export default function StarRating({
  value = null,
  onChange,
  disabled = false,
  size = "md",
  id,
}) {
  const [hovered, setHovered] = useState(null);
  const liveRef = useRef(null);
  const btnRefs = useRef([]);

  const display = hovered ?? value;
  const starCls = sizeMap[size] ?? sizeMap.md;

  function handleKeyDown(e, idx) {
    const stars = btnRefs.current;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(idx + 1, 4);
      stars[next]?.focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      const prev = Math.max(idx - 1, 0);
      stars[prev]?.focus();
    }
  }

  function handleClick(n) {
    if (disabled) return;
    onChange?.(n);
    if (liveRef.current) {
      liveRef.current.textContent = `${n} star${n !== 1 ? "s" : ""}: ${labels[n - 1]}`;
    }
  }

  return (
    <fieldset className="border-none p-0 m-0">
      <legend className="sr-only">Star rating</legend>

      {/* Live region for screen readers */}
      <span
        ref={liveRef}
        id={id}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      <div
        className="flex items-center gap-1"
        onMouseLeave={() => setHovered(null)}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = display !== null && n <= display;
          return (
            <button
              key={n}
              ref={(el) => (btnRefs.current[n - 1] = el)}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} star${n !== 1 ? "s" : ""}: ${labels[n - 1]}`}
              disabled={disabled}
              tabIndex={
                // Roving tabIndex: only the selected star (or first if none) is reachable via Tab
                value ? (value === n ? 0 : -1) : n === 1 ? 0 : -1
              }
              className={[
                starCls,
                "flex items-center justify-center rounded-md",
                "transition-transform duration-100",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--rating-star]/70",
                disabled
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer hover:scale-110 active:scale-95",
              ].join(" ")}
              style={{
                color: filled ? "var(--rating-star)" : "var(--color-border)",
                background: "transparent",
                border: "none",
                padding: 0,
              }}
              onMouseEnter={() => !disabled && setHovered(n)}
              onClick={() => handleClick(n)}
              onKeyDown={(e) => handleKeyDown(e, n - 1)}
            >
              {/* Solid star when filled, outline otherwise */}
              {filled ? (
                <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Visible label beneath stars */}
      {display !== null && (
        <p className="mt-1 text-[12px] font-semibold text-text-soft" aria-hidden="true">
          {labels[display - 1]}
        </p>
      )}
    </fieldset>
  );
}
