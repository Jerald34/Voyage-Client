"use client";

import { useEffect, useState } from "react";
import { MINIMUM_BROWSERS, isBrowserSupported } from "../../lib/systemRequirements.js";

const DISMISSED_KEY = "voyage-old-browser-dismissed";

function wasDismissed() {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Warns, once per session, when the browser lacks the CSS features Voyage needs. */
export default function UnsupportedBrowserBanner({ check = isBrowserSupported }) {
  const [show, setShow] = useState(false);

  // After mount, so the server render and the first client render match.
  useEffect(() => {
    setShow(!check() && !wasDismissed());
  }, [check]);

  if (!show) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Storage blocked: it hides for this page view only.
    }
    setShow(false);
  };

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[200] flex items-start justify-center gap-3 border-b border-status-warning bg-surface px-4 py-3 text-sm text-text-primary shadow-strong"
    >
      <p className="m-0 max-w-3xl">
        Your browser is older than Voyage supports, so some screens may not work. Voyage needs {MINIMUM_BROWSERS} or newer.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss browser warning"
        className="min-h-11 shrink-0 rounded-pill border border-border px-4 font-semibold text-text-primary hover:border-secondary"
      >
        Dismiss
      </button>
    </div>
  );
}
