// app/components/agency-admin/AgencyOverview.jsx
"use client";

import { useEffect, useState } from "react";
import { fetchPlanUsage, fetchTeam, listAgencyInvitations } from "../../lib/api/index.js";
import { agencyStatusLabel, buildAttentionItems } from "../../lib/agency-admin/overview.js";
import { suggestPlan } from "../../lib/pricing/plans.js";
import { getStatusClass } from "../settings/settingsFields.jsx";

const CARD = "rounded-[24px] border border-border bg-surface/95 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]";
const LOADING_MESSAGE = "Loading your agency overview…";
const ERROR_MESSAGE = "Couldn't load your agency overview. Try again later.";

function Tile({ label, value }) {
  return (
    <li className="rounded-2xl border border-border bg-background px-4 py-3">
      <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">{label}</p>
      <p className="m-0 mt-1 text-2xl font-semibold text-text-primary">{value}</p>
    </li>
  );
}

/**
 * The Agency tab's landing section: is the agency OK, its numbers this month, and
 * what needs fixing. Owners also get plan usage (the endpoint is owner-only).
 */
export default function AgencyOverview({ agency, membership, onOpenSection }) {
  const isOwner = membership?.role === "OWNER";
  const [state, setState] = useState({ status: "loading", members: [], invitations: [], usage: null });

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      fetchTeam(agency.id),
      listAgencyInvitations(agency.id),
      isOwner ? fetchPlanUsage(agency.id) : Promise.resolve(null),
    ]).then(([team, invitations, usage]) => {
      if (cancelled) return;
      if (team.status !== "fulfilled") {
        setState({ status: "error", members: [], invitations: [], usage: null });
        return;
      }
      setState({
        status: "ready",
        members: team.value?.members ?? [],
        // An invitations or usage failure only drops its rows and tiles.
        invitations: invitations.status === "fulfilled" ? invitations.value?.invitations ?? [] : [],
        usage: usage.status === "fulfilled" ? usage.value?.usage ?? null : null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [agency.id, isOwner]);

  // Same live-region pattern as PlanUsageCard: one status element for the section's life.
  const statusMessage = state.status === "loading" ? LOADING_MESSAGE : state.status === "error" ? ERROR_MESSAGE : "";

  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="m-0 text-sm text-text-muted empty:hidden">{statusMessage}</p>
      {state.status === "ready" ? <OverviewBody agency={agency} isOwner={isOwner} onOpenSection={onOpenSection} {...state} /> : null}
    </div>
  );
}

function OverviewBody({ agency, isOwner, members, invitations, usage, onOpenSection }) {
  const owner = members.find((member) => member.role === "OWNER");
  const fit = usage ? suggestPlan({ itineraries: usage.itinerariesCreated, members: usage.activeMembers }) : null;
  const items = buildAttentionItems({ agency, invitations, usage, isOwner });

  return (
    <>
      <section aria-labelledby="agency-overview-status" className={CARD}>
        <h2 id="agency-overview-status" className="m-0 font-sans text-[15px] font-semibold tracking-normal text-text-primary">Status</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center rounded-pill border px-3 py-1 text-xs font-semibold ${getStatusClass(agency.status)}`}>
            {agencyStatusLabel(agency.status)}
          </span>
          {owner ? <span className="text-sm text-text-muted">Owner: {owner.user?.displayName}</span> : null}
        </div>
      </section>

      <ul role="list" aria-label="Agency numbers" className="m-0 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-4">
        <Tile label="Team members" value={members.length} />
        {isOwner && usage ? (
          <>
            <Tile label="Itineraries this month" value={usage.itinerariesCreated} />
            <Tile label="Messages to the agent" value={usage.agentRequests} />
            <Tile label="Plan that fits" value={fit?.name ?? "Custom"} />
          </>
        ) : (
          <Tile label="Pending invitations" value={invitations.length} />
        )}
      </ul>

      <section aria-labelledby="agency-overview-attention" className={CARD}>
        <h2 id="agency-overview-attention" className="m-0 font-sans text-[15px] font-semibold tracking-normal text-text-primary">Needs attention</h2>
        {items.length === 0 ? (
          <p className="m-0 mt-2 text-sm text-text-muted">Nothing needs your attention right now.</p>
        ) : (
          <ul role="list" aria-label="Needs attention" className="m-0 mt-2 list-none p-0">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3 first:border-t-0">
                <span className="text-sm text-text-primary">{item.text}</span>
                <button
                  type="button"
                  onClick={() => onOpenSection?.(item.section)}
                  className="min-h-11 rounded-pill border border-border bg-background px-4 text-sm font-semibold text-text-primary transition hover:border-secondary hover:text-secondary"
                >
                  {item.action}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
