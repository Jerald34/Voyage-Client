"use client";

import VoyageLogo from "../brand/VoyageLogo";
import WeatherIcon from "../weather/WeatherIcon.jsx";
import { ArrowRightIcon, CalendarIcon, CarIcon, ChatIcon, GlobeIcon, LockIcon, MapIcon, MapPinIcon, ShareIcon, StarIcon } from "../icons/index.js";
import { AUDIENCES, BUILT_ON, FAQS, FEATURES, FINAL_CTA, LANDING_NAV, STEPS } from "./landingContent.js";
import { FOCUS, FOCUS_INSET, LANDING_SECTION, PRIMARY_BUTTON } from "./landingClasses.js";
import { Reveal, RevealGroup, RevealItem } from "./landingMotion.jsx";

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

const SERVICE_ICONS = {
  places: <MapPinIcon width={18} height={18} />,
  routes: <CarIcon width={18} height={18} />,
  maps: <MapIcon width={18} height={18} />,
  signin: <LockIcon width={18} height={18} />,
  weather: <WeatherIcon condition="RAIN" size={18} />,
  globe: <GlobeIcon width={18} height={18} />,
};

// The closing band sits on bg-sidebar, where the shared terracotta ring is only 2.3:1 in light mode. White is 12:1 there
// and 16:1 on the lifted dark band (bg-sidebar alone is 1.03:1 against the dark page, so dark uses surface-elevated).
// The class is swapped, not appended: Tailwind orders by generated CSS, not by class order.
const CTA_BUTTON = PRIMARY_BUTTON.replace("focus-visible:outline-secondary-strong", "focus-visible:outline-white");

const FOOTER_LINK = `inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 text-sm text-text-muted no-underline transition-colors duration-150 hover:text-text-primary motion-reduce:transition-none ${FOCUS}`;

