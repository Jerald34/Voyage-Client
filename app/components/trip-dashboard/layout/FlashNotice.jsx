"use client";

import { useEffect } from "react";

/** A short message pinned to the top of the dashboard that clears itself. The live region stays mounted. */
export default function FlashNotice({ message, onDone, durationMs = 6000 }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => onDone?.(), durationMs);
    return () => window.clearTimeout(timer);
  }, [message, onDone, durationMs]);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-[160] flex justify-center px-4">
      {message ? (
        <p className="m-0 max-w-[560px] rounded-pill bg-sidebar px-4 py-2 text-sm font-semibold text-white shadow-strong">
          {message}
        </p>
      ) : null}
    </div>
  );
}
