"use client";

import { FREE_TRIAL_DAYS, PLAN_INCLUDES, PLANS, formatPeso } from "../../lib/pricing/plans.js";
import { LANDING_SECTION, PRIMARY_BUTTON, SECONDARY_BUTTON } from "./landingClasses.js";
import { CountUp, Reveal, RevealGroup, RevealItem } from "./landingMotion.jsx";

const LIST = new Intl.ListFormat("en", { style: "long", type: "conjunction" });

/** Display-only prices. Every button starts the free trial through the normal sign-up. */
export default function PricingSection({ onStartPlanning }) {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className={LANDING_SECTION}>
      <Reveal>
        <h2 id="pricing-title" className="m-0 font-sans text-2xl font-semibold text-text-primary md:text-3xl">
          Pricing
        </h2>
      </Reveal>
      <Reveal as="p" delay={0.08} className="m-0 mt-2 max-w-2xl text-base leading-relaxed text-text-muted">
        One monthly price per agency, starting with a {FREE_TRIAL_DAYS}-day free trial. Every plan has the whole
        planner; plans differ only in team size and new itineraries a month.
      </Reveal>
      {/* role="list": list-style:none drops list semantics in Safari/VoiceOver. */}
      <RevealGroup as="ul" gap={0.1} role="list" aria-label="Plans" className="m-0 mt-6 grid list-none gap-4 p-0 md:grid-cols-3">
        {PLANS.map((plan) => (
          <RevealItem
            as="li"
            key={plan.id}
            className={`flex flex-col rounded-xl border bg-surface p-6 ${plan.featured ? "border-secondary-strong" : "border-border/15"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="m-0 font-sans text-lg font-semibold text-text-primary">{plan.name}</h3>
              {plan.featured ? (
                <span className="rounded-pill bg-secondary/10 px-2.5 py-0.5 text-xs font-semibold text-secondary-strong">
                  Most agencies
                </span>
              ) : null}
            </div>
            <p className="m-0 mt-1 text-sm text-text-muted">{plan.summary}</p>
            <p className="m-0 mt-4">
              <span className="text-3xl font-semibold text-text-primary">
                <CountUp value={plan.monthlyPrice} format={formatPeso} />
              </span>
              <span className="text-sm text-text-muted"> / month</span>
            </p>
            <ul role="list" className="m-0 mt-4 flex-1 list-none space-y-1.5 p-0 text-sm text-text-primary">
              <li>Up to {plan.teamMembers} team members</li>
              <li>{plan.itinerariesPerMonth} new itineraries a month</li>
            </ul>
            <button
              type="button"
              onClick={onStartPlanning}
              className={`mt-6 w-full ${plan.featured ? PRIMARY_BUTTON : SECONDARY_BUTTON}`}
            >
              Start free trial
            </button>
          </RevealItem>
        ))}
      </RevealGroup>
      <p className="m-0 mt-4 text-sm leading-relaxed text-text-muted">
        Every plan includes {LIST.format(PLAN_INCLUDES)}. Prices are in Philippine pesos. Voyage is free during the pilot; billing
        isn&apos;t switched on yet.
      </p>
    </section>
  );
}
