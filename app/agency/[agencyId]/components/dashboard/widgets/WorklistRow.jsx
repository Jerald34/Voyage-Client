"use client";

import { useEffect, useRef, useState } from "react";

/**
 * WorklistRow — a single row in the "Needs your eyes today" worklist.
 *
 * - Leading status dot (tone color) + sr-only tone label for color-not-only a11y.
 * - Row body is a <button> when onRowClick is provided; a <span> otherwise.
 * - Inline action is a real <button> with ≥44pt height. Clicks do not bubble to onRowClick.
 * - Enter animation: opacity + translateY(8px → 0), 240ms, var(--ease-out).
 *   Stagger is applied by the parent via `style={{ transitionDelay: '…ms' }}`.
 * - Respects prefers-reduced-motion: transform suppressed, opacity-only.
 *
 * Spec §3.1 (tone colors), §6.4 (anatomy), §6.5 (motion), §6.7 (a11y).
 */

const TONE_DOT_CLASS = {
  info:    "bg-secondary",
  success: "bg-[color:var(--success)]",
  warning: "bg-[color:var(--warning)]",
  danger:  "bg-[color:var(--danger)]",
};

export default function WorklistRow({
  tone = "info",
  title,
  subtitle,
  hint,
  actionLabel,
  onAction,
  onRowClick,
  actionDisabled = false,
  actionPending = false,
}) {
  const [mounted, setMounted] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    // Check once on mount — matchMedia is stable.
    reducedMotion.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Defer one tick so the transition actually fires (avoids the
    // "style set and class toggled in the same frame" no-op).
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const dotClass = TONE_DOT_CLASS[tone] ?? TONE_DOT_CLASS.info;

  // Base transition style; transform suppressed when reduced-motion.
  const rowStyle = reducedMotion.current
    ? {
        opacity: mounted ? 1 : 0,
        transition: "opacity 240ms ease",
      }
    : {
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(8px)",
        transition:
          "opacity 240ms var(--ease-out), transform 240ms var(--ease-out)",
      };

  function handleActionClick(e) {
    e.stopPropagation();
    if (!actionDisabled && !actionPending && onAction) {
      onAction();
    }
  }

  const BodyTag = onRowClick ? "button" : "span";
  const bodyProps = onRowClick
    ? {
        type: "button",
        onClick: onRowClick,
        className:
          "min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 rounded-md",
      }
    : {
        className: "min-w-0 flex-1",
      };

  return (
    <div
      role="listitem"
      style={rowStyle}
      className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg px-3 py-2 hover:bg-surface-elevated"
    >
      {/* Leading status dot */}
      <div className="flex shrink-0 items-center" aria-hidden="false">
        <span
          className={`block h-2 w-2 rounded-full ${dotClass}`}
          aria-hidden="true"
        />
        <span className="sr-only">{tone}</span>
      </div>

      {/* Row body — button when clickable, span otherwise */}
      <BodyTag {...bodyProps}>
        <span className="block text-[14px] font-semibold leading-snug text-text-primary">
          {title}
        </span>
        {subtitle ? (
          <span
            className="block truncate text-[13px] text-text-muted"
            title={subtitle}
          >
            {subtitle}
          </span>
        ) : null}
      </BodyTag>

      {/* Hint sits beside the action on wider screens. On phones it wraps onto
          its own line under the title, so the title keeps the row's width. */}
      {hint ? (
        <span className="order-last basis-full pl-5 text-[12px] text-text-muted sm:order-none sm:basis-auto sm:whitespace-nowrap sm:pl-0">
          {hint}
        </span>
      ) : null}

      <button
        type="button"
        onClick={handleActionClick}
        disabled={actionDisabled || actionPending}
        className="min-h-[44px] min-w-[44px] shrink-0 rounded-md px-4 text-[13px] font-bold text-secondary transition-colors hover:bg-secondary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ transitionDuration: "120ms", transitionTimingFunction: "var(--ease-out)" }}
      >
        {actionPending ? "…" : actionLabel}
      </button>
    </div>
  );
}
