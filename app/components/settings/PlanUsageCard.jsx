"use client";

import { useEffect, useState } from "react";
import { fetchPlanUsage } from "../../lib/api/agency.js";
import { PLANS, formatPeso, suggestPlan } from "../../lib/pricing/plans.js";

const MONTH_NAME = new Intl.DateTimeFormat("en-PH", { month: "long", timeZone: "Asia/Manila" });

/** "So far this month (October)." from the period's start, or the plain sentence when the date is missing or invalid. */
function periodSentence(periodStart) {
  const start = periodStart ? new Date(periodStart) : null;
  if (!start || Number.isNaN(start.getTime())) return "So far this month.";
  return `So far this month (${MONTH_NAME.format(start)}).`;
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-background px-4 py-3">
      <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">{label}</p>
      <p className="m-0 mt-1 text-2xl font-semibold text-text-primary">{value}</p>
    </div>
  );
}

const LOADING_MESSAGE = "Loading this month's usage…";
const ERROR_MESSAGE = "Couldn't load this month's usage. Try again later.";

/** This month's usage next to the price list. Display only: the agency pays nothing during the pilot. */
export default function PlanUsageCard({ agencyId }) {
  const [state, setState] = useState({ status: "loading", usage: null });

  useEffect(() => {
    let cancelled = false;
    fetchPlanUsage(agencyId)
      .then((result) => {
        if (!cancelled) setState({ status: "ready", usage: result?.usage ?? null });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", usage: null });
      });
    return () => {
      cancelled = true;
    };
  }, [agencyId]);

  const usage = state.status === "ready" ? state.usage : null;
  // One status element stays mounted for the card's life. Screen readers announce a live region's
  // text changing, but often miss one that is swapped in already filled, so the loading and error
  // text go into this element and it stays empty once the numbers are showing.
  const statusMessage = state.status === "loading" ? LOADING_MESSAGE : usage ? "" : ERROR_MESSAGE;

  return (
    <div>
      <p role="status" className="m-0 text-sm text-text-muted">{statusMessage}</p>
      {usage ? <PlanUsageBody usage={usage} /> : null}
    </div>
  );
}

function PlanUsageBody({ usage }) {
  const { periodStart, itinerariesCreated, agentRequests, activeMembers } = usage;
  const fit = suggestPlan({ itineraries: itinerariesCreated, members: activeMembers });

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-sm leading-6 text-text-muted">
        Voyage is free during the pilot; billing isn't switched on yet. Below is what your agency has used and the plan that would cover it.
      </p>
      <div className="flex flex-col gap-2">
        <p className="m-0 text-sm font-semibold text-text-muted">{periodSentence(periodStart)}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Itineraries created" value={itinerariesCreated} />
          <Stat label="Messages to the agent" value={agentRequests} />
          <Stat label="Team members" value={activeMembers} />
        </div>
      </div>
      <p className="m-0 text-sm font-semibold text-text-primary">
        {fit
          ? `At this month's usage, ${fit.name} (${formatPeso(fit.monthlyPrice)} a month) covers you.`
          : "This month's usage is above every plan. Use Report a problem under Need help? to ask about a custom plan."}
      </p>
      <ul role="list" aria-label="Plans" className="m-0 grid list-none gap-2 p-0 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isFit = fit?.id === plan.id;
          // The fitting card's border is 2px, so its padding is 1px smaller and the content doesn't shift.
          return (
            <li
              key={plan.id}
              aria-current={isFit ? "true" : undefined}
              className={`rounded-2xl text-sm ${isFit ? "border-2 border-secondary bg-secondary/8 px-[13px] py-[11px]" : "border border-border bg-background px-3.5 py-3"}`}
            >
              <p className="m-0 font-semibold text-text-primary">
                {plan.name} · {formatPeso(plan.monthlyPrice)} a month
                {isFit ? <span className="ml-2 text-xs font-semibold text-secondary-strong">Fits this month</span> : null}
              </p>
              <p className="m-0 mt-1 text-text-muted">
                Up to {plan.teamMembers} team members, {plan.itinerariesPerMonth} new itineraries a month
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
