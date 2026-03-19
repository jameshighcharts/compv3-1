import { z } from "zod";

export const REVENUE_RANGE_VALUES = ["30d", "90d", "ytd", "12m"] as const;

export type RevenueRange = (typeof REVENUE_RANGE_VALUES)[number];

export const DEFAULT_REVENUE_RANGE: RevenueRange = "12m";

export const REVENUE_RANGE_LABELS: Record<RevenueRange, string> = {
  "30d": "30D",
  "90d": "90D",
  ytd: "YTD",
  "12m": "12M",
};

export const REVENUE_CUSTOMER_CHANNEL_VALUES = [
  "all",
  "Direct Sales",
  "Channel Partner Sales",
] as const;

export type RevenueCustomerChannel = (typeof REVENUE_CUSTOMER_CHANNEL_VALUES)[number];

export const DEFAULT_REVENUE_CUSTOMER_CHANNEL: RevenueCustomerChannel = "all";

export const REVENUE_CUSTOMER_CHANNEL_LABELS: Record<RevenueCustomerChannel, string> = {
  all: "All Customer Channels",
  "Direct Sales": "Direct Sales",
  "Channel Partner Sales": "Channel Partner Sales",
};

export const REVENUE_SALES_CHANNEL_VALUES = [
  "all",
  "Assisted",
  "Self-care",
  "Assisted Self-service",
] as const;

export type RevenueSalesChannel = (typeof REVENUE_SALES_CHANNEL_VALUES)[number];

export const DEFAULT_REVENUE_SALES_CHANNEL: RevenueSalesChannel = "all";

export const REVENUE_SALES_CHANNEL_LABELS: Record<RevenueSalesChannel, string> = {
  all: "All Sales Channels",
  Assisted: "Assisted",
  "Self-care": "Self-care",
  "Assisted Self-service": "Assisted Self-service",
};

export const SCORECARD_MAP_INTERVAL_VALUES = ["mtd", "ytd", "12m"] as const;

export type ScorecardMapInterval = (typeof SCORECARD_MAP_INTERVAL_VALUES)[number];

export const DEFAULT_SCORECARD_MAP_INTERVAL: ScorecardMapInterval = "mtd";

export const SCORECARD_MAP_INTERVAL_LABELS: Record<ScorecardMapInterval, string> = {
  mtd: "MTD",
  ytd: "YTD",
  "12m": "12M",
};

const revenueSeriesMapSchema = z.record(z.string().min(1), z.array(z.number()));

export const sfRevenueResponseSchema = z.object({
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  months: z.array(z.string()),
  directRevenue: revenueSeriesMapSchema,
  channelPartnerRevenue: revenueSeriesMapSchema,
  orderTypeRevenue: revenueSeriesMapSchema,
  orderTypeCount: revenueSeriesMapSchema,
  rangeDailyLabels: z.array(z.string()),
  rangeDailyRevenue: z.array(z.number()),
  rangeDailyOrderTypeRevenue: revenueSeriesMapSchema,
  thisMonthTotal: z.number(),
  prevMonthTotal: z.number(),
  ytdTotal: z.number(),
  prevYtdTotal: z.number(),
  todayTotal: z.number(),
  prevDayTotal: z.number(),
  currentMonthDailyRevenue: z.array(z.number()),
  currentMonthDailyOrderTypeRevenue: revenueSeriesMapSchema,
  priorYearMonthDailyRevenue: z.array(z.number()),
  currentMonthDailyOrders: z.array(z.number()),
  priorYearMonthDailyOrders: z.array(z.number()),
});

export type SfRevenueResponse = z.infer<typeof sfRevenueResponseSchema>;

export const sfHistoricalResponseSchema = z.object({
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  months: z.array(z.string()),
  orderTypeRevenue: revenueSeriesMapSchema,
});

export type SfHistoricalResponse = z.infer<typeof sfHistoricalResponseSchema>;

const sfScorecardMapCountrySchema = z.object({
  country: z.string(),
  continent: z.string(),
  revenue: z.number(),
  orders: z.number(),
  momGrowthPct: z.number().nullable(),
  revenueSharePct: z.number(),
  surgeLabel: z.string().nullable(),
  surgePct: z.number().nullable(),
});

const sfScorecardMapContinentSchema = z.object({
  continent: z.string(),
  revenue: z.number(),
  orders: z.number(),
  momGrowthPct: z.number().nullable(),
  yoyGrowthPct: z.number().nullable(),
  revenueSharePct: z.number(),
  countries: z.array(sfScorecardMapCountrySchema),
});

const sfScorecardMapLocationPinSchema = z.object({
  label: z.string(),
  country: z.string(),
  state: z.string().nullable(),
  scope: z.enum(["country", "us-state"]),
  orders: z.number(),
  revenue: z.number(),
});

