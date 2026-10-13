"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { voyageTourSteps } from "./tutorialContent.js";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const PRIMARY_SELECTOR = "[data-tour-primary]";

const VIEWPORT_PADDING = 16;
const CARD_WIDTH = 370;
const CARD_GAP = 18;
const ESTIMATED_CARD_HEIGHT = 310;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getTargetSelector(target) {
  return `[data-tour-target="${target}"]`;
}

function getPrefersReducedMotion() {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

function getCompactViewport() {
  return window.matchMedia?.("(max-width: 820px)")?.matches ?? window.innerWidth <= 820;
}

function getCoachPosition(rect, step, isCompact) {
  // A step with nothing to point at (the welcome card) sits in the middle of the
  // window. CSS does the centring, so it stays put when the window resizes or
  // the phone rotates; the card's max-height keeps it on screen.
  if (step?.centered) {
    if (isCompact) {
      return { left: VIEWPORT_PADDING, right: VIEWPORT_PADDING, top: "50%", transform: "translateY(-50%)" };
    }
    return {
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width: CARD_WIDTH,
      maxWidth: `calc(100vw - ${VIEWPORT_PADDING * 2}px)`,
    };
  }

  const placement = step?.placement;
  if (isCompact) {
    // Per-step explicit override wins.
    const compactPlacement = step?.compactPlacement;
    if (compactPlacement === "top") {
      return {
        left: VIEWPORT_PADDING,
        right: VIEWPORT_PADDING,
        top: VIEWPORT_PADDING,
      };
    }
    if (compactPlacement === "bottom") {
      return {
        left: VIEWPORT_PADDING,
        right: VIEWPORT_PADDING,
        bottom: VIEWPORT_PADDING,
      };
    }
    // Otherwise anchor the card to the opposite end of the viewport from the
    // target so it doesn't cover the spotlight.
    const viewportHeight = window.innerHeight || 768;
    if (rect && (rect.width > 0 || rect.height > 0)) {
      const targetCenterY = rect.top + rect.height / 2;
      if (targetCenterY > viewportHeight * 0.5) {
        return {
          left: VIEWPORT_PADDING,
          right: VIEWPORT_PADDING,
          top: VIEWPORT_PADDING,
        };
      }
      return {
        left: VIEWPORT_PADDING,
        right: VIEWPORT_PADDING,
        bottom: VIEWPORT_PADDING,
      };
    }
    // No measurable target — on mobile the actionable surface is the bottom
    // sheet (MobileGlassSheet), so anchor the card to the top to keep it clear.
    return {
      left: VIEWPORT_PADDING,
      right: VIEWPORT_PADDING,
      top: VIEWPORT_PADDING,
    };
  }

  const viewportWidth = window.innerWidth || 1024;
  const viewportHeight = window.innerHeight || 768;
  const width = Math.min(CARD_WIDTH, viewportWidth - VIEWPORT_PADDING * 2);
  const fallbackRect = {
    top: viewportHeight / 2 - 80,
    left: viewportWidth / 2 - 80,
    width: 160,
    height: 160,
  };
  const targetRect = rect ?? fallbackRect;
  const centeredLeft = targetRect.left + targetRect.width / 2 - width / 2;
  const centeredTop = targetRect.top + targetRect.height / 2 - ESTIMATED_CARD_HEIGHT / 2;

  let left = centeredLeft;
  let top = targetRect.top + targetRect.height + CARD_GAP;

  if (placement === "top") {
    top = targetRect.top - ESTIMATED_CARD_HEIGHT - CARD_GAP;
  } else if (placement === "right") {
    left = targetRect.left + targetRect.width + CARD_GAP;
    top = centeredTop;
  } else if (placement === "left") {
    left = targetRect.left - width - CARD_GAP;
    top = centeredTop;
  }

  if (left + width > viewportWidth - VIEWPORT_PADDING) {
    left = targetRect.left - width - CARD_GAP;
  }

  if (left < VIEWPORT_PADDING) {
    left = targetRect.left + targetRect.width + CARD_GAP;
  }

  if (left + width > viewportWidth - VIEWPORT_PADDING || left < VIEWPORT_PADDING) {
    left = centeredLeft;
  }

  if (top + ESTIMATED_CARD_HEIGHT > viewportHeight - VIEWPORT_PADDING) {
    top = targetRect.top - ESTIMATED_CARD_HEIGHT - CARD_GAP;
  }

  if (top < VIEWPORT_PADDING) {
    top = targetRect.top + targetRect.height + CARD_GAP;
  }

  return {
    left: clamp(left, VIEWPORT_PADDING, Math.max(VIEWPORT_PADDING, viewportWidth - width - VIEWPORT_PADDING)),
    top: clamp(top, VIEWPORT_PADDING, Math.max(VIEWPORT_PADDING, viewportHeight - ESTIMATED_CARD_HEIGHT - VIEWPORT_PADDING)),
    width,
  };
}

function TutorialProgress({ activeIndex, steps }) {
  return (
    <div className="flex items-center gap-1 max-[820px]:gap-0.75" aria-hidden="true">
      {steps.map((step, index) => (
        <span
          key={step.id}
          className={[
            "h-1 rounded-full transition-all max-[820px]:h-[3px]",
            index === activeIndex ? "w-7 bg-secondary max-[820px]:w-5" : "w-2 bg-white/25 max-[820px]:w-1.5",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

function TutorialBackdrop({ onClose, spotlightStyle }) {
  if (spotlightStyle?.display === "none") {
    return (
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close tutorial backdrop"
        className="absolute inset-0 bg-slate-950/62 backdrop-blur-[2px]"
        onClick={onClose}
      />
    );
  }

  const top = Number(spotlightStyle.top) || 0;
  const left = Number(spotlightStyle.left) || 0;
  const width = Number(spotlightStyle.width) || 0;
  const height = Number(spotlightStyle.height) || 0;
  const bottomTop = top + height;
  const rightLeft = left + width;
  const segmentClass = "absolute bg-slate-950/62 backdrop-blur-[2px]";

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close tutorial backdrop"
        className={segmentClass}
        style={{ top: 0, left: 0, right: 0, height: top }}
        onClick={onClose}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close tutorial backdrop"
        className={segmentClass}
        style={{ top, left: 0, width: left, height }}
        onClick={onClose}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close tutorial backdrop"
        className={segmentClass}
        style={{ top, left: rightLeft, right: 0, height }}
        onClick={onClose}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close tutorial backdrop"
        className={segmentClass}
        style={{ top: bottomTop, left: 0, right: 0, bottom: 0 }}
        onClick={onClose}
      />
    </>
  );
}

export default function FirstUseTutorial({
  open,
  onClose,
  onStepChange,
  steps = voyageTourSteps,
  title = "First-use tutorial",
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [isCompact, setIsCompact] = useState(false);
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  const activeStep = steps[activeIndex] ?? steps[0];
  const isLastStep = activeIndex === steps.length - 1;

  useEffect(() => {
    if (!open) {
      // Reset on close too, so a reopen renders step 0 and never reports the stale last step.
      setActiveIndex(0);
      return;
    }

    setActiveIndex(0);
    setIsCompact(getCompactViewport());
  }, [open]);

  useEffect(() => {
    if (!open || !activeStep) {
      return;
    }

    onStepChange?.(activeStep);
  }, [activeStep, onStepChange, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    window.setTimeout(() => {
      const dialog = dialogRef.current;
      // Land on Next / Start tour so Enter moves on rather than skipping the tour.
      const initialFocus = dialog?.querySelector(PRIMARY_SELECTOR) ?? dialog?.querySelector(FOCUSABLE_SELECTOR);
      if (initialFocus instanceof HTMLElement) {
        initialFocus.focus();
      } else {
        dialog?.focus();
      }
    }, 0);

    return () => {
      const previousFocus = previousFocusRef.current;
      if (previousFocus instanceof HTMLElement && document.contains(previousFocus)) {
        previousFocus.focus();
      }
      previousFocusRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    // A step change can leave focus nowhere (Back disables itself on the first
    // step); bring it back to the primary button.
    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) {
      const primary = dialog.querySelector(PRIMARY_SELECTOR);
      if (primary instanceof HTMLElement) {
        primary.focus();
      }
    }
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      const focusableElements = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (element) => element instanceof HTMLElement && !element.hasAttribute("disabled"),
      );

      if (!focusableElements.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        firstFocusable.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    if (!activeStep?.target) {
      // No target (the welcome card): drop the previous step's spotlight, and
      // keep the compact/desktop layout in step with the window.
      setTargetRect(null);
      const handleResize = () => setIsCompact(getCompactViewport());
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }

    let frameId = 0;
    let scrollSettleTimer = 0;
    let observer = null;
    let resizeObserver = null;
    let observedElement = null;
    let didScrollIntoView = false;

    const findTarget = () => {
      // Multiple elements may share the same data-tour-target (e.g. desktop
      // and mobile variants of the same control where one lives in a
      // display:none layer). Pick the first visible match. We can't use
      // offsetParent here because it's null for position:fixed elements like
      // MobileGlassSheet — a real bounding rect with non-zero size is the
      // reliable signal (display:none returns all zeros).
      const all = document.querySelectorAll(getTargetSelector(activeStep.target));
      for (const el of all) {
        if (!(el instanceof HTMLElement)) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return el;
        }
      }
      return null;
    };

    const updateTargetRect = () => {
      // Re-query each tick so we pick up the target after a tab switch /
      // conditional render mounts it later than this effect runs.
      const targetElement = findTarget();
      if (!(targetElement instanceof HTMLElement)) {
        setTargetRect(null);
        return;
      }

      // The mutation observer below stops after the first measurement, so watch
      // the target itself: a skeleton swapping for real content changes its size.
      if (typeof ResizeObserver !== "undefined" && targetElement !== observedElement) {
        resizeObserver?.disconnect();
        resizeObserver = new ResizeObserver(() => requestRectUpdate());
        resizeObserver.observe(targetElement);
        observedElement = targetElement;
      }

      if (!didScrollIntoView) {
        didScrollIntoView = true;
        targetElement.scrollIntoView?.({
          block: "center",
          inline: "center",
          behavior: getPrefersReducedMotion() ? "auto" : "smooth",
        });
      }

      const nextRect = targetElement.getBoundingClientRect();
      if (nextRect.width === 0 && nextRect.height === 0) {
        // Target is inside a display:none ancestor — treat it as missing.
        setTargetRect(null);
        return;
      }
      const measured = {
        top: nextRect.top,
        left: nextRect.left,
        width: nextRect.width,
        height: nextRect.height,
      };
      // Keep the previous object when nothing moved, so the settle timer and the
      // resize observer don't re-render the overlay for nothing.
      setTargetRect((previous) =>
        previous &&
        previous.top === measured.top &&
        previous.left === measured.left &&
        previous.width === measured.width &&
        previous.height === measured.height
          ? previous
          : measured,
      );
      setIsCompact(getCompactViewport());

      if (observer) {
        observer.disconnect();
        observer = null;
      }
    };

    const requestRectUpdate = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateTargetRect);
    };

    if (typeof MutationObserver !== "undefined") {
      observer = new MutationObserver(() => {
        requestRectUpdate();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    scrollSettleTimer = window.setTimeout(requestRectUpdate, 90);
    requestRectUpdate();

    window.addEventListener("resize", requestRectUpdate);
    window.addEventListener("scroll", requestRectUpdate, true);

    return () => {
      window.clearTimeout(scrollSettleTimer);
      window.cancelAnimationFrame(frameId);
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      window.removeEventListener("resize", requestRectUpdate);
      window.removeEventListener("scroll", requestRectUpdate, true);
    };
  }, [activeStep, open]);

  // targetRect lags a frame behind a step change; a step with no target never shows it.
  const visibleRect = activeStep?.target ? targetRect : null;

  const coachStyle = useMemo(() => {
    if (!open || !activeStep) {
      return {};
    }

    return getCoachPosition(visibleRect, activeStep, isCompact);
  }, [activeStep, isCompact, open, visibleRect]);

  const spotlightStyle = useMemo(() => {
    if (!visibleRect) {
      return {
        display: "none",
      };
    }

    const inset = isCompact ? 4 : 8;
    return {
      top: Math.max(8, visibleRect.top - inset),
      left: Math.max(8, visibleRect.left - inset),
      width: Math.max(44, visibleRect.width + inset * 2),
      height: Math.max(44, visibleRect.height + inset * 2),
    };
  }, [isCompact, visibleRect]);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  if (!open || !activeStep) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[180]">
      <TutorialBackdrop onClose={handleClose} spotlightStyle={spotlightStyle} />

      <div
        className="pointer-events-none fixed rounded-[22px] border-2 border-secondary bg-transparent shadow-[0_0_0_8px_rgba(215,122,97,0.16),0_18px_46px_rgba(0,0,0,0.28)] transition-all duration-200"
        data-tour-spotlight={activeStep.target ?? "none"}
        style={spotlightStyle}
      />

      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-use-tutorial-title first-use-tutorial-step-title"
        aria-describedby="first-use-tutorial-description"
        tabIndex={-1}
        className="fixed z-10 max-h-[calc(100dvh-32px)] overflow-y-auto rounded-[22px] border border-white/12 bg-[#0b171e] p-4 text-white shadow-[0_24px_80px_rgba(2,8,23,0.5)] outline-none max-[820px]:max-h-[calc(100dvh-20px)] max-[820px]:rounded-[20px] max-[820px]:p-3"
        style={coachStyle}
      >
        <div className="flex items-start justify-between gap-4 max-[820px]:gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary/90 max-[820px]:text-[10px] max-[820px]:tracking-[0.16em]">
              Step {activeIndex + 1} of {steps.length}
            </p>
            <h2 id="first-use-tutorial-title" className="mt-1 font-sans text-xl font-semibold tracking-[-0.02em] text-white max-[820px]:mt-0.5 max-[820px]:text-[1rem]">
              {title}
            </h2>
          </div>
          <TutorialProgress activeIndex={activeIndex} steps={steps} />
        </div>

        <h3 id="first-use-tutorial-step-title" className="mt-4 font-sans text-lg font-semibold leading-6 tracking-[-0.01em] text-white max-[820px]:mt-3 max-[820px]:text-[0.98rem] max-[820px]:leading-5">
          {activeStep.title}
        </h3>
        <p id="first-use-tutorial-description" className="mt-2 text-sm leading-6 text-white/70 max-[820px]:mt-1.5 max-[820px]:text-[0.78rem] max-[820px]:leading-5">
          {activeStep.description}
        </p>

        {activeStep.chips?.length ? (
          <ul role="list" aria-label="What the tour covers" className="mt-4 flex flex-wrap gap-1.5 max-[820px]:mt-3">
            {activeStep.chips.map((chip) => (
              <li key={chip} className="rounded-pill bg-white/8 px-2.5 py-1 text-xs font-semibold text-white/85">
                {chip}
              </li>
            ))}
          </ul>
        ) : null}

        {activeStep.bullets?.length ? (
          <ul role="list" className="mt-4 space-y-2 max-[820px]:mt-3 max-[820px]:space-y-1.5">
            {activeStep.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2 text-sm leading-6 text-white/72 max-[820px]:text-[0.78rem] max-[820px]:leading-5">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary max-[820px]:mt-[7px] max-[820px]:h-1 max-[820px]:w-1" aria-hidden="true" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 max-[820px]:mt-4 max-[820px]:gap-2">
          <button
            type="button"
            className="min-h-11 rounded-pill border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10 max-[820px]:min-h-10 max-[820px]:px-3 max-[820px]:text-[0.78rem]"
            onClick={handleClose}
          >
            Skip tutorial
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="min-h-11 rounded-pill border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 max-[820px]:min-h-10 max-[820px]:px-3 max-[820px]:text-[0.78rem]"
              onClick={() => setActiveIndex((current) => Math.max(current - 1, 0))}
              disabled={activeIndex === 0}
            >
              Back
            </button>
            {isLastStep ? (
              <button
                type="button"
                className="min-h-11 rounded-pill bg-secondary px-5 text-sm font-semibold text-white transition hover:brightness-110 max-[820px]:min-h-10 max-[820px]:px-4 max-[820px]:text-[0.78rem]"
                data-tour-primary
                onClick={handleClose}
              >
                Finish tutorial
              </button>
            ) : (
              <button
                type="button"
                className="min-h-11 rounded-pill bg-secondary px-5 text-sm font-semibold text-white transition hover:brightness-110 max-[820px]:min-h-10 max-[820px]:px-4 max-[820px]:text-[0.78rem]"
                data-tour-primary
                onClick={() => setActiveIndex((current) => Math.min(current + 1, steps.length - 1))}
              >
                {activeStep.nextLabel ?? "Next"}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
