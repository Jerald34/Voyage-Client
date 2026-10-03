"use client";

import { useEffect, useRef, useState } from "react";
import KindIcon, { hasKindIcon } from "./KindIcon";

/**
 * One row in "Needs you today".
 *
 * - Leading badge: the row's kind as an icon on a tone-tinted circle, plus an
 *   sr-only label for tones that carry meaning (info rows need none), so the
 *   meaning never rests on colour alone.
 * - The row body is a <button> when onRowClick is set; the action is its own
 *   ≥44px button, and its clicks never reach onRowClick.
 * - Enter animation: fade + 8px rise over 240ms, started `enterDelay` ms late
 *   so a list can stagger; opacity only (no delay) under prefers-reduced-motion.
 */

const TONE_BADGE_CLASS = {
  info: "bg-secondary/15 text-secondary-strong",
  success: "bg-status-success/15 text-status-success",
  warning: "bg-status-warning/15 text-status-warning",
  danger: "bg-status-danger/15 text-status-danger",
};

const TONE_DOT_CLASS = {
  info: "bg-secondary",
  success: "bg-status-success",
  warning: "bg-status-warning",
  danger: "bg-status-danger",
};

/** What a tone means, read by screen readers. Info rows get no label. */
const TONE_LABEL = {
  success: "Coming up",
  warning: "Needs attention",
  danger: "Urgent",
};

export default function WorklistRow({
  tone = "info",
  kind,
  title,
  subtitle,
  hint,
  actionLabel,
  onAction,
  onRowClick,
  actionDisabled = false,
  actionPending = false,
  enterDelay = 0,
}) {
  const [mounted, setMounted] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Defer a frame so the transition actually runs.
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const rowStyle = reducedMotion.current
    ? { opacity: mounted ? 1 : 0, transition: "opacity 240ms ease" }
    : {
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 240ms var(--ease-out), transform 240ms var(--ease-out)",
        transitionDelay: `${enterDelay}ms`,
      };

  function handleActionClick(event) {
    event.stopPropagation();
    if (!actionDisabled && !actionPending && onAction) onAction();
  }

  const BodyTag = onRowClick ? "button" : "span";
  const bodyProps = onRowClick
    ? {
        type: "button",
        onClick: onRowClick,
        className:
          "min-w-0 flex-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2",
      }
    : { className: "min-w-0 flex-1" };

  return (
    <div role="listitem" style={rowStyle} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2">
      <div className="flex shrink-0 items-center">
        <span
          aria-hidden="true"
          className={`flex h-7 w-7 items-center justify-center rounded-full ${TONE_BADGE_CLASS[tone] ?? TONE_BADGE_CLASS.info}`}
        >
          {hasKindIcon(kind) ? (
            <KindIcon kind={kind} className="h-3.5 w-3.5" />
          ) : (
            <span className={`block h-2 w-2 rounded-full ${TONE_DOT_CLASS[tone] ?? TONE_DOT_CLASS.info}`} />
          )}
        </span>
        {TONE_LABEL[tone] ? <span className="sr-only">{TONE_LABEL[tone]}</span> : null}
      </div>

      <BodyTag {...bodyProps}>
        <span className="block text-[13px] font-semibold leading-snug text-text-primary">{title}</span>
        {subtitle ? (
          <span className="block truncate text-[12px] text-text-muted" title={subtitle}>
            {subtitle}
          </span>
        ) : null}
      </BodyTag>

      {/* Beside the action on wider screens; on phones it wraps under the title. */}
      {hint ? (
        <span className="order-last basis-full pl-10 text-[12px] text-text-muted sm:order-none sm:basis-auto sm:whitespace-nowrap sm:pl-0">
          {hint}
        </span>
      ) : null}

      <button
        type="button"
        onClick={handleActionClick}
        disabled={actionDisabled || actionPending}
        className="min-h-[44px] min-w-[44px] shrink-0 rounded-md px-3 text-[13px] font-semibold text-secondary-strong transition-colors hover:bg-secondary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ transitionDuration: "120ms", transitionTimingFunction: "var(--ease-out)" }}
      >
        {actionPending ? "…" : actionLabel}
      </button>
    </div>
  );
}
