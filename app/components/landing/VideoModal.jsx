"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/** The demo video in a modal dialog: focus moves in, stays in, and returns to the trigger. */
export default function VideoModal({ isOpen, onClose, videoUrl }) {
  const videoRef = useRef(null);
  const closeRef = useRef(null);
  // Callers pass a fresh arrow each render; keep the effect tied to isOpen alone so a
  // parent re-render never resets the video or bounces focus.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;
    const returnTo = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    closeRef.current?.focus();

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      // Two stops: the close button and the video's controls.
      const stops = [closeRef.current, videoRef.current].filter(Boolean);
      const index = stops.indexOf(document.activeElement);
      e.preventDefault();
      const next = e.shiftKey ? (index <= 0 ? stops.length - 1 : index - 1) : (index + 1) % stops.length;
      stops[next].focus();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    // The ref is already cleared by the time cleanup runs, so hold the element now.
    const video = videoRef.current;

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
      if (returnTo instanceof HTMLElement) returnTo.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Voyage demo video"
        className="relative w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close video"
          className="absolute -top-12 right-0 grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-white/10 text-white transition-colors duration-150 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        {/* max-h keeps the close button on screen in short landscape viewports: 4rem above and below the video. */}
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          autoPlay
          playsInline
          tabIndex={0}
          className="aspect-video max-h-[calc(100dvh-8rem)] w-full rounded-lg bg-black"
        />
      </div>
    </div>,
    document.body,
  );
}