const sfScorecardMapYtdContinentSchema = z.object({
  continent: z.string(),
  currentRevenue: z.number(),
  previousRevenue: z.number(),
});

export const sfScorecardMapResponseSchema = z.object({
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ordersThisMonth: z.number(),
  ordersMoMGrowthPct: z.number().nullable(),
  topContinent: z.object({
    continent: z.string(),
    revenue: z.number(),
    revenueSharePct: z.number(),
    countries: z.array(sfScorecardMapCountrySchema),
  }),
  emergingMarkets: z.object({
    revenue: z.number(),
    revenueSharePct: z.number(),
    countries: z.array(sfScorecardMapCountrySchema),
  }),
  europe: z.object({
    revenue: z.number(),
    revenueSharePct: z.number(),
    countries: z.array(sfScorecardMapCountrySchema),
  }),
  ytdComparison: z.object({
    currentYear: z.number().int(),
    previousYear: z.number().int(),
    currentLabel: z.string(),
    previousLabel: z.string(),
    currentPeriodStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    currentPeriodEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    previousPeriodStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    previousPeriodEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    continents: z.array(sfScorecardMapYtdContinentSchema),
  }),
  continentTable: z.array(sfScorecardMapContinentSchema),
  locationPins: z.array(sfScorecardMapLocationPinSchema),
});

export type SfScorecardMapCountry = z.infer<typeof sfScorecardMapCountrySchema>;
export type SfScorecardMapContinent = z.infer<typeof sfScorecardMapContinentSchema>;
export type SfScorecardMapLocationPin = z.infer<typeof sfScorecardMapLocationPinSchema>;
export type SfScorecardMapYtdContinent = z.infer<typeof sfScorecardMapYtdContinentSchema>;
export type SfScorecardMapResponse = z.infer<typeof sfScorecardMapResponseSchema>;

export const sfTodaySummaryResponseSchema = z.object({
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalRevenue: z.number(),
  revenueDiff: z.number(),
  newLicences: z.number(),
  newLicencesDiff: z.number(),
  renewals: z.number(),
  renewalsDiff: z.number(),
  upgrades: z.number(),
  upgradesDiff: z.number(),
  avgDealSize: z.number(),
  avgDealSizeDiff: z.number(),
  pipelineAdded: z.number(),
  pipelineAddedDiff: z.number(),
});

export type SfTodaySummaryResponse = z.infer<typeof sfTodaySummaryResponseSchema>;

const sfTopDealSchema = z.object({
  id: z.string(),
  company: z.string(),
  owner: z.string(),
  amount: z.number(),
  type: z.string(),
  licenceType: z.string(),
  stage: z.string(),
});

export const sfTopDealsResponseSchema = z.object({
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalAmount: z.number(),
  totalDeals: z.number(),
  deals: z.array(sfTopDealSchema),
});

export type SfTopDeal = z.infer<typeof sfTopDealSchema>;
export type SfTopDealsResponse = z.infer<typeof sfTopDealsResponseSchema>;

export const PIPELINE_STAGE_BUCKET_VALUES = [
  "Scoping",
  "Proposal",
  "Committed",
  "Won",
] as const;

export type PipelineStageBucket = (typeof PIPELINE_STAGE_BUCKET_VALUES)[number];

const sfOpportunityPipelineDealSchema = z.object({
  id: z.string(),
  dealName: z.string(),
  company: z.string(),
  ownerId: z.string().nullable(),
  ownerName: z.string(),
  amount: z.number(),
  probability: z.number(),
  stageName: z.string(),
  stageBucket: z.enum(PIPELINE_STAGE_BUCKET_VALUES),
  stageStatus: z.string().nullable(),
  forecastCategory: z.string().nullable(),
  createdDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  closeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  expectedCloseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  closeQuarter: z.string(),
  daysOpen: z.number(),
  timeOpen: z.number(),
  isClosed: z.boolean(),
  isWon: z.boolean(),
  wooOrderId: z.string().nullable(),
  lastActivityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  lastActivityDays: z.number().nullable(),
  lossReason: z.string().nullable(),
});

export const sfOpportunityPipelineResponseSchema = z.object({
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deals: z.array(sfOpportunityPipelineDealSchema),
});

export type SfOpportunityPipelineDeal = z.infer<typeof sfOpportunityPipelineDealSchema>;
export type SfOpportunityPipelineResponse = z.infer<typeof sfOpportunityPipelineResponseSchema>;

export const STRATEGY_INITIATIVE_KEYS = [
  "Woodes",
  "Morningstar",
  "Grid",
] as const;

export type StrategyInitiativeKey = (typeof STRATEGY_INITIATIVE_KEYS)[number];

