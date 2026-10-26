"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchUsage } from "../../../lib/api/admin.js";
import Button from "../../ui/Button.jsx";
import SegmentedControl from "../SegmentedControl.jsx";
import DetailPane from "../DetailPane.jsx";
import UsageStatCards from "./UsageStatCards.jsx";
import UsageBarChart from "./UsageBarChart.jsx";
import UsageTable from "./UsageTable.jsx";
import UsageDrillIn from "./UsageDrillIn.jsx";
import { GROUP_OPTIONS, RANGE_OPTIONS } from "./usageFormat.js";

const METRIC_OPTIONS = [
  { value: "costUsd", label: "Cost" },
  { value: "totalTokens", label: "Tokens" },
  { value: "runCount", label: "Runs" },
];

const labelOf = (options, value) => options.find((o) => o.value === value)?.label ?? value;

// The metered-since instant is a UTC moment, like the chart's day buckets.
const fmtDay = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** A segmented control that scrolls sideways instead of overflowing a phone-width screen. */
function ScrollX({ children }) {
  return <div className="max-w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>;
}

/**
 * @param {{ id: string, label: string } | null} [initialSelection] open a user's drill-in on arrival
 * @param {(row, groupBy, reload) => React.ReactNode} [renderRowActions] extra buttons in the drill-in (Part 3)
 */
