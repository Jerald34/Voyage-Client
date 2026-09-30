"use client";
import { useRef } from "react";

const OPTIONS = ["7d", "30d", "90d"];

/**
 * Segmented period switcher above the KPI strip.
 * Renders as a radiogroup so keyboard navigation follows the ARIA
 * radiogroup pattern: Left/Right arrows cycle options, Home/End jump.
 *
 * Spec §3.2, §6.4, §6.7.
 *
 * Props:
 *   value    — "7d" | "30d" | "90d"
 *   onChange — (newValue: string) => void
 *   disabled — boolean (optional)
 */
export default function PeriodSwitcher({ value, onChange, disabled = false }) {
  const buttonRefs = useRef([]);

  function handleKeyDown(e, currentIndex) {
    let nextIndex = currentIndex;

    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % OPTIONS.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + OPTIONS.length) % OPTIONS.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = OPTIONS.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    buttonRefs.current[nextIndex]?.focus();
    onChange(OPTIONS[nextIndex]);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Time period"
      aria-disabled={disabled}
      className="inline-flex items-center gap-0 rounded-pill bg-surface-elevated p-1 border border-border/20"
    >
      {OPTIONS.map((option, i) => {
        const isActive = option === value;
        return (
          <button
            key={option}
            ref={(el) => { buttonRefs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(option)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            // Radiogroup tabindex pattern: only the selected button is in the
            // tab sequence; arrow keys move between options.
            tabIndex={isActive ? 0 : -1}
            className={[
              // Effective hit area ≥44pt via py padding on a 32px content height.
              "relative flex h-8 min-w-[44px] items-center justify-center rounded-md px-3 py-[10px]",
              "text-xs font-extrabold tabular-nums transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-1",
              isActive
                ? "bg-secondary text-white shadow-soft"
                : "bg-transparent text-text-muted hover:text-text-primary",
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
            ].join(" ")}
            style={{
              transitionTimingFunction: "var(--ease-out)",
              transitionDuration: "120ms",
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
