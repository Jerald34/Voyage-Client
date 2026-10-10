"use client";

import VoyageLogo from "../brand/VoyageLogo";
import WeatherIcon from "../weather/WeatherIcon.jsx";
import { ArrowRightIcon, CalendarIcon, ChatIcon, LockIcon, MapIcon, MapPinIcon, ShareIcon, StarIcon } from "../icons/index.js";
import { AUDIENCES, FAQS, FEATURES, FINAL_CTA, LANDING_NAV, STEPS } from "./landingContent.js";
import { FOCUS, FOCUS_INSET, PRIMARY_BUTTON } from "./landingClasses.js";

const FEATURE_ICONS = {
  chat: <ChatIcon width={18} height={18} />,
  place: <MapPinIcon width={18} height={18} />,
  // WeatherIcon strokes with currentColor, so it takes the tile's terracotta like the other icons.
  weather: <WeatherIcon condition="RAIN" size={18} />,
  map: <MapIcon width={18} height={18} />,
  share: <ShareIcon width={18} height={18} />,
  lock: <LockIcon width={18} height={18} />,
  star: <StarIcon width={18} height={18} />,
  calendar: <CalendarIcon width={18} height={18} />,
};

const SECTION = "mx-auto w-full max-w-[1220px] scroll-mt-24 px-4 pb-24";
const H2 = "m-0 font-sans text-2xl font-semibold text-text-primary md:text-3xl";

// The closing band sits on bg-sidebar, where the shared terracotta ring is only 2.3:1 in light mode. White is 12:1 there
// and 16:1 on the lifted dark band (bg-sidebar alone is 1.03:1 against the dark page, so dark uses surface-elevated).
// The class is swapped, not appended: Tailwind orders by generated CSS, not by class order.
const CTA_BUTTON = PRIMARY_BUTTON.replace("focus-visible:outline-secondary-strong", "focus-visible:outline-white");

const FOOTER_LINK = `inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 text-sm text-text-muted no-underline transition-colors duration-150 hover:text-text-primary motion-reduce:transition-none ${FOCUS}`;

export function WhatItDoes() {
  return (
    <section id="what-it-does" aria-labelledby="what-it-does-title" className={SECTION}>
      <h2 id="what-it-does-title" className={H2}>
        What Voyage does
      </h2>
      {/* role="list": list-style:none drops list semantics in Safari/VoiceOver. */}
      <ul role="list" aria-label="Features" className="m-0 mt-6 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <li key={feature.title} className="rounded-xl border border-border/15 bg-surface p-5">
            <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary/10 text-secondary-strong">
              {FEATURE_ICONS[feature.icon]}
            </span>
            <h3 className="m-0 mt-3 font-sans text-[15px] font-semibold text-text-primary">{feature.title}</h3>
            <p className="m-0 mt-1 text-sm leading-relaxed text-text-muted">{feature.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-title" className={SECTION}>
      <h2 id="how-it-works-title" className={H2}>
        How it works
      </h2>
      <ol role="list" aria-label="Steps" className="m-0 mt-6 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <li key={step.title}>
            {/* The list already numbers the steps for assistive tech, so the visible digit is hidden from it. */}
            <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-strong text-sm font-bold text-on-secondary-strong">
              {index + 1}
            </span>
            <h3 className="m-0 mt-3 font-sans text-[15px] font-semibold text-text-primary">{step.title}</h3>
            <p className="m-0 mt-1 text-sm leading-relaxed text-text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ForAgencies() {
  return (
    <section id="for-agencies" aria-labelledby="for-agencies-title" className={SECTION}>
      <h2 id="for-agencies-title" className={H2}>
        Built for agencies
      </h2>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {AUDIENCES.map((audience) => (
          <div key={audience.title} className="rounded-xl border border-border/15 bg-surface p-6">
            <h3 className="m-0 font-sans text-lg font-semibold text-text-primary">{audience.title}</h3>
            <p className="m-0 mt-2 text-sm leading-relaxed text-text-muted">{audience.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className={SECTION}>
      <h2 id="faq-title" className={H2}>
        Questions
      </h2>
      <div className="mt-6 divide-y divide-border/15 rounded-xl border border-border/15 bg-surface">
        {FAQS.map((faq) => (
          <details key={faq.question} className="group">
            {/* Padding lives on the summary so the inset focus ring has room around the text and follows the container's corners. */}
            <summary
              className={`flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 text-[15px] font-semibold text-text-primary transition-colors duration-150 hover:bg-secondary/[0.06] motion-reduce:transition-none [&::-webkit-details-marker]:hidden ${FOCUS_INSET}`}
            >
              {faq.question}
              <span
                aria-hidden="true"
                className="shrink-0 text-xl leading-none text-text-muted transition-transform duration-150 ease-out group-open:rotate-45 motion-reduce:transition-none"
              >
                +
              </span>
            </summary>
            <p className="m-0 px-5 pb-5 text-sm leading-relaxed text-text-muted">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function FinalCta({ onStartPlanning }) {
  return (
    <section aria-labelledby="final-cta-title" className="w-full bg-sidebar px-4 py-20 dark:border-y dark:border-border/40 dark:bg-surface-elevated md:py-24">
      <div className="mx-auto flex max-w-[1220px] flex-col items-center gap-5 text-center">
        <h2 id="final-cta-title" className="m-0 font-sans text-2xl font-semibold text-white md:text-3xl">
          {FINAL_CTA.title}
        </h2>
        <p className="m-0 max-w-[48ch] text-base leading-relaxed text-white/75">{FINAL_CTA.body}</p>
        <button type="button" onClick={onStartPlanning} className={CTA_BUTTON}>
          Start planning
          <ArrowRightIcon width={16} height={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

export function LandingFooter({ onLogin }) {
  return (
    <footer className="w-full border-t border-border/15 bg-surface px-4 py-8">
      <div className="mx-auto flex max-w-[1220px] flex-wrap items-center justify-between gap-4">
        <VoyageLogo className="h-8 w-auto text-text-primary" />
        <nav aria-label="Footer">
          <ul role="list" className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-2 p-0">
            {LANDING_NAV.map((link) => (
              <li key={link.href}>
                <a href={link.href} className={FOOTER_LINK}>
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <button type="button" onClick={onLogin} className={`${FOOTER_LINK} cursor-pointer border-0 bg-transparent`}>
                Log in
              </button>
            </li>
          </ul>
        </nav>
        <p className="m-0 w-full text-[12px] text-text-muted sm:w-auto">© {new Date().getFullYear()} Voyage</p>
      </div>
    </footer>
  );
}