export default function UsageSection({ initialSelection = null, renderRowActions }) {
  const [range, setRange] = useState("this_month");
  const [groupBy, setGroupBy] = useState("user");
  const [metric, setMetric] = useState("costUsd");
  // The latest response together with the query that produced it. While a new query loads, the old
  // response stays on screen, but its rows belong to the OLD grouping and must not be offered as the new one's.
  const [loaded, setLoaded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(
    initialSelection ? { drillable: true, runCount: 0, failedRunCount: 0, totalTokens: 0, costUsd: 0, ...initialSelection } : null
  );

  const latestRequest = useRef(0);
  const tableWrap = useRef(null);
  const trigger = useRef(null);
  const breakdownHeading = useRef(null);

  const load = useCallback(async () => {
    const id = ++latestRequest.current;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchUsage({ range, groupBy });
      if (id === latestRequest.current) setLoaded({ data: next, range, groupBy });
    } catch (e) {
      if (id === latestRequest.current) setError(e?.message || "Couldn't load usage.");
    } finally {
      if (id === latestRequest.current) setLoading(false);
    }
  }, [range, groupBy]);

  useEffect(() => {
    load();
    // Changing the query (or leaving the tab) retires any request still in flight, so a slow old
    // response can never overwrite a newer one.
    return () => {
      latestRequest.current += 1;
    };
  }, [load]);

  const changeGroup = (next) => {
    setSelected(null);
    setGroupBy(next);
  };

  const selectRow = (row) => {
    // Remember which table button opened the pane so closing it can hand focus back there.
    const active = document.activeElement;
    trigger.current = tableWrap.current?.contains(active) ? active : null;
    setSelected(row);
  };

  // Where focus goes when the pane closes: the table button that opened it; failing that (it was opened from
  // the account panel, or by a click in a browser that does not focus buttons) the open row's button; failing
  // that (the row has no usage in this range) the Breakdown heading. Never nowhere, which drops it to the page.
  const closePane = useCallback(() => {
    const opener = trigger.current;
    trigger.current = null;
    let landed = false;
    if (opener?.isConnected) {
      opener.focus();
      landed = true;
    } else {
      // The table and the phone cards both carry the row; whichever one is hidden cannot take focus.
      for (const button of tableWrap.current?.querySelectorAll('button[aria-current="true"]') ?? []) {
        button.focus();
        if (document.activeElement === button) {
          landed = true;
          break;
        }
      }
    }
    if (!landed) breakdownHeading.current?.focus();
    setSelected(null);
  }, []);

  const data = loaded?.data;
  const rowsReady = loaded?.groupBy === groupBy;
  // The latest load answers the range and grouping on screen. Until it does (a range switch in flight, or
  // arriving from the account panel before the first load) the open row's figures are not this query's.
  const figuresReady = loaded?.range === range && rowsReady;
  // Once it does, the open row takes its figures from that load. A row with no usage in the range shows
  // zeros rather than another range's figures. Derived here, not copied into state by an effect, so the
  // pane never paints a frame of stale numbers between the load landing and the copy.
  const openRow =
    selected && figuresReady
      ? (data.rows.find((r) => r.id === selected.id) ?? { ...selected, runCount: 0, failedRunCount: 0, totalTokens: 0, costUsd: 0 })
      : selected;
  const startsBeforeMetering = Boolean(data?.meteredSince && data?.from && new Date(data.from) < new Date(data.meteredSince));

  const describeQuery = (r, g) => `${labelOf(RANGE_OPTIONS, r).toLowerCase()}, by ${labelOf(GROUP_OPTIONS, g).toLowerCase()}`;
  let announcement = "";
  if (!error && loading) announcement = `Loading usage for ${describeQuery(range, groupBy)}.`;
  else if (!error && loaded) {
    announcement = `Usage loaded: ${describeQuery(loaded.range, loaded.groupBy)}.${data.unpricedModels?.length ? " Warning: some models have no price." : ""}`;
  }

  return (
    <div className="flex min-h-0 flex-1 gap-4 lg:gap-5">
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
        <p role="status" className="sr-only">
          {announcement}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <ScrollX>
            <SegmentedControl as="radio" size="sm" ariaLabel="Date range" value={range} onChange={setRange} options={RANGE_OPTIONS} />
          </ScrollX>
          <ScrollX>
            <SegmentedControl as="radio" size="sm" ariaLabel="Chart shows" value={metric} onChange={setMetric} options={METRIC_OPTIONS} />
          </ScrollX>
        </div>

        {loading && !data && !error && <div className="py-16 text-center text-sm text-text-muted">Loading usage…</div>}
        {error && (
          <div role="alert" className="flex flex-col items-center gap-3 rounded-sm bg-status-danger/8 p-4 text-center text-sm text-status-danger">
            <span>{error}</span>
            <Button variant="secondary" size="md" onClick={load}>
              Try again
            </Button>
          </div>
        )}

        {data && !error && (
          <div aria-busy={loading} className={`flex flex-col gap-4 transition-opacity motion-reduce:transition-none ${loading ? "opacity-60" : ""}`}>
            {data.unpricedModels?.length > 0 && (
              <p className="rounded-sm border border-status-warning/25 bg-status-warning/8 p-3 text-sm text-text-primary">
                Cost is incomplete: some runs used models with no price ({data.unpricedModels.join(", ")}). Add them to the price list in vertex.ts.
              </p>
            )}
            {startsBeforeMetering && <p className="text-xs text-text-muted">Usage is recorded from {fmtDay(data.meteredSince)}. Earlier runs have no token data.</p>}

            <UsageStatCards
              totals={data.totals}
              previous={data.previous}
              projectedMonthEndCostUsd={data.projectedMonthEndCostUsd}
              series={data.series}
              costIncomplete={data.unpricedModels?.length > 0}
            />
            <UsageBarChart series={data.series} metric={metric} />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 ref={breakdownHeading} tabIndex={-1} className="font-sans text-xs font-semibold uppercase tracking-wider text-text-muted focus:outline-none">
                Breakdown
              </h2>
              <ScrollX>
                <SegmentedControl as="radio" size="sm" ariaLabel="Group by" value={groupBy} onChange={changeGroup} options={GROUP_OPTIONS} />
              </ScrollX>
            </div>
            <div ref={tableWrap}>
              {rowsReady ? (
                <UsageTable rows={data.rows} groupBy={loaded.groupBy} onSelect={selectRow} selectedId={selected?.id} />
              ) : (
                <div className="rounded-md border border-border/12 bg-surface-elevated p-8 text-center text-sm text-text-muted">Loading breakdown…</div>
              )}
            </div>
          </div>
        )}
      </div>

      {selected && (
        // Keyed by row so choosing another row while one is open hands focus to the new panel too.
        <DetailPane key={selected.id} open onClose={closePane} title={selected.label} ariaLabel={selected.label}>
          <UsageDrillIn row={openRow} groupBy={groupBy} range={range} figuresPending={!figuresReady} actions={renderRowActions?.(openRow, groupBy, load) ?? null} />
        </DetailPane>
      )}
    </div>
  );
}
