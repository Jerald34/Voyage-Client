"use client";

import { shortUntil } from "../../../lib/agentPause.js";

// ChatComposer's shell, nearly opaque so replies scrolling behind it don't show through,
// with the warning colour on the edge instead of the focus-ring accent.
const stripSurfaceClass =
  "flex w-full min-w-0 items-center gap-3 rounded-[18px] border border-status-warning/40 bg-[rgba(255,255,255,0.97)] px-4 py-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.06)] dark:bg-[rgba(26,29,33,0.97)]";

/** Stands in for the composer while the agent is paused. "Why?" reopens the explanation. */
export default function AgentPausedStrip({ pause, onWhy, containerClassName = "" }) {
  return (
    <div className={`mt-auto pt-3 w-full transition-opacity duration-200 ease-out starting:opacity-0 ${containerClassName}`}>
      <div className={stripSurfaceClass}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-none text-status-warning"
          aria-hidden="true"
        >
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        <p role="status" className="min-w-0 flex-1 text-sm font-medium text-text-primary">
          {shortUntil(pause)}
        </p>
        <button
          type="button"
          onClick={onWhy}
          className="flex-none min-h-11 cursor-pointer rounded-sm px-3 py-2 text-sm font-semibold text-text-primary underline underline-offset-2 transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-border/10"
        >
          Why?
        </button>
      </div>
    </div>
  );
}
