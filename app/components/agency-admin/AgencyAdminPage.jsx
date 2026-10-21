// app/components/agency-admin/AgencyAdminPage.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import AdminTopBar from "../admin/AdminTopBar.jsx";
import SegmentedControl from "../admin/SegmentedControl.jsx";
import AgencyDetailsForm from "../settings/AgencyDetailsForm.jsx";
import DangerZoneCard from "../settings/DangerZoneCard.jsx";
import PlanUsageCard from "../settings/PlanUsageCard.jsx";
import { Panel } from "../settings/settingsFields.jsx";
import TeamPage from "../team/TeamPage.jsx";
import AgencyOverview from "./AgencyOverview.jsx";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "team", label: "Team" },
  { id: "profile", label: "Profile" },
  // GET /plan-usage is owner-only on the server.
  { id: "plan", label: "Plan and usage", ownerOnly: true },
];

/**
 * The Agency tab: where an agency's owner and admins run it. Same top bar and
 * section tabs as the platform Admin page; the sections reuse the Settings pieces.
 */
export default function AgencyAdminPage({ agency, membership, onUpdateAgency, initialSection = "overview", onInitialSectionHandled }) {
  const isOwner = membership?.role === "OWNER";
  const sections = SECTIONS.filter((item) => !item.ownerOnly || isOwner);
  const [section, setSection] = useState(() => (sections.some((item) => item.id === initialSection) ? initialSection : "overview"));

  // The deep link that picked the first section is spent once it has opened.
  useEffect(() => {
    if (initialSection !== "overview") onInitialSectionHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A section the viewer can no longer see (e.g. after a role change) falls back to Overview.
  const active = sections.find((item) => item.id === section) ?? sections[0];

  // Opening a section from an Overview link unmounts the Overview and the focused link with it,
  // which drops focus to <body>. Hand it to the new section's panel instead. A tab click never
  // sets this: focus stays on the tab, as the tablist pattern expects.
  const panelRef = useRef(null);
  const focusPanelAfterOpen = useRef(false);
  useEffect(() => {
    if (!focusPanelAfterOpen.current) return;
    focusPanelAfterOpen.current = false;
    panelRef.current?.focus();
  }, [active.id]);

  function openFromTab(id) {
    focusPanelAfterOpen.current = false;
    setSection(id);
  }

  function openFromOverview(id) {
    focusPanelAfterOpen.current = id !== active.id && sections.some((item) => item.id === id);
    setSection(id);
  }

  const tabs = (
    <SegmentedControl
      as="tab"
      ariaLabel="Agency sections"
      value={active.id}
      onChange={openFromTab}
      options={sections.map((item) => ({ value: item.id, label: item.label }))}
    />
  );

  return (
    <div
      data-testid="agency-admin-page"
      className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:px-5 lg:px-6"
    >
      <AdminTopBar title={agency.name} tabs={tabs} />
      <div
        ref={panelRef}
        role="tabpanel"
        tabIndex={-1}
        aria-label={active.label}
        className="flex flex-col gap-4 rounded-[24px] pb-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
      >
        {active.id === "overview" ? (
          <AgencyOverview agency={agency} membership={membership} onOpenSection={openFromOverview} />
        ) : null}

        {active.id === "team" ? (
          <section className="rounded-[24px] border border-border bg-surface/95 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
            <TeamPage agencyId={agency.id} embedded />
          </section>
        ) : null}

        {active.id === "profile" ? (
          <>
            <Panel
              eyebrow="Workspace"
              title="Agency details"
              description="The shared agency profile that powers the dashboard and itinerary flows."
            >
              <AgencyDetailsForm agency={agency} membership={membership} onUpdateAgency={onUpdateAgency} />
            </Panel>
            {isOwner ? <DangerZoneCard agencyId={agency.id} agencyName={agency.name ?? ""} /> : null}
          </>
        ) : null}

        {active.id === "plan" ? (
          <Panel
            eyebrow="Plan"
            title="Plan and usage"
            description="What Voyage would cost your agency, based on this month's real use."
          >
            <PlanUsageCard key={agency.id} agencyId={agency.id} />
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
