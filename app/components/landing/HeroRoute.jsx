"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "./landingMotion.jsx";

const DRAW = { duration: 1.9, delay: 0.35, ease: EASE_OUT };

// The route runs in from the left just under the pitch, then rises into the sample trip card's left edge, so the dot
// disappears into the plan. It is anchored to the pitch's bottom, not the hero's: the card makes the hero taller than
// most screens, and a route along the hero's bottom would sit below the fold. Built in pixels, not a stretched viewBox,
// so the dashes and the dot keep their shape at every width.
function routePath({ w, y, cardLeft }) {
  const r = Math.round;
  return `M -30 ${r(y + 40)} C ${r(w * 0.1)} ${r(y - 30)}, ${r(w * 0.2)} ${r(y + 70)}, ${r(w * 0.32)} ${r(y + 20)} S ${r(cardLeft - 70)} ${r(y - 80)}, ${r(cardLeft + 24)} ${r(y - 110)}`;
}

// Layout boxes (offsetTop/Left), not getBoundingClientRect: the pitch and card are mid-entrance (translated) when first measured.
function measure(section) {
  const pitch = section.querySelector("[data-hero-pitch]");
  const card = section.querySelector("[data-hero-card]");
  if (!pitch || !card) return null;
  return {
    w: section.clientWidth,
    h: section.clientHeight,
    y: pitch.offsetTop + pitch.offsetHeight + 56,
    cardLeft: card.offsetLeft,
  };
}

const sameLayout = (a, b) => a && b && a.w === b.w && a.h === b.h && a.y === b.y && a.cardLeft === b.cardLeft;

/** The dashed travel route behind the hero (lg+ only, where the pitch and the card sit side by side). Decoration. */
export default function HeroRoute() {
  const ref = useRef(null);
  const [size, setSize] = useState(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const section = ref.current?.parentElement;
    // No ResizeObserver (jsdom): no route, which is only decoration.
    if (!section || typeof ResizeObserver === "undefined") return undefined;
    const update = () => {
      const next = measure(section);
      setSize((prev) => (sameLayout(prev, next) ? prev : next));
    };
    const observer = new ResizeObserver(update);
    // The section for width, the pitch for its height (it rewraps and grows when the web fonts land).
    observer.observe(section);
    const pitch = section.querySelector("[data-hero-pitch]");
    if (pitch) observer.observe(pitch);
    return () => observer.disconnect();
  }, []);

  const d = size ? routePath(size) : null;

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 hidden lg:block">
      {d ? (
        <>
          <svg width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} className="absolute inset-0 overflow-visible">
            <defs>
              {/* framer's pathLength draw uses the stroke dashes itself, so a solid line draws inside a mask and the dashed
                  route shows through it. */}
              <mask id="hero-route-mask" maskUnits="userSpaceOnUse">
                <motion.path
                  d={d}
                  fill="none"
                  stroke="white"
                  strokeWidth="10"
                  strokeLinecap="round"
                  initial={reduceMotion ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={DRAW}
                />
              </mask>
            </defs>
            <path
              d={d}
              mask="url(#hero-route-mask)"
              fill="none"
              stroke="var(--color-secondary)"
              strokeOpacity="0.55"
              strokeWidth="2"
              strokeDasharray="7 9"
              strokeLinecap="round"
            />
          </svg>
          {reduceMotion ? null : (
            // The traveller: rides the same path (CSS offset-path) with the same timing as the draw, then fades as it reaches the card.
            <motion.span
              className="absolute left-0 top-0 h-3 w-3 rounded-full bg-secondary shadow-[0_0_0_5px_rgb(var(--color-secondary-rgb)/0.18)]"
              style={{ offsetPath: `path("${d}")`, offsetRotate: "0deg" }}
              initial={{ offsetDistance: "0%", opacity: 1 }}
              animate={{ offsetDistance: "100%", opacity: [1, 1, 0] }}
              transition={{ offsetDistance: DRAW, opacity: { ...DRAW, times: [0, 0.85, 1] } }}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
