"use client";

import { useEffect, useState } from "react";
import { fetchPlanUsage } from "../../lib/api/agency.js";
import { PLANS, formatPeso, suggestPlan } from "../../lib/pricing/plans.js";

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-background px-4 py-3">
      <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-text-soft">{label}</p>
      <p className="m-0 mt-1 text-2xl font-semibold text-text-primary">{value}</p>
    </div>
  );
}

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

  if (state.status === "loading") {
    return <p role="status" className="m-0 text-sm text-text-soft">Loading this month's usage…</p>;
  }
  if (state.status === "error" || !state.usage) {
    return <p role="status" className="m-0 text-sm text-text-soft">Couldn't load this month's usage. Try again later.</p>;
  }

  const { itinerariesCreated, agentRequests, activeMembers } = state.usage;
  const fit = suggestPlan({ itineraries: itinerariesCreated, members: activeMembers });

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-sm leading-6 text-text-soft">
        Voyage is free during the pilot; billing isn't switched on yet. Here is this month's use and the plan that would cover it.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Itineraries created" value={itinerariesCreated} />
        <Stat label="Agent requests" value={agentRequests} />
        <Stat label="Team members" value={activeMembers} />
      </div>
      <p className="m-0 text-sm font-semibold text-text-primary">
        {fit
          ? `At this month's usage, ${fit.name} (${formatPeso(fit.monthlyPrice)} a month) covers you.`
          : "This month's usage is above every plan. Contact us for a custom plan."}
      </p>
      <ul aria-label="Plans" className="m-0 grid list-none gap-2 p-0 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isFit = fit?.id === plan.id;
          return (
            <li
              key={plan.id}
              aria-current={isFit ? "true" : undefined}
              className={`rounded-2xl border px-3.5 py-3 text-sm ${isFit ? "border-secondary bg-secondary/8" : "border-border bg-background"}`}
            >
              <p className="m-0 font-semibold text-text-primary">
                {plan.name} · {formatPeso(plan.monthlyPrice)} a month
              </p>
              <p className="m-0 mt-1 text-text-soft">
                Up to {plan.teamMembers} team members, {plan.itinerariesPerMonth} new itineraries a month
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
