"use client";

import { useState } from "react";
import AdminAgenciesPage from "./AdminAgenciesPage.jsx";
import AdminAccountsPage from "./AdminAccountsPage.jsx";
import UsageSection from "./usage/UsageSection.jsx";
import ReportsSection from "./reports/ReportsSection.jsx";
import AdminTopBar from "./AdminTopBar.jsx";
import SegmentedControl from "./SegmentedControl.jsx";

const SECTIONS = [
  { id: "agencies", label: "Agencies", title: "Agencies" },
  { id: "accounts", label: "Accounts", title: "Accounts" },
  { id: "usage", label: "Usage", title: "Usage" },
  { id: "reports", label: "Reports", title: "Reports" },
];

export default function AdminPage({ onPendingCountChange, reportsBadge = 0 }) {
  const [section, setSection] = useState("agencies");
  const [badge, setBadge] = useState(reportsBadge);
  // The person the account panel sent us to Usage for ({ id, label }), or null for the plain tab.
  const [usageFocus, setUsageFocus] = useState(null);

  const openUsageFor = (selection) => {
    setUsageFocus(selection);
    setSection("usage");
  };

  // Picking a different tab by hand ends the visit: Usage reopens plain next time. Clicking the tab
  // the admin is already on changes nothing, so it cannot close the person they were just sent to.
  const changeSection = (next) => {
    if (next === section) return;
    setUsageFocus(null);
    setSection(next);
  };

  const tabs = (
    <SegmentedControl
      as="tab"
      ariaLabel="Admin sections"
      value={section}
      onChange={changeSection}
      options={SECTIONS.map((s) => ({
        value: s.id,
        label: s.label,
        badge: s.id === "reports" ? badge : 0,
      }))}
    />
  );
  const active = SECTIONS.find((s) => s.id === section);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:px-5 lg:px-6">
      <AdminTopBar title={active?.title} tabs={tabs} />
      <div className="flex min-h-0 flex-1 flex-col">
        {section === "agencies" && <AdminAgenciesPage onPendingCountChange={onPendingCountChange} />}
        {section === "accounts" && <AdminAccountsPage onOpenUsage={openUsageFor} />}
        {section === "usage" && <UsageSection key={usageFocus?.id ?? "all"} initialSelection={usageFocus} />}
        {section === "reports" && <ReportsSection onBadgeChange={setBadge} />}
      </div>
    </div>
  );
}
