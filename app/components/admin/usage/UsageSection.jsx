"use client";
import { useEffect, useState, useCallback } from "react";
import { fetchUsage } from "../../../lib/api/admin.js";
import SegmentedControl from "../SegmentedControl.jsx";
import UsageStatCards from "./UsageStatCards.jsx";
import UsageBarChart from "./UsageBarChart.jsx";
import UsageTable from "./UsageTable.jsx";

const PERIODS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];
const GROUPS = [
  { value: "user", label: "By user" },
  { value: "agency", label: "By agency" },
];

export default function UsageSection() {
  const [period, setPeriod] = useState("day");
  const [groupBy, setGroupBy] = useState("user");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchUsage({ period, groupBy }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [period, groupBy]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl as="radio" size="sm" ariaLabel="Time period" value={period} onChange={setPeriod} options={PERIODS} />
        <SegmentedControl as="radio" size="sm" ariaLabel="Group by" value={groupBy} onChange={setGroupBy} options={GROUPS} />
      </div>
      {loading && <div className="py-16 text-center text-sm text-text-muted">Loading usage…</div>}
      {error && <div className="rounded-sm bg-status-danger/8 p-4 text-center text-sm text-status-danger">{error}</div>}
      {!loading && !error && data && (
        <>
          <UsageStatCards totals={data.totals} series={data.series} />
          <UsageBarChart series={data.series} metric="totalTokens" />
          <UsageTable rows={data.rows} />
        </>
      )}
    </div>
  );
}
