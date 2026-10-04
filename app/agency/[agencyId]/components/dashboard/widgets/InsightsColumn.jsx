"use client";

import { useId } from "react";
import FunnelChart from "./FunnelChart";
import KpiTile from "./KpiTile";
import PeriodSwitcher from "./PeriodSwitcher";
import RatingsPanel from "./RatingsPanel";
import RecentlyViewedPanel from "./RecentlyViewedPanel";

const PERIOD_DAYS = { "7d": 7, "30d": 30, "90d": 90 };
const formatOneDecimal = (value) => value.toFixed(1);

/** "3 of 10 rated": how many shared itineraries the average rating rests on. */
function formatRatedCount(kpi) {
  const { rated, total } = kpi?.responseRate ?? {};
  if (rated == null || !total) return undefined;
  return `${rated} of ${total} rated`;
}

/**
 * The owner dashboard's right column: period switcher, four KPI tiles, trip
 * progress, the recently viewed itineraries and the latest reviews. The period
 * label follows the payload (not the switcher), which runs ahead of the data
 * while a refetch is in flight. Recently viewed ignores the period, and is
 * left out when the payload has no `recentViews` (an older server).
 */
export default function InsightsColumn({ data, period, onPeriodChange, isFetching = false, agencyId, onOpenViewedTrip }) {
  const headingId = useId();
  const kpis = data?.kpis ?? {};
  const periodDays = PERIOD_DAYS[data?.period ?? period] ?? 30;
  const periodLabel = `Last ${periodDays} days`;

  return (
    <aside aria-labelledby={headingId} className="frame-tile flex min-w-0 flex-col gap-4 self-start rounded-[20px] p-4">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 id={headingId} className="font-sans text-[15px] font-semibold tracking-normal text-text-primary">
            Insights
          </h2>
          <PeriodSwitcher value={period} onChange={onPeriodChange} disabled={isFetching} />
        </div>
        <p className="mt-1 text-[12px] text-text-muted">
          {periodLabel}, compared with the {periodDays} days before
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <KpiTile
          label="Win rate"
          value={kpis.winRate?.value ?? null}
          unit="%"
          deltaVsPrior={kpis.winRate?.deltaVsPrior ?? null}
          formatValue={formatOneDecimal}
          description="Approved trips out of all approved and archived trips"
        />
        <KpiTile
          label="Time to share"
          value={kpis.timeToFirstShareDays?.value ?? null}
          unit="days"
          deltaVsPrior={kpis.timeToFirstShareDays?.deltaVsPrior ?? null}
          formatValue={formatOneDecimal}
          description="Average days from a new trip to sharing its first itinerary"
          lowerIsBetter
        />
        <KpiTile
          label="Time to reply"
          value={kpis.medianCommentResponseHours?.value ?? null}
          unit="h"
          deltaVsPrior={kpis.medianCommentResponseHours?.deltaVsPrior ?? null}
          formatValue={formatOneDecimal}
          description="Typical time your team takes to answer a client comment"
          lowerIsBetter
        />
        <KpiTile
          label="Client rating"
          value={kpis.avgProposalRating?.value ?? null}
          unit="★"
          deltaVsPrior={kpis.avgProposalRating?.deltaVsPrior ?? null}
          formatValue={formatOneDecimal}
          subtitle={formatRatedCount(kpis.avgProposalRating)}
          description="Average stars clients gave your shared itineraries"
        />
      </div>

      {data?.funnel?.stages?.length > 0 ? (
        <FunnelChart stages={data.funnel.stages} agencyId={agencyId} periodLabel={periodLabel} />
      ) : null}

      {Array.isArray(data?.recentViews) ? (
        <RecentlyViewedPanel views={data.recentViews} onOpenTrip={onOpenViewedTrip} />
      ) : null}

      <RatingsPanel reviews={data?.recentReviews ?? []} />
    </aside>
  );
}
