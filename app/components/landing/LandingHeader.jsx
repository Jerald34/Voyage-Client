// app/components/landing/LandingHeader.jsx
"use client";

import ThemeToggle from "../theme/ThemeToggle";
import VoyageLogo from "../brand/VoyageLogo";
import { LANDING_NAV } from "./landingContent.js";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "./landingClasses.js";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

// The shared button classes carry px-5. Swap it (don't append a second px-*): Tailwind v4 orders
// same-property utilities in its generated CSS, not in the class attribute, so two would fight.
// Tighter below sm so logo + both buttons fit a 375px phone.
const compactButton = (classes) => classes.replace("px-5", "px-3 sm:px-4");
const LOGIN_BUTTON = compactButton(SECONDARY_BUTTON);
const START_BUTTON = compactButton(PRIMARY_BUTTON);

/** Sticky pill header: logo, section links (lg+), theme toggle (sm+), Log in and Start planning. */
export default function LandingHeader({ onLogin, onStartPlanning }) {
  return (
    <header className="sticky top-3 z-50 mx-auto w-full max-w-[1220px] px-4">
      <div className="flex items-center justify-between gap-2 rounded-pill border border-border/[0.12] bg-surface/85 px-3 py-2 shadow-soft backdrop-blur-md sm:gap-3 sm:px-6">
        <a
          href="#top"
          aria-label="Voyage home"
          className={`inline-flex min-h-11 shrink-0 items-center rounded-pill text-text-primary no-underline ${FOCUS}`}
        >
          <VoyageLogo className="h-8 w-auto sm:h-9" />
        </a>
        {/* From lg: the four links need ~383px, and at md (768) logo + links + buttons overflow (links wrapped). */}
        <nav aria-label="Landing" className="hidden lg:block">
          <ul className="m-0 flex list-none items-center gap-1 p-0">
            {LANDING_NAV.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-pill px-3 text-sm font-semibold text-text-muted no-underline transition-colors duration-150 hover:bg-secondary/[0.08] hover:text-text-primary ${FOCUS}`}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <span className="hidden text-text-primary sm:block">
            {/* ThemeToggle sizes itself 40px inline; the important modifier lifts it to the 44px touch minimum. */}
            <ThemeToggle className="h-11! w-11!" />
          </span>
          <button type="button" onClick={onLogin} className={LOGIN_BUTTON}>
            Log in
          </button>
          <button type="button" onClick={onStartPlanning} className={START_BUTTON}>
            Start planning
          </button>
        </div>
      </div>
    </header>
  );
}
