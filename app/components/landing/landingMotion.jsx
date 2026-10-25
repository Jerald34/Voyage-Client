"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";

// --ease-out in globals.css.
export const EASE_OUT = [0.23, 1, 0.32, 1];

const VARIANTS = {
  rise: { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } } },
  // A small overshoot for chips and badges that "land".
  pop: { hidden: { opacity: 0, scale: 0.6 }, show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 420, damping: 18 } } },
};

// Play once, a little before the element is fully on screen.
const VIEWPORT = { once: true, margin: "0px 0px -80px 0px" };

// framer-motion's whileInView builds an IntersectionObserver on mount and throws where there is none (jsdom, very old
// browsers). There everything renders in place, the same fallback LazySampleTripMap uses.
const canObserve = () => typeof IntersectionObserver !== "undefined";

// `onLoad` plays straight away (the hero); otherwise it waits until the element scrolls into view.
function trigger(onLoad) {
  return onLoad ? { initial: "hidden", animate: "show" } : { initial: "hidden", whileInView: "show", viewport: VIEWPORT };
}

/** One element that rises (or pops) in. */
export function Reveal({ as = "div", variant = "rise", delay = 0, onLoad = false, children, ...rest }) {
  if (!canObserve()) {
    const Tag = as;
    return <Tag {...rest}>{children}</Tag>;
  }
  const Tag = motion[as];
  const { show, hidden } = VARIANTS[variant];
  const variants = { hidden, show: { ...show, transition: { ...show.transition, delay } } };
  return (
    <Tag variants={variants} {...trigger(onLoad)} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * A list or block whose RevealItem children come in one after another. Once it starts it carries
 * data-revealed, which CSS keys follow-up motion off (the stop cards' number badges, in globals.css).
 */
export function RevealGroup({ as = "div", gap = 0.08, delay = 0, onLoad = false, children, ...rest }) {
  const [revealed, setRevealed] = useState(false);
  if (!canObserve()) {
    const Tag = as;
    return (
      <Tag data-revealed="true" {...rest}>
        {children}
      </Tag>
    );
  }
  const Tag = motion[as];
  const variants = { hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } };
  return (
    <Tag
      variants={variants}
      {...trigger(onLoad)}
      onAnimationStart={() => setRevealed(true)}
      data-revealed={revealed ? "true" : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** A child of RevealGroup; it takes its timing from the group. */
export function RevealItem({ as = "div", variant = "rise", children, ...rest }) {
  if (!canObserve()) {
    const Tag = as;
    return <Tag {...rest}>{children}</Tag>;
  }
  const Tag = motion[as];
  return (
    <Tag variants={VARIANTS[variant]} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * A number that counts up from zero the first time it scrolls into view. Screen readers get the final value
 * straight away; the moving digits are hidden from them.
 */
export function CountUp({ value, format = String, duration = 1 }) {
  const ref = useRef(null);
  const inView = useInView(ref, VIEWPORT);
  const reduceMotion = useReducedMotion();
  const animated = canObserve() && !reduceMotion;

  useEffect(() => {
    if (!animated || !inView || !ref.current) return undefined;
    const controls = animate(0, value, {
      duration,
      ease: EASE_OUT,
      onUpdate: (latest) => {
        if (ref.current) ref.current.textContent = format(Math.round(latest));
      },
    });
    return () => controls.stop();
  }, [animated, inView, value, format, duration]);

  if (!animated) return <span>{format(value)}</span>;
  return (
    <>
      {/* tabular-nums keeps the width steady while the digits change. */}
      <span ref={ref} aria-hidden="true" className="tabular-nums">
        {format(0)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
