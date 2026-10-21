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
const PARTIAL_MESSAGE = "Some numbers couldn't load. Try again later.";
const ALL_CLEAR_MESSAGE = "Nothing needs your attention right now.";
const UNCHECKED_MESSAGE = "Couldn't check everything right now.";
// What a tile shows when its number couldn't be loaded. Never 0: that would read as a real count.
const UNKNOWN = "—";

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
  const [state, setState] = useState({ status: "loading", members: [], invitations: null, usage: null });

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      fetchTeam(agency.id),
      listAgencyInvitations(agency.id),
      isOwner ? fetchPlanUsage(agency.id) : Promise.resolve(null),
    ]).then(([team, invitations, usage]) => {
      if (cancelled) return;
      if (team.status !== "fulfilled") {
        setState({ status: "error", members: [], invitations: null, usage: null });
        return;
      }
      setState({
        status: "ready",
        members: team.value?.members ?? [],
        // A failed invitations or usage fetch leaves null, not an empty value. The tile then shows
        // a dash and the attention list won't call the agency all clear, instead of reporting 0.
        invitations: invitations.status === "fulfilled" ? invitations.value?.invitations ?? [] : null,
        usage: isOwner && usage.status === "fulfilled" ? usage.value?.usage ?? null : null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [agency.id, isOwner]);

  // Same live-region pattern as PlanUsageCard: one status element for the section's life.
  const statusMessage = state.status === "loading" ? LOADING_MESSAGE : state.status === "error" ? ERROR_MESSAGE : "";
  const owner = state.members.find((member) => member.role === "OWNER");
  const ownerLabel = owner?.user?.displayName?.trim() || owner?.user?.email?.trim() || "";

  return (
    <div className="flex flex-col gap-4">
      {/* The Status card needs only the agency prop, so it stays when the team failed to load. */}
      {state.status === "loading" ? null : <StatusCard agency={agency} ownerLabel={ownerLabel} />}
      <p role="status" className="m-0 text-sm text-text-muted empty:hidden">{statusMessage}</p>
      {state.status === "ready" ? <OverviewBody agency={agency} isOwner={isOwner} onOpenSection={onOpenSection} {...state} /> : null}
    </div>
  );
}

function StatusCard({ agency, ownerLabel }) {
  return (
    <section aria-labelledby="agency-overview-status" className={CARD}>
      <h2 id="agency-overview-status" className="m-0 font-sans text-[15px] font-semibold tracking-normal text-text-primary">Status</h2>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center rounded-pill border px-3 py-1 text-xs font-semibold ${getStatusClass(agency.status)}`}>
          {agencyStatusLabel(agency.status)}
        </span>
        {ownerLabel ? <span className="text-sm text-text-muted">{`Owner: ${ownerLabel}`}</span> : null}
      </div>
    </section>
  );
}

function OverviewBody({ agency, isOwner, members, invitations, usage, onOpenSection }) {
  // Owners keep the owner tiles and admins the admin tile whatever failed; a tile whose data is null shows a dash.
  const invitationsFailed = invitations === null;
  const usageFailed = isOwner && usage === null;
  const anyFailed = invitationsFailed || usageFailed;
  const fit = usage ? suggestPlan({ itineraries: usage.itinerariesCreated, members: usage.activeMembers }) : null;
  const items = buildAttentionItems({ agency, invitations: invitations ?? [], usage, isOwner });

  return (
    <>
      <ul role="list" aria-label="Agency numbers" className="m-0 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-4">
        <Tile label="Team members" value={members.length} />
        {isOwner ? (
          <>
            <Tile label="Itineraries this month" value={usage ? usage.itinerariesCreated : UNKNOWN} />
            <Tile label="Messages to the agent" value={usage ? usage.agentRequests : UNKNOWN} />
            <Tile label="Plan that fits" value={usage ? fit?.name ?? "Custom" : UNKNOWN} />
          </>
        ) : (
          <Tile label="Pending invitations" value={invitationsFailed ? UNKNOWN : invitations.length} />
        )}
      </ul>
      {anyFailed ? <p className="m-0 text-sm text-text-muted">{PARTIAL_MESSAGE}</p> : null}

      <section aria-labelledby="agency-overview-attention" className={CARD}>
        <h2 id="agency-overview-attention" className="m-0 font-sans text-[15px] font-semibold tracking-normal text-text-primary">Needs attention</h2>
        {items.length === 0 ? (
          <p className="m-0 mt-2 text-sm text-text-muted">{anyFailed ? UNCHECKED_MESSAGE : ALL_CLEAR_MESSAGE}</p>
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