export function WhatItDoes() {
  return (
    <section id="what-it-does" aria-labelledby="what-it-does-title" className={LANDING_SECTION}>
      <Reveal>
        <h2 id="what-it-does-title" className="m-0 font-sans text-2xl font-semibold text-text-primary md:text-3xl">
          What Voyage does
        </h2>
      </Reveal>
      {/* role="list": list-style:none drops list semantics in Safari/VoiceOver. */}
      <RevealGroup as="ul" gap={0.07} role="list" aria-label="Features" className="m-0 mt-6 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <RevealItem as="li" key={feature.title} className="rounded-xl border border-border/15 bg-surface p-5">
            <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary/10 text-secondary-strong">
              {FEATURE_ICONS[feature.icon]}
            </span>
            <h3 className="m-0 mt-3 font-sans text-[15px] font-semibold text-text-primary">{feature.title}</h3>
            <p className="m-0 mt-1 text-sm leading-relaxed text-text-muted">{feature.body}</p>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

/** What Voyage is built on, service by service, in terms of what each gives the user (see BUILT_ON). */
export function BuiltOn() {
  return (
    <section id="built-on" aria-labelledby="built-on-title" className={LANDING_SECTION}>
      <Reveal>
        <h2 id="built-on-title" className="m-0 font-sans text-2xl font-semibold text-text-primary md:text-3xl">
          {BUILT_ON.title}
        </h2>
        <p className="m-0 mt-2 max-w-[60ch] text-base leading-relaxed text-text-muted">{BUILT_ON.body}</p>
      </Reveal>
      {BUILT_ON.groups.map((group) => (
        <div key={group.label} className="mt-6">
          <h3 className="m-0 font-sans text-[13px] font-semibold text-secondary-strong">{group.label}</h3>
          {/* One grid for both groups, so the two open-data tiles line up under the Google ones. */}
          <RevealGroup
            as="ul"
            gap={0.07}
            role="list"
            aria-label={group.label}
            className="m-0 mt-3 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4"
          >
            {group.services.map((service) => (
              // Laid out like the feature cards above (icon over text), four across like them.
              <RevealItem as="li" key={service.name} className="rounded-xl border border-border/15 bg-surface p-5">
                <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary/10 text-secondary-strong">
                  {SERVICE_ICONS[service.icon]}
                </span>
                <p className="m-0 mt-3 text-[15px] font-semibold text-text-primary">{service.name}</p>
                <p className="m-0 mt-1 text-sm leading-relaxed text-text-muted">{service.body}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      ))}
      <p className="m-0 mt-4 text-[12px] text-text-muted">{BUILT_ON.trademarks}</p>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-title" className={LANDING_SECTION}>
      <Reveal>
        <h2 id="how-it-works-title" className="m-0 font-sans text-2xl font-semibold text-text-primary md:text-3xl">
          How it works
        </h2>
      </Reveal>
      <RevealGroup as="ol" gap={0.12} role="list" aria-label="Steps" className="m-0 mt-6 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <RevealItem as="li" key={step.title}>
            {/* The list already numbers the steps for assistive tech, so the visible digit is hidden from it. */}
            <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-strong text-sm font-bold text-on-secondary-strong">
              {index + 1}
            </span>
            <h3 className="m-0 mt-3 font-sans text-[15px] font-semibold text-text-primary">{step.title}</h3>
            <p className="m-0 mt-1 text-sm leading-relaxed text-text-muted">{step.body}</p>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

export function ForAgencies() {
  return (
    <section id="for-agencies" aria-labelledby="for-agencies-title" className={LANDING_SECTION}>
      <Reveal>
        <h2 id="for-agencies-title" className="m-0 font-sans text-2xl font-semibold text-text-primary md:text-3xl">
          Built for agencies
        </h2>
      </Reveal>
      <RevealGroup gap={0.1} className="mt-6 grid gap-4 md:grid-cols-2">
        {AUDIENCES.map((audience) => (
          <RevealItem key={audience.title} className="rounded-xl border border-border/15 bg-surface p-6">
            <h3 className="m-0 font-sans text-lg font-semibold text-text-primary">{audience.title}</h3>
            <p className="m-0 mt-2 text-sm leading-relaxed text-text-muted">{audience.body}</p>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className={LANDING_SECTION}>
      <Reveal>
        <h2 id="faq-title" className="m-0 font-sans text-2xl font-semibold text-text-primary md:text-3xl">
          Questions
        </h2>
      </Reveal>
      <Reveal delay={0.08} className="mt-6 divide-y divide-border/15 rounded-xl border border-border/15 bg-surface">
        {FAQS.map((faq) => (
          <details
            key={faq.question}
            className="group [&:first-child>summary]:rounded-t-xl [&:last-child:not([open])>summary]:rounded-b-xl"
          >
            {/* Padding lives on the summary so the inset focus ring has room around the text. Middle rows are square, so
                their hover fill meets the straight dividers cleanly; only the first and last rows follow the container's corners
                (the last one only while closed, since its answer sits below it when open). */}
            <summary
              className={`flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-none px-5 text-[15px] font-semibold text-text-primary transition-colors duration-150 hover:bg-secondary/[0.06] motion-reduce:transition-none [&::-webkit-details-marker]:hidden ${FOCUS_INSET}`}
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
      </Reveal>
    </section>
  );
}

export function FinalCta({ onStartPlanning }) {
  return (
    <section className="w-full bg-sidebar px-4 py-20 dark:border-y dark:border-border/40 dark:bg-surface-elevated md:py-24">
      <RevealGroup gap={0.1} className="mx-auto flex max-w-[1220px] flex-col items-center gap-5 text-center">
        <RevealItem>
          <h2 id="final-cta-title" className="m-0 font-sans text-2xl font-semibold text-white md:text-3xl">
            {FINAL_CTA.title}
          </h2>
        </RevealItem>
        <RevealItem as="p" className="m-0 max-w-[48ch] text-base leading-relaxed text-white/75">{FINAL_CTA.body}</RevealItem>
        <RevealItem>
          <button type="button" onClick={onStartPlanning} className={CTA_BUTTON}>
            Start planning
            <ArrowRightIcon width={16} height={16} aria-hidden="true" />
          </button>
        </RevealItem>
      </RevealGroup>
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