const sfStrategyInitiativeSummarySchema = z.object({
  key: z.enum(STRATEGY_INITIATIVE_KEYS),
  label: z.string(),
  sourceObject: z.enum(["Opportunity", "woo_OrderLine__c"]),
  rule: z.string(),
  totalRevenue: z.number(),
  ytdRevenue: z.number(),
  recordCount: z.number().int(),
});

const sfStrategyInitiativeMonthSchema = z.object({
  monthStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  monthLabel: z.string(),
  year: z.number().int(),
  month: z.number().int(),
  woodes: z.number(),
  morningstar: z.number(),
  grid: z.number(),
  combined: z.number(),
});

export const sfStrategyInitiativesResponseSchema = z.object({
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fromMonth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toMonth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currentYear: z.number().int(),
  previousYear: z.number().int(),
  ytdMonth: z.number().int(),
  ytdCurrentRevenue: z.number(),
  ytdPreviousRevenue: z.number(),
  ytdDiffRevenue: z.number(),
  ytdDiffPct: z.number().nullable(),
  initiatives: z.array(sfStrategyInitiativeSummarySchema),
  monthly: z.array(sfStrategyInitiativeMonthSchema),
});

export type SfStrategyInitiativeSummary = z.infer<typeof sfStrategyInitiativeSummarySchema>;
export type SfStrategyInitiativeMonth = z.infer<typeof sfStrategyInitiativeMonthSchema>;
export type SfStrategyInitiativesResponse = z.infer<typeof sfStrategyInitiativesResponseSchema>;

const sfScorecardArrMonthlyFlowSchema = z.object({
  monthStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  monthLabel: z.string(),
  totalArr: z.number(),
  activeSubscriptions: z.number(),
  activeCustomers: z.number(),
  newSubscriptions: z.number(),
  endedSubscriptions: z.number(),
  netSubscriptions: z.number(),
  newArr: z.number(),
  endedArr: z.number(),
  netArr: z.number(),
  totalRevenue: z.number(),
  recurringRevenue: z.number(),
  recurringRevenuePct: z.number(),
  renewalRatePct: z.number(),
  arrChurnPct: z.number(),
  customerChurnPct: z.number(),
  retentionPct: z.number(),
  netRevenueRetentionPct: z.number(),
  topCustomerSharePct: z.number(),
  top5CustomerSharePct: z.number(),
  topIndustrySharePct: z.number(),
});

const sfScorecardArrStatusSnapshotSchema = z.object({
  status: z.string(),
  subscriptions: z.number(),
  arr: z.number(),
  arrSharePct: z.number(),
});

const sfScorecardArrRunwayPointSchema = z.object({
  monthStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  monthLabel: z.string(),
  endingSubscriptions: z.number(),
  endingArr: z.number(),
  pendingCancelSubscriptions: z.number(),
  pendingCancelArr: z.number(),
});

const sfScorecardArrBridgeSchema = z.object({
  openingArr: z.number(),
  newSalesArr: z.number(),
  expansionArr: z.number(),
  contractionArr: z.number(),
  churnArr: z.number(),
  closingArr: z.number(),
});

const sfScorecardArrConcentrationItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  arr: z.number(),
  sharePct: z.number(),
});

export const sfScorecardArrResponseSchema = z.object({
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  latestFullMonthStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  latestFullMonthLabel: z.string(),
  previousMonthLabel: z.string(),
  currencyCode: z.string(),
  currentSnapshot: z.object({
    totalArr: z.number(),
    activeSubscriptions: z.number(),
    activeCustomers: z.number(),
    activeArr: z.number(),
    arrPerCustomer: z.number(),
    pendingCancelSubscriptions: z.number(),
    pendingCancelArr: z.number(),
    renewalRatePct: z.number(),
    topCustomerSharePct: z.number(),
    top5CustomerSharePct: z.number(),
    topIndustrySharePct: z.number(),
  }),
  latestMonth: z.object({
    newSubscriptions: z.number(),
    endedSubscriptions: z.number(),
    netSubscriptions: z.number(),
    newArr: z.number(),
    endedArr: z.number(),
    netArr: z.number(),
    newArrDiff: z.number(),
    endedArrDiff: z.number(),
    netArrDiff: z.number(),
    totalRevenue: z.number(),
    recurringRevenue: z.number(),
    recurringRevenuePct: z.number(),
    renewalRatePct: z.number(),
    arrChurnPct: z.number(),
    customerChurnPct: z.number(),
    retentionPct: z.number(),
    netRevenueRetentionPct: z.number(),
  }),
  trailingTwelveMonths: z.object({
    totalArrGrowthPct: z.number(),
    organicArrGrowthPct: z.number(),
    newSalesArrGrowthPct: z.number(),
    recurringRevenuePct: z.number(),
    netRevenueRetentionPct: z.number(),
    renewalRatePct: z.number(),
    arrChurnPct: z.number(),
    customerChurnPct: z.number(),
    retentionPct: z.number(),
    averageSalesPrice: z.number(),
    ltvProxy: z.number(),
    newSalesArr: z.number(),
    newLogos: z.number(),
    recurringRevenue: z.number(),
    totalRevenue: z.number(),
  }),
  terminalDateCoverage: z.object({
    statusCount: z.number(),
    datedCount: z.number(),
    missingCount: z.number(),
    coveragePct: z.number(),
  }),
  monthlyFlow: z.array(sfScorecardArrMonthlyFlowSchema),
  statusSnapshot: z.array(sfScorecardArrStatusSnapshotSchema),
  runway: z.array(sfScorecardArrRunwayPointSchema),
  bridges: z.object({
    totalArr: sfScorecardArrBridgeSchema,
    organicArr: sfScorecardArrBridgeSchema,
    netRevenueRetention: sfScorecardArrBridgeSchema,
  }),
  concentration: z.object({
    customers: z.object({
      top1Pct: z.number(),
      top5Pct: z.number(),
      top10Pct: z.number(),
      items: z.array(sfScorecardArrConcentrationItemSchema),
    }),
    industries: z.object({
      top1Pct: z.number(),
      top5Pct: z.number(),
      items: z.array(sfScorecardArrConcentrationItemSchema),
    }),
  }),
  caveats: z.array(z.string()),
});

