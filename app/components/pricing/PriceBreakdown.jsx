"use client";

import { PLANS, RUNNING_COSTS, formatPeso, planCosting } from "../../lib/pricing/plans.js";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-strong";

/** The "How prices are set" button. The parent owns `open` so it can place the button and the breakdown apart. */
export function PriceBreakdownToggle({ open, onToggle, controls, className = "" }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
      className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-pill border-0 bg-transparent px-3 text-sm font-semibold text-text-muted transition-colors duration-150 hover:text-text-primary motion-reduce:transition-none ${FOCUS} ${className}`}
    >
      How prices are set
      {/* Drawn here, not from icons/index.js, which the test runner can't load (it is JSX in a .js file). */}
      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`transition-transform duration-150 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

const costings = PLANS.map((plan) => ({ plan, ...planCosting(plan) }));

function Row({ label, values, strong = false, divider = false }) {
  const cell = `py-1.5 ${divider ? "border-t border-border" : ""}`;
  return (
    <tr className={strong ? "font-semibold text-text-primary" : "text-text-muted"}>
      <th scope="row" className={`${cell} pr-3 text-left ${strong ? "font-semibold" : "font-normal"}`}>{label}</th>
      {values.map((value, index) => (
        <td key={PLANS[index].id} className={`${cell} pl-3 text-right tabular-nums`}>{formatPeso(value)}</td>
      ))}
    </tr>
  );
}

/**
 * What each plan costs Voyage to run for one agency at its full allowance, and the profit left over.
 * `onSurface` for a page background (the landing page), so it reads as a card like the plan cards beside it.
 */
export function PriceBreakdown({ id, onSurface = false, className = "" }) {
  const box = onSurface ? "border border-border/15 bg-surface" : "bg-background";
  return (
    <div id={id} className={`rounded-xl p-4 text-sm md:p-5 ${box} ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <caption className="pb-2 text-left font-semibold text-text-primary">
            What one agency costs Voyage each month, at the plan&apos;s full allowance
          </caption>
          <thead>
            <tr className="text-text-muted">
              <td />
              {PLANS.map((plan) => (
                <th key={plan.id} scope="col" className="pb-1.5 pl-3 text-right font-semibold">{plan.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RUNNING_COSTS.map((cost) => (
              <Row key={cost.id} label={cost.label} values={costings.map(() => cost.amount)} />
            ))}
            <Row label="AI and Google Maps use" values={costings.map((c) => c.usage)} />
            <Row label="Total cost" values={costings.map((c) => c.total)} strong divider />
            <Row label="Price" values={costings.map((c) => c.plan.monthlyPrice)} />
            <Row label="Profit" values={costings.map((c) => c.profit)} strong />
          </tbody>
        </table>
      </div>
      <p className="m-0 mt-3 leading-relaxed text-text-muted">
        Email (Resend) and web search (Serper) run on free plans. AI and Google Maps use includes a 10% allowance for
        retries; Google Maps is free up to its monthly allowance, so Starter pays nothing for it. Pesos at ₱61 to US$1.
        Every extra agency shares the same server bill, so profit grows as agencies join.
      </p>
    </div>
  );
}
