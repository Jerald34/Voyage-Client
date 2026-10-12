"use client";

import { useEffect } from "react";

/**
 * A short message under the dashboard header that clears itself after a few seconds. The live
 * region stays mounted. `notice` is `{ text, id }` or null: a new id (even with the same text)
 * announces again and restarts the timer.
 */
export default function FlashNotice({ notice, onDone, durationMs = 6000 }) {
  const id = notice?.id ?? null;
  useEffect(() => {
    if (id === null) return undefined;
    const timer = window.setTimeout(() => onDone?.(), durationMs);
    return () => window.clearTimeout(timer);
  }, [id, onDone, durationMs]);

  // Just below the header: 16px frame padding + 84px header (desktop), 48px header (phones), plus a gap.
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[108px] z-[160] flex justify-center px-4 max-[900px]:top-[56px]"
    >
      {notice?.text ? (
        <p
          key={notice.id}
          className="m-0 max-w-[560px] rounded-pill border border-white/10 bg-sidebar px-4 py-2 text-sm font-semibold text-white shadow-strong"
        >
          {notice.text}
        </p>
      ) : null}
    </div>
  );
}