export type SfScorecardArrMonthlyFlow = z.infer<typeof sfScorecardArrMonthlyFlowSchema>;
export type SfScorecardArrStatusSnapshot = z.infer<typeof sfScorecardArrStatusSnapshotSchema>;
export type SfScorecardArrRunwayPoint = z.infer<typeof sfScorecardArrRunwayPointSchema>;
export type SfScorecardArrBridge = z.infer<typeof sfScorecardArrBridgeSchema>;
export type SfScorecardArrConcentrationItem = z.infer<typeof sfScorecardArrConcentrationItemSchema>;
export type SfScorecardArrResponse = z.infer<typeof sfScorecardArrResponseSchema>;

const sfScorecardChannelMetricSchema = z.object({
  revenue: z.number(),
  orders: z.number(),
  customers: z.number(),
  avgDealSize: z.number(),
  newSubscriptions: z.number(),
});

const sfScorecardChannelBreakdownItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  orders: z.number(),
  revenue: z.number(),
});

const sfScorecardChannelCountItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  count: z.number(),
});

const sfScorecardChannelValueSegmentSchema = z.object({
  key: z.string(),
  label: z.string(),
  revenueMtd: z.number(),
  ordersMtd: z.number(),
  avgOrderValueMtd: z.number(),
  revenueYtd: z.number(),
  ordersYtd: z.number(),
  avgOrderValueYtd: z.number(),
});

export const sfScorecardChannelDashboardResponseSchema = z.object({
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  customerChannel: z.enum(REVENUE_CUSTOMER_CHANNEL_VALUES),
  salesChannel: z.enum(REVENUE_SALES_CHANNEL_VALUES),
  mtd: sfScorecardChannelMetricSchema,
  previousMtd: sfScorecardChannelMetricSchema,
  ytd: sfScorecardChannelMetricSchema,
  previousYtd: sfScorecardChannelMetricSchema,
  paymentMethodsMtd: z.array(sfScorecardChannelBreakdownItemSchema),
  orderTypesMtd: z.array(sfScorecardChannelBreakdownItemSchema),
  salesChannelsMtd: z.array(sfScorecardChannelBreakdownItemSchema),
  licenseTypesYtd: z.array(sfScorecardChannelBreakdownItemSchema),
  topCountriesYtd: z.array(sfScorecardChannelBreakdownItemSchema),
  subscriptionStatuses: z.array(sfScorecardChannelCountItemSchema),
  intervalDailyLabels: z.array(z.string()),
  intervalDailyOrderTypeRevenue: revenueSeriesMapSchema,
  valueSegments: z.array(sfScorecardChannelValueSegmentSchema),
});

export type SfScorecardChannelMetric = z.infer<typeof sfScorecardChannelMetricSchema>;
export type SfScorecardChannelBreakdownItem = z.infer<typeof sfScorecardChannelBreakdownItemSchema>;
export type SfScorecardChannelCountItem = z.infer<typeof sfScorecardChannelCountItemSchema>;
export type SfScorecardChannelValueSegment = z.infer<typeof sfScorecardChannelValueSegmentSchema>;
export type SfScorecardChannelDashboardResponse = z.infer<
  typeof sfScorecardChannelDashboardResponseSchema
>;
