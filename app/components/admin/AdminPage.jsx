"use client";

import { useState } from "react";
import AdminAgenciesPage from "./AdminAgenciesPage.jsx";
import UsageSection from "./usage/UsageSection.jsx";
import ReportsSection from "./reports/ReportsSection.jsx";
import AdminTopBar from "./AdminTopBar.jsx";
import SegmentedControl from "./SegmentedControl.jsx";

const SECTIONS = [
  { id: "agencies", label: "Agencies", title: "Agencies" },
  { id: "usage", label: "Usage", title: "Usage" },
  { id: "reports", label: "Reports", title: "Reports" },
];

export default function AdminPage({ onPendingCountChange, reportsBadge = 0 }) {
  const [section, setSection] = useState("agencies");
  const [badge, setBadge] = useState(reportsBadge);

  const tabs = (
    <SegmentedControl
      as="tab"
      ariaLabel="Admin sections"
      value={section}
      onChange={setSection}
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
        {section === "usage" && <UsageSection />}
        {section === "reports" && <ReportsSection onBadgeChange={setBadge} />}
      </div>
    </div>
  );
}
