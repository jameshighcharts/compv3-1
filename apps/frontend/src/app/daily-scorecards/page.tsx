import {
  getRevenuePayload,
  getScorecardTodaySummaryPayload,
  resolveRevenueWindow,
} from "@backend/domains/sales";
import {
  DEFAULT_REVENUE_CUSTOMER_CHANNEL,
  DEFAULT_REVENUE_RANGE,
  DEFAULT_REVENUE_SALES_CHANNEL,
  type SfRevenueResponse,
  type SfTodaySummaryResponse,
} from "@contracts/sales";

import { DailyScorecardsView } from "@/domains/scorecards/screen";

export const dynamic = "force-dynamic";

async function loadInitialRevenueData(): Promise<SfRevenueResponse | null> {
  try {
    const window = resolveRevenueWindow({ range: DEFAULT_REVENUE_RANGE });
    const { payload } = await getRevenuePayload(window, {
      customerChannel: DEFAULT_REVENUE_CUSTOMER_CHANNEL,
      salesChannel: DEFAULT_REVENUE_SALES_CHANNEL,
    });

    return payload;
  } catch (error) {
    console.error("Failed to preload daily scorecard revenue data.", error);
    return null;
  }
}

async function loadInitialTodaySummaryData(): Promise<SfTodaySummaryResponse | null> {
  try {
    const { payload } = await getScorecardTodaySummaryPayload();

    return payload;
  } catch (error) {
    console.error("Failed to preload daily scorecard today summary data.", error);
    return null;
  }
}

export default async function DailyScorecardsPage() {
  const [initialRevenueData, initialTodaySummaryData] = await Promise.all([
    loadInitialRevenueData(),
    loadInitialTodaySummaryData(),
  ]);

  return (
    <DailyScorecardsView
      initialRevenueData={initialRevenueData}
      initialTodaySummaryData={initialTodaySummaryData}
    />
  );
}
