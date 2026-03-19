import {
  DEFAULT_REVENUE_CUSTOMER_CHANNEL,
  DEFAULT_REVENUE_SALES_CHANNEL,
  DEFAULT_SCORECARD_MAP_INTERVAL,
  sfScorecardChannelDashboardResponseSchema,
  sfScorecardMapResponseSchema,
  sfTodaySummaryResponseSchema,
  sfTopDealsResponseSchema,
  type ScorecardMapInterval,
  type SfScorecardChannelDashboardResponse,
  type SfScorecardMapCountry,
  type SfScorecardMapResponse,
  type SfTodaySummaryResponse,
  type SfTopDealsResponse,
} from "@contracts/sales";

import type { RevenueFilters } from "./schema";
import { formatDateOnlyUtc } from "./revenue-window";
import { querySalesforce } from "../../platform/salesforce/client";

type CacheEntry<T> = {
  payload: T;
  expiresAt: number;
};

type ScorecardServiceResult<T> = {
  payload: T;
  cacheHit: boolean;
};

type RevenueWindow = {
  from: string;
  to: string;
};

type CountryMonthAggRecord = {
  shipping_country__c?: unknown;
  billing_country__c?: unknown;
  yr?: unknown;
  mo?: unknown;
  cnt?: unknown;
  total?: unknown;
};

type CountrySnapshotAggRecord = {
  shipping_country__c?: unknown;
  billing_country__c?: unknown;
  cnt?: unknown;
  total?: unknown;
};

type LocationAggRecord = {
  shipping_country__c?: unknown;
  billing_country__c?: unknown;
  shipping_state__c?: unknown;
  billing_state__c?: unknown;
  cnt?: unknown;
  total?: unknown;
};

type TopDealRecord = {
  Id?: unknown;
  Name?: unknown;
  billing_company__c?: unknown;
  billing_first_name__c?: unknown;
  billing_last_name__c?: unknown;
  Totalextax__c?: unknown;
  Order_Type__c?: unknown;
  LicenseType__c?: unknown;
  SubscriptionType__c?: unknown;
  status__c?: unknown;
  meta_license_owner__c?: unknown;
  License_Owner__r?: {
    Name?: unknown;
  } | null;
  Owner?: {
    Name?: unknown;
  } | null;
  Subscription__r?: {
    status__c?: unknown;
  } | null;
};

type AggregateRecord = {
  cnt?: unknown;
  total?: unknown;
};

type DashboardAggregateRecord = AggregateRecord & {
  customers?: unknown;
};

type BreakdownRecord = {
  cnt?: unknown;
  total?: unknown;
  [key: string]: unknown;
};

type OrderTypeBreakdownRecord = {
  meta_type__c?: unknown;
  meta_is_renewal__c?: unknown;
  meta_is_upgrade__c?: unknown;
  cnt?: unknown;
  total?: unknown;
};

type OrderTypeDailyBreakdownRecord = {
  meta_type__c?: unknown;
  meta_is_renewal__c?: unknown;
  meta_is_upgrade__c?: unknown;
  yr?: unknown;
  mo?: unknown;
  dy?: unknown;
  total?: unknown;
};

type SubscriptionStatusRecord = {
  status__c?: unknown;
  cnt?: unknown;
};

type CountrySeries = {
  country: string;
  continent: string;
  revenueByMonth: Map<string, number>;
  ordersByMonth: Map<string, number>;
};

type PreviousSnapshot = {
  revenue: number;
  orders: number;
};

type SurgeMetric = {
  label: string;
  pct: number;
};

const CACHE_TTL_MS = Number(process.env.SF_REVENUE_CACHE_TTL_MS ?? 5 * 60 * 1000);
const CACHE_MAX_ENTRIES = 24;

const mapCache = new Map<string, CacheEntry<SfScorecardMapResponse>>();
const mapInFlight = new Map<string, Promise<SfScorecardMapResponse>>();
const todaySummaryCache = new Map<string, CacheEntry<SfTodaySummaryResponse>>();
const todaySummaryInFlight = new Map<string, Promise<SfTodaySummaryResponse>>();
const topDealsCache = new Map<string, CacheEntry<SfTopDealsResponse>>();
const topDealsInFlight = new Map<string, Promise<SfTopDealsResponse>>();
const channelDashboardCache = new Map<string, CacheEntry<SfScorecardChannelDashboardResponse>>();
const channelDashboardInFlight = new Map<string, Promise<SfScorecardChannelDashboardResponse>>();

const quoteLiteral = (value: string): string => `'${value.replace(/'/g, "\\'")}'`;
const quoteLiterals = (values: readonly string[]): string =>
  values.map(quoteLiteral).join(", ");

const DIRECT_CUSTOMER_CHANNEL = "Direct Sales";
const PARTNER_CUSTOMER_CHANNEL = "Channel Partner Sales";
const ORDER_TYPES = ["new", "renewal", "upgrade", "downgrade"] as const;
type OrderType = (typeof ORDER_TYPES)[number];
const VALUE_SEGMENT_KEYS = [
  "1. Low",
  "2. Medium",
  "3. High",
  "4. Enterprise",
  "",
] as const;

const ALL_CUSTOMER_CHANNELS = [
  DIRECT_CUSTOMER_CHANNEL,
  PARTNER_CUSTOMER_CHANNEL,
] as const;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  hs_stripe: "Stripe",
  hs_paypal: "PayPal",
  dibs_easy: "DIBS Easy",
  cod: "Invoice / COD",
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const VALUE_SEGMENT_LABELS: Record<string, string> = {
  "1. Low": "Low",
  "2. Medium": "Medium",
  "3. High": "High",
  "4. Enterprise": "Enterprise",
  "": "Unclassified",
};

const resolveCustomerChannels = (customerChannel: RevenueFilters["customerChannel"]): readonly string[] =>
  customerChannel === DEFAULT_REVENUE_CUSTOMER_CHANNEL
    ? ALL_CUSTOMER_CHANNELS
    : [customerChannel];

const buildScopedSalesChannelClause = (
  fieldName: string,
  salesChannel: RevenueFilters["salesChannel"],
): string | null =>
  salesChannel === DEFAULT_REVENUE_SALES_CHANNEL
    ? null
    : `AND ${fieldName} = ${quoteLiteral(salesChannel)}`;

const buildScopedCustomerChannelsClause = (
  fieldName: string,
  customerChannels: readonly string[],
): string | null => {
  if (customerChannels.length === 0 || customerChannels.length === ALL_CUSTOMER_CHANNELS.length) {
    return null;
  }

  if (customerChannels.length === 1) {
    return `AND ${fieldName} = ${quoteLiteral(customerChannels[0])}`;
  }

  return `AND ${fieldName} IN (${quoteLiterals(customerChannels)})`;
};

const buildSalesChannelClause = (salesChannel: RevenueFilters["salesChannel"]): string | null =>
  buildScopedSalesChannelClause("meta_SalesChannel__c", salesChannel);

const buildCustomerChannelsClause = (customerChannels: readonly string[]): string | null =>
  buildScopedCustomerChannelsClause("CustomerChannel__c", customerChannels);

const buildSubscriptionSalesChannelClause = (
  salesChannel: RevenueFilters["salesChannel"],
): string | null =>
  buildScopedSalesChannelClause("Order__r.meta_SalesChannel__c", salesChannel);

const buildSubscriptionCustomerChannelsClause = (
  customerChannels: readonly string[],
): string | null =>
  buildScopedCustomerChannelsClause("Order__r.CustomerChannel__c", customerChannels);

const parseDateOnly = (
  value: string,
): {
  year: number;
  month: number;
  day: number;
} => {
  const [yearToken, monthToken, dayToken] = value.split("-");

  return {
    year: Number(yearToken),
    month: Number(monthToken),
    day: Number(dayToken),
  };
};

const dateKey = (year: number, month: number, day: number): string =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const buildDateKeys = (window: RevenueWindow): string[] => {
  const start = parseDateOnly(window.from);
  const end = parseDateOnly(window.to);
  const cursor = new Date(Date.UTC(start.year, start.month - 1, start.day));
  const last = new Date(Date.UTC(end.year, end.month - 1, end.day));
  const out: string[] = [];

  while (cursor.getTime() <= last.getTime()) {
    out.push(formatDateOnlyUtc(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return out;
};

const countDaysInWindow = (window: RevenueWindow): number => {
  const start = parseDateOnly(window.from);
  const end = parseDateOnly(window.to);
  const startDate = Date.UTC(start.year, start.month - 1, start.day);
  const endDate = Date.UTC(end.year, end.month - 1, end.day);

  return Math.floor((endDate - startDate) / (24 * 60 * 60 * 1000)) + 1;
};

const formatDayLabel = (dateOnly: string): string => {
  const { month, day } = parseDateOnly(dateOnly);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return dateOnly;
  }

  return `${MONTH_NAMES[month - 1]} ${day}`;
};

const monthKey = (year: number, month: number): string =>
  `${year}-${String(month).padStart(2, "0")}`;

const shiftMonth = (
  year: number,
  month: number,
  delta: number,
): {
  year: number;
  month: number;
} => {
  const base = new Date(Date.UTC(year, month - 1 + delta, 1));

  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
  };
};

const buildMonthToDateWindow = (now: Date): RevenueWindow => {
  const to = formatDateOnlyUtc(now);
  const { year, month } = parseDateOnly(to);

  return {
    from: `${year}-${String(month).padStart(2, "0")}-01`,
    to,
  };
};

const buildPreviousMonthToDateWindow = (now: Date): RevenueWindow => {
  const to = formatDateOnlyUtc(now);
  const { year, month, day } = parseDateOnly(to);
  const previous = shiftMonth(year, month, -1);
  const previousMonthDayCount = new Date(Date.UTC(previous.year, previous.month, 0)).getUTCDate();
  const clampedDay = Math.min(day, previousMonthDayCount);

  return {
    from: `${previous.year}-${String(previous.month).padStart(2, "0")}-01`,
    to: `${previous.year}-${String(previous.month).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`,
  };
};

const buildPreviousYearMonthToDateWindow = (now: Date): RevenueWindow => {
  const to = formatDateOnlyUtc(now);
  const { year, month, day } = parseDateOnly(to);
  const previousYear = year - 1;
  const previousYearMonthDayCount = new Date(Date.UTC(previousYear, month, 0)).getUTCDate();
  const clampedDay = Math.min(day, previousYearMonthDayCount);

  return {
    from: `${previousYear}-${String(month).padStart(2, "0")}-01`,
    to: `${previousYear}-${String(month).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`,
  };
};

const buildSameDayPreviousYearDate = (now: Date): Date => {
  const to = formatDateOnlyUtc(now);
  const { year, month, day } = parseDateOnly(to);
  const previousYear = year - 1;
  const previousYearMonthDayCount = new Date(Date.UTC(previousYear, month, 0)).getUTCDate();
  const clampedDay = Math.min(day, previousYearMonthDayCount);

  return new Date(Date.UTC(previousYear, month - 1, clampedDay));
};

const shiftDayWindow = (
  window: RevenueWindow,
  deltaDays: number,
): RevenueWindow => {
  const shift = (dateOnly: string): string => {
    const [yearToken, monthToken, dayToken] = dateOnly.split("-");
    const shifted = new Date(
      Date.UTC(Number(yearToken), Number(monthToken) - 1, Number(dayToken) + deltaDays),
    );

    return formatDateOnlyUtc(shifted);
  };

  return {
    from: shift(window.from),
    to: shift(window.to),
  };
};

const buildYearToDateWindow = (
  now: Date,
  yearOffset: number,
): RevenueWindow => {
  const to = formatDateOnlyUtc(now);
  const { year, month, day } = parseDateOnly(to);
  const targetYear = year + yearOffset;
  const targetMonthDayCount = new Date(Date.UTC(targetYear, month, 0)).getUTCDate();
  const clampedDay = Math.min(day, targetMonthDayCount);

  return {
    from: `${targetYear}-01-01`,
    to: `${targetYear}-${String(month).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`,
  };
};

const buildTrailingTwelveMonthsWindow = (now: Date): RevenueWindow => {
  const to = formatDateOnlyUtc(now);
  const { year, month } = parseDateOnly(to);
  const start = shiftMonth(year, month, -11);

  return {
    from: `${start.year}-${String(start.month).padStart(2, "0")}-01`,
    to,
  };
};

const buildMapIntervalWindow = (
  interval: ScorecardMapInterval,
  now: Date,
): RevenueWindow => {
  if (interval === "mtd") {
    return buildMonthToDateWindow(now);
  }

  if (interval === "ytd") {
    return buildYearToDateWindow(now, 0);
  }

  return buildTrailingTwelveMonthsWindow(now);
};

const buildMapPriorPeriodWindow = (
  interval: ScorecardMapInterval,
  now: Date,
): RevenueWindow => {
  if (interval === "mtd") {
    return buildPreviousMonthToDateWindow(now);
  }

  if (interval === "ytd") {
    return buildYearToDateWindow(now, -1);
  }

  return buildTrailingTwelveMonthsWindow(buildSameDayPreviousYearDate(now));
};

const buildMapYoYWindow = (
  interval: ScorecardMapInterval,
  now: Date,
): RevenueWindow => {
  if (interval === "mtd") {
    return buildPreviousYearMonthToDateWindow(now);
  }

  return buildMapPriorPeriodWindow(interval, now);
};

const buildMapComparisonLabels = (
  interval: ScorecardMapInterval,
  currentWindow: RevenueWindow,
  previousWindow: RevenueWindow,
): {
  currentLabel: string;
  previousLabel: string;
} => {
  const { year: currentYear } = parseDateOnly(currentWindow.to);
  const { year: previousYear } = parseDateOnly(previousWindow.to);

  if (interval === "mtd") {
    return {
      currentLabel: `${currentYear} MTD`,
      previousLabel: `${previousYear} MTD`,
    };
  }

  if (interval === "ytd") {
    return {
      currentLabel: `${currentYear} YTD`,
      previousLabel: `${previousYear} YTD`,
    };
  }

  return {
    currentLabel: "Current 12M",
    previousLabel: "Prior 12M",
  };
};

const buildCountrySeriesWindow = (now: Date): RevenueWindow => {
  const currentMonth = buildMonthToDateWindow(now);
  const { year, month } = parseDateOnly(currentMonth.from);
  const start = shiftMonth(year, month, -14);

  return {
    from: `${start.year}-${String(start.month).padStart(2, "0")}-01`,
    to: currentMonth.to,
  };
};

const toSfDateTimeStart = (dateOnly: string): string => `${dateOnly}T00:00:00Z`;
const toSfDateTimeEnd = (dateOnly: string): string => `${dateOnly}T23:59:59Z`;

const buildCountrySeriesQuery = (
  window: RevenueWindow,
  customerChannels: readonly string[],
  salesChannel: RevenueFilters["salesChannel"],
): string => {
  const customerChannelsClause = buildCustomerChannelsClause(customerChannels);
  const salesChannelClause = buildSalesChannelClause(salesChannel);

  return [
    "SELECT shipping_country__c,",
    "billing_country__c,",
    "CALENDAR_YEAR(OrderEffectiveDate__c) yr,",
    "CALENDAR_MONTH(OrderEffectiveDate__c) mo,",
    "COUNT(Id) cnt,",
    "SUM(Totalextax__c) total",
    "FROM woo_Order__c",
    `WHERE OrderEffectiveDate__c >= ${toSfDateTimeStart(window.from)}`,
    `AND OrderEffectiveDate__c <= ${toSfDateTimeEnd(window.to)}`,
    "AND (shipping_country__c != null OR billing_country__c != null)",
    customerChannelsClause,
    salesChannelClause,
    "GROUP BY shipping_country__c, billing_country__c, CALENDAR_YEAR(OrderEffectiveDate__c), CALENDAR_MONTH(OrderEffectiveDate__c)",
    "ORDER BY CALENDAR_YEAR(OrderEffectiveDate__c), CALENDAR_MONTH(OrderEffectiveDate__c), shipping_country__c, billing_country__c",
  ]
    .filter(Boolean)
    .join(" ");
};

const buildCountrySnapshotQuery = (
  window: RevenueWindow,
  customerChannels: readonly string[],
  salesChannel: RevenueFilters["salesChannel"],
): string => {
  const customerChannelsClause = buildCustomerChannelsClause(customerChannels);
  const salesChannelClause = buildSalesChannelClause(salesChannel);

  return [
    "SELECT shipping_country__c,",
    "billing_country__c,",
    "COUNT(Id) cnt,",
    "SUM(Totalextax__c) total",
    "FROM woo_Order__c",
    `WHERE OrderEffectiveDate__c >= ${toSfDateTimeStart(window.from)}`,
    `AND OrderEffectiveDate__c <= ${toSfDateTimeEnd(window.to)}`,
    "AND (shipping_country__c != null OR billing_country__c != null)",
    customerChannelsClause,
    salesChannelClause,
    "GROUP BY shipping_country__c, billing_country__c",
    "ORDER BY SUM(Totalextax__c) DESC",
  ]
    .filter(Boolean)
    .join(" ");
};

const buildLocationSnapshotQuery = (
  window: RevenueWindow,
  customerChannels: readonly string[],
  salesChannel: RevenueFilters["salesChannel"],
): string => {
  const customerChannelsClause = buildCustomerChannelsClause(customerChannels);
  const salesChannelClause = buildSalesChannelClause(salesChannel);

  return [
    "SELECT shipping_country__c,",
    "billing_country__c,",
    "shipping_state__c,",
    "billing_state__c,",
    "COUNT(Id) cnt,",
    "SUM(Totalextax__c) total",
    "FROM woo_Order__c",
    `WHERE OrderEffectiveDate__c >= ${toSfDateTimeStart(window.from)}`,
    `AND OrderEffectiveDate__c <= ${toSfDateTimeEnd(window.to)}`,
    "AND (shipping_country__c != null OR billing_country__c != null)",
    customerChannelsClause,
    salesChannelClause,
    "GROUP BY shipping_country__c, billing_country__c, shipping_state__c, billing_state__c",
    "ORDER BY COUNT(Id) DESC",
  ]
    .filter(Boolean)
    .join(" ");
};

const buildOrderAggregateQuery = (
  window: RevenueWindow,
  customerChannels: readonly string[],
  salesChannel: RevenueFilters["salesChannel"],
  orderType?: OrderType,
): string => {
  const customerChannelsClause = buildCustomerChannelsClause(customerChannels);
  const salesChannelClause = buildSalesChannelClause(salesChannel);
  const orderTypeClause = orderType ? `AND Order_Type__c = ${quoteLiteral(orderType)}` : null;

  return [
    "SELECT COUNT(Id) cnt,",
    "SUM(Totalextax__c) total",
    "FROM woo_Order__c",
    `WHERE OrderEffectiveDate__c >= ${toSfDateTimeStart(window.from)}`,
    `AND OrderEffectiveDate__c <= ${toSfDateTimeEnd(window.to)}`,
    customerChannelsClause,
    salesChannelClause,
    orderTypeClause,
  ]
    .filter(Boolean)
    .join(" ");
};

const buildDashboardOrderSummaryQuery = (
  window: RevenueWindow,
  customerChannels: readonly string[],
  salesChannel: RevenueFilters["salesChannel"],
): string => {
  const customerChannelsClause = buildCustomerChannelsClause(customerChannels);
  const salesChannelClause = buildSalesChannelClause(salesChannel);

  return [
    "SELECT COUNT(Id) cnt,",
    "COUNT_DISTINCT(Customer__c) customers,",
    "SUM(Totalextax__c) total",
    "FROM woo_Order__c",
    `WHERE OrderEffectiveDate__c >= ${toSfDateTimeStart(window.from)}`,
    `AND OrderEffectiveDate__c <= ${toSfDateTimeEnd(window.to)}`,
    customerChannelsClause,
    salesChannelClause,
  ]
    .filter(Boolean)
    .join(" ");
};

const buildOrderBreakdownQuery = (
  fieldName: string,
  window: RevenueWindow,
  customerChannels: readonly string[],
  salesChannel: RevenueFilters["salesChannel"],
  limit?: number,
): string => {
  const customerChannelsClause = buildCustomerChannelsClause(customerChannels);
  const salesChannelClause = buildSalesChannelClause(salesChannel);
  const limitClause = typeof limit === "number" ? `LIMIT ${limit}` : null;

  return [
    `SELECT ${fieldName},`,
    "COUNT(Id) cnt,",
    "SUM(Totalextax__c) total",
    "FROM woo_Order__c",
    `WHERE OrderEffectiveDate__c >= ${toSfDateTimeStart(window.from)}`,
    `AND OrderEffectiveDate__c <= ${toSfDateTimeEnd(window.to)}`,
    customerChannelsClause,
    salesChannelClause,
    `GROUP BY ${fieldName}`,
    "ORDER BY SUM(Totalextax__c) DESC",
    limitClause,
  ]
    .filter(Boolean)
    .join(" ");
};

const buildOrderTypeBreakdownQuery = (
  window: RevenueWindow,
  customerChannels: readonly string[],
  salesChannel: RevenueFilters["salesChannel"],
): string => {
  const customerChannelsClause = buildCustomerChannelsClause(customerChannels);
  const salesChannelClause = buildSalesChannelClause(salesChannel);

  return [
    "SELECT meta_type__c,",
    "meta_is_renewal__c,",
    "meta_is_upgrade__c,",
    "COUNT(Id) cnt,",
    "SUM(Totalextax__c) total",
    "FROM woo_Order__c",
    `WHERE OrderEffectiveDate__c >= ${toSfDateTimeStart(window.from)}`,
    `AND OrderEffectiveDate__c <= ${toSfDateTimeEnd(window.to)}`,
    customerChannelsClause,
    salesChannelClause,
    "GROUP BY meta_type__c, meta_is_renewal__c, meta_is_upgrade__c",
    "ORDER BY SUM(Totalextax__c) DESC",
  ]
    .filter(Boolean)
    .join(" ");
};

const buildOrderTypeDailyBreakdownQuery = (
  window: RevenueWindow,
  customerChannels: readonly string[],
  salesChannel: RevenueFilters["salesChannel"],
): string => {
  const customerChannelsClause = buildCustomerChannelsClause(customerChannels);
  const salesChannelClause = buildSalesChannelClause(salesChannel);

  return [
    "SELECT CALENDAR_YEAR(OrderEffectiveDate__c) yr,",
    "CALENDAR_MONTH(OrderEffectiveDate__c) mo,",
    "DAY_IN_MONTH(OrderEffectiveDate__c) dy,",
    "meta_type__c,",
    "meta_is_renewal__c,",
    "meta_is_upgrade__c,",
    "SUM(Totalextax__c) total",
    "FROM woo_Order__c",
    `WHERE OrderEffectiveDate__c >= ${toSfDateTimeStart(window.from)}`,
    `AND OrderEffectiveDate__c <= ${toSfDateTimeEnd(window.to)}`,
    customerChannelsClause,
    salesChannelClause,
    "GROUP BY CALENDAR_YEAR(OrderEffectiveDate__c), CALENDAR_MONTH(OrderEffectiveDate__c), DAY_IN_MONTH(OrderEffectiveDate__c), meta_type__c, meta_is_renewal__c, meta_is_upgrade__c",
    "ORDER BY CALENDAR_YEAR(OrderEffectiveDate__c), CALENDAR_MONTH(OrderEffectiveDate__c), DAY_IN_MONTH(OrderEffectiveDate__c)",
  ]
    .filter(Boolean)
    .join(" ");
};

const buildNewSubscriptionsQuery = (
  window: RevenueWindow,
  customerChannels: readonly string[],
  salesChannel: RevenueFilters["salesChannel"],
): string => {
  const customerChannelsClause = buildSubscriptionCustomerChannelsClause(customerChannels);
  const salesChannelClause = buildSubscriptionSalesChannelClause(salesChannel);

  return [
    "SELECT COUNT(Id) cnt",
    "FROM woo_Subscription__c",
    `WHERE Subscription_Start_Date__c >= ${toSfDateTimeStart(window.from)}`,
    `AND Subscription_Start_Date__c <= ${toSfDateTimeEnd(window.to)}`,
    customerChannelsClause,
    salesChannelClause,
  ]
    .filter(Boolean)
    .join(" ");
};

const buildSubscriptionStatusQuery = (
  customerChannels: readonly string[],
  salesChannel: RevenueFilters["salesChannel"],
): string => {
  const customerChannelsClause = buildSubscriptionCustomerChannelsClause(customerChannels);
  const salesChannelClause = buildSubscriptionSalesChannelClause(salesChannel);

  return [
    "SELECT status__c, COUNT(Id) cnt",
    "FROM woo_Subscription__c",
    "WHERE Id != null",
    customerChannelsClause,
    salesChannelClause,
    "GROUP BY status__c",
    "ORDER BY COUNT(Id) DESC",
  ]
    .filter(Boolean)
    .join(" ");
};

const buildPipelineAddedQuery = (window: RevenueWindow): string =>
  [
    "SELECT COUNT(Id) cnt,",
    "SUM(Amount) total",
    "FROM Opportunity",
    `WHERE CreatedDate >= ${toSfDateTimeStart(window.from)}`,
    `AND CreatedDate <= ${toSfDateTimeEnd(window.to)}`,
    "AND IsClosed = false",
    "AND Amount != null",
  ].join(" ");

const buildTopDealsQuery = (
  window: RevenueWindow,
  customerChannels: readonly string[],
  salesChannel: RevenueFilters["salesChannel"],
): string => {
  const customerChannelsClause = buildCustomerChannelsClause(customerChannels);
  const salesChannelClause = buildSalesChannelClause(salesChannel);

  return [
    "SELECT Id, Name, billing_company__c, billing_first_name__c, billing_last_name__c,",
    "Totalextax__c, Order_Type__c, LicenseType__c, SubscriptionType__c, status__c,",
    "meta_license_owner__c, License_Owner__r.Name, Owner.Name, Subscription__r.status__c",
    "FROM woo_Order__c",
    `WHERE OrderEffectiveDate__c >= ${toSfDateTimeStart(window.from)}`,
    `AND OrderEffectiveDate__c <= ${toSfDateTimeEnd(window.to)}`,
    customerChannelsClause,
    salesChannelClause,
    "ORDER BY Totalextax__c DESC NULLS LAST",
    "LIMIT 50",
  ]
    .filter(Boolean)
    .join(" ");
};

const toNumber = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toInteger = (value: unknown): number => Math.trunc(toNumber(value));

const toBoolean = (value: unknown): boolean =>
  value === true || value === "true" || value === 1 || value === "1";

const readAggregateSummary = (
  rows: AggregateRecord[],
): {
  count: number;
  total: number;
} => {
  const row = rows[0] ?? {};

  return {
    count: toInteger(row.cnt),
    total: toNumber(row.total),
  };
};

const readDashboardAggregateSummary = (
  rows: DashboardAggregateRecord[],
): {
  count: number;
  total: number;
  customers: number;
} => {
  const row = rows[0] ?? {};

  return {
    count: toInteger(row.cnt),
    total: toNumber(row.total),
    customers: toInteger(row.customers),
  };
};

const cleanText = (value: unknown): string =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

const normalizeLabel = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const US_STATES = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
  ["DC", "District of Columbia"],
] as const;

const US_STATE_ALIASES = new Map<string, string>(
  US_STATES.flatMap(([code, name]) => [
    [normalizeLabel(code), name] as const,
    [normalizeLabel(name), name] as const,
  ]),
);

const REGION_DISPLAY_NAMES = new Intl.DisplayNames(["en"], {
  type: "region",
});

const COUNTRY_ALIASES = new Map<string, string>([
  ["usa", "United States"],
  ["us", "United States"],
  ["united states of america", "United States"],
  ["uk", "United Kingdom"],
  ["u k", "United Kingdom"],
  ["england", "United Kingdom"],
  ["scotland", "United Kingdom"],
  ["uae", "United Arab Emirates"],
  ["u a e", "United Arab Emirates"],
  ["south korea", "South Korea"],
  ["korea south", "South Korea"],
  ["republic of korea", "South Korea"],
  ["czechia", "Czech Republic"],
  ["viet nam", "Vietnam"],
  ["turkiye", "Turkey"],
  ["virgin islands british", "British Virgin Islands"],
]);

const COUNTRY_TO_CONTINENT = new Map<string, string>([
  ["united states", "North America"],
  ["canada", "North America"],
  ["mexico", "North America"],
  ["guatemala", "North America"],
  ["costa rica", "North America"],
  ["panama", "North America"],
  ["dominican republic", "North America"],
  ["jamaica", "North America"],
  ["puerto rico", "North America"],
  ["brazil", "South America"],
  ["argentina", "South America"],
  ["chile", "South America"],
  ["colombia", "South America"],
  ["peru", "South America"],
  ["uruguay", "South America"],
  ["paraguay", "South America"],
  ["bolivia", "South America"],
  ["ecuador", "South America"],
  ["venezuela", "South America"],
  ["united kingdom", "Europe"],
  ["ireland", "Europe"],
  ["norway", "Europe"],
  ["sweden", "Europe"],
  ["denmark", "Europe"],
  ["finland", "Europe"],
  ["iceland", "Europe"],
  ["germany", "Europe"],
  ["france", "Europe"],
  ["spain", "Europe"],
  ["portugal", "Europe"],
  ["italy", "Europe"],
  ["netherlands", "Europe"],
  ["belgium", "Europe"],
  ["luxembourg", "Europe"],
  ["switzerland", "Europe"],
  ["austria", "Europe"],
  ["poland", "Europe"],
  ["czech republic", "Europe"],
  ["slovakia", "Europe"],
  ["hungary", "Europe"],
  ["romania", "Europe"],
  ["bulgaria", "Europe"],
  ["croatia", "Europe"],
  ["slovenia", "Europe"],
  ["serbia", "Europe"],
  ["bosnia and herzegovina", "Europe"],
  ["ukraine", "Europe"],
  ["estonia", "Europe"],
  ["latvia", "Europe"],
  ["lithuania", "Europe"],
  ["greece", "Europe"],
  ["cyprus", "Europe"],
  ["malta", "Europe"],
  ["isle of man", "Europe"],
  ["jersey", "Europe"],
  ["guernsey", "Europe"],
  ["turkey", "Asia"],
  ["united arab emirates", "Asia"],
  ["saudi arabia", "Asia"],
  ["qatar", "Asia"],
  ["israel", "Asia"],
  ["india", "Asia"],
  ["china", "Asia"],
  ["hong kong", "Asia"],
  ["taiwan", "Asia"],
  ["japan", "Asia"],
  ["south korea", "Asia"],
  ["singapore", "Asia"],
  ["malaysia", "Asia"],
  ["thailand", "Asia"],
  ["vietnam", "Asia"],
  ["indonesia", "Asia"],
  ["philippines", "Asia"],
  ["pakistan", "Asia"],
  ["bangladesh", "Asia"],
  ["sri lanka", "Asia"],
  ["south africa", "Africa"],
  ["nigeria", "Africa"],
  ["kenya", "Africa"],
  ["egypt", "Africa"],
  ["morocco", "Africa"],
  ["tunisia", "Africa"],
  ["ghana", "Africa"],
  ["tanzania", "Africa"],
  ["uganda", "Africa"],
  ["ethiopia", "Africa"],
  ["australia", "Oceania"],
  ["new zealand", "Oceania"],
  ["fiji", "Oceania"],
  ["british virgin islands", "North America"],
  ["georgia", "Asia"],
]);

const DEVELOPED_MARKETS = new Set<string>([
  "united states",
  "canada",
  "australia",
  "new zealand",
  "japan",
  "singapore",
  "south korea",
]);

const normalizeCountryName = (value: string): string => {
  const cleaned = cleanText(value);
  const normalized = normalizeLabel(cleaned);
  const alias = COUNTRY_ALIASES.get(normalized);

  if (alias) {
    return alias;
  }

  if (/^[A-Za-z]{2}$/.test(cleaned)) {
    const resolved = REGION_DISPLAY_NAMES.of(cleaned.toUpperCase());

    if (resolved && resolved !== cleaned.toUpperCase()) {
      return COUNTRY_ALIASES.get(normalizeLabel(resolved)) ?? resolved;
    }
  }

  return cleaned;
};

const normalizeUsStateName = (value: string): string => {
  const cleaned = cleanText(value);
  const normalized = normalizeLabel(cleaned);

  if (!normalized) {
    return "";
  }

  return US_STATE_ALIASES.get(normalized) ?? cleaned;
};

const resolveMapCountry = (
  row: {
    shipping_country__c?: unknown;
    billing_country__c?: unknown;
  },
  customerChannel: RevenueFilters["customerChannel"],
): string => {
  const shippingCountry = normalizeCountryName(cleanText(row.shipping_country__c));
  const billingCountry = normalizeCountryName(cleanText(row.billing_country__c));

  if (customerChannel === PARTNER_CUSTOMER_CHANNEL) {
    return shippingCountry || billingCountry;
  }

  if (shippingCountry && normalizeLabel(shippingCountry) !== "united states") {
    return shippingCountry;
  }

  return billingCountry || shippingCountry;
};

const resolveMapState = (
  row: {
    shipping_state__c?: unknown;
    billing_state__c?: unknown;
  },
  customerChannel: RevenueFilters["customerChannel"],
  country: string,
): string => {
  if (normalizeLabel(country) !== "united states") {
    return "";
  }

  const shippingState = normalizeUsStateName(cleanText(row.shipping_state__c));
  const billingState = normalizeUsStateName(cleanText(row.billing_state__c));

  if (customerChannel === PARTNER_CUSTOMER_CHANNEL) {
    return shippingState || billingState;
  }

  return billingState;
};

const resolveContinent = (country: string): string => {
  const normalized = normalizeLabel(country);
  return COUNTRY_TO_CONTINENT.get(normalized) ?? "Other";
};

const isEmergingMarketCandidate = (country: string, continent: string): boolean => {
  const normalized = normalizeLabel(country);

  if (continent === "Europe") {
    return false;
  }

  return !DEVELOPED_MARKETS.has(normalized);
};

const roundPct = (value: number | null): number | null =>
  value === null ? null : Math.round(value * 10) / 10;

const computeGrowthPct = (current: number, previous: number): number | null => {
  if (previous <= 0) {
    return current > 0 ? 100 : null;
  }

  return ((current - previous) / previous) * 100;
};

const sumMonthValues = (
  values: Map<string, number>,
  keys: readonly string[],
): number => keys.reduce((sum, key) => sum + (values.get(key) ?? 0), 0);

const toMonthKeys = (
  year: number,
  month: number,
  deltas: readonly number[],
): string[] =>
  deltas.map((delta) => {
    const shifted = shiftMonth(year, month, delta);
    return monthKey(shifted.year, shifted.month);
  });

const readCache = <T>(cache: Map<string, CacheEntry<T>>, key: string): T | null => {
  const hit = cache.get(key);

  if (!hit) {
    return null;
  }

  if (hit.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  cache.delete(key);
  cache.set(key, hit);

  return hit.payload;
};

const writeCache = <T>(cache: Map<string, CacheEntry<T>>, key: string, payload: T): void => {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const first = cache.keys().next().value;

    if (first) {
      cache.delete(first);
    }
  }

  cache.set(key, {
    payload,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
};

const buildFiltersKey = (filters: RevenueFilters): string =>
  `customer:${filters.customerChannel}:sales:${filters.salesChannel}`;

const humanizeToken = (value: string): string =>
  value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const resolveStageLabel = (record: TopDealRecord): string => {
  const status = cleanText(record.status__c);
  const subscriptionStatus = cleanText(record.Subscription__r?.status__c);

  if (status) {
    return humanizeToken(status);
  }

  if (subscriptionStatus) {
    return humanizeToken(subscriptionStatus);
  }

  return "Unknown";
};

const resolveTopDealOwner = (record: TopDealRecord): string => {
  const owner = cleanText(record.License_Owner__r?.Name);

  if (owner) {
    return owner;
  }

  const ownerFromMeta = cleanText(record.meta_license_owner__c);

  if (ownerFromMeta) {
    return ownerFromMeta;
  }

  const fallbackOwner = cleanText(record.Owner?.Name);

  return fallbackOwner || "Unassigned";
};

const resolveTopDealCompany = (record: TopDealRecord): string => {
  const company = cleanText(record.billing_company__c);

  if (company) {
    return company;
  }

  const firstName = cleanText(record.billing_first_name__c);
  const lastName = cleanText(record.billing_last_name__c);
  const person = [firstName, lastName].filter(Boolean).join(" ");

  return person || cleanText(record.Name) || "Unknown customer";
};

const resolveTopDealType = (record: TopDealRecord): string => {
  const orderType = cleanText(record.Order_Type__c);
  return orderType ? humanizeToken(orderType) : "Unknown";
};

const resolveTopDealLicenceType = (record: TopDealRecord): string => {
  const licenseType = cleanText(record.LicenseType__c);

  if (licenseType) {
    return humanizeToken(licenseType);
  }

  const subscriptionType = cleanText(record.SubscriptionType__c);

  return subscriptionType ? humanizeToken(subscriptionType) : "Unknown";
};

const resolveDerivedOrderType = (input: {
  metaType: string;
  isRenewal: boolean;
  isUpgrade: boolean;
}): OrderType => {
  const metaType = input.metaType.toLowerCase();

  if (metaType === "new" || metaType === "renewal" || metaType === "upgrade" || metaType === "downgrade") {
    return metaType;
  }

  if (input.isUpgrade) {
    return "upgrade";
  }

  if (input.isRenewal) {
    return "renewal";
  }

  return "new";
};

const resolvePaymentMethodLabel = (value: string): string =>
  PAYMENT_METHOD_LABELS[value] ?? humanizeToken(value) ?? "Unspecified";

const resolveValueSegmentLabel = (value: string): string =>
  VALUE_SEGMENT_LABELS[value] ?? VALUE_SEGMENT_LABELS[""];

const resolveSubscriptionStatusLabel = (value: string): string =>
  value ? humanizeToken(value) : "Unspecified";

const resolveBreakdownLabel = (fieldName: string, value: string): string => {
  if (!value) {
    return "Unspecified";
  }

  switch (fieldName) {
    case "payment_method__c":
      return resolvePaymentMethodLabel(value);
    case "Order_Type__c":
      return humanizeToken(value);
    case "meta_SalesChannel__c":
      return value;
    case "shipping_country__c":
      return normalizeCountryName(value);
    case "ValueSegment__c":
      return resolveValueSegmentLabel(value);
    default:
      return value;
  }
};

const buildChannelMetric = (
  summary: {
    count: number;
    total: number;
    customers: number;
  },
  newSubscriptions: number,
) => {
  const revenue = Math.round(summary.total);
  const orders = summary.count;

  return {
    revenue,
    orders,
    customers: summary.customers,
    avgDealSize: orders > 0 ? Math.round(revenue / orders) : 0,
    newSubscriptions,
  };
};

const normalizeBreakdownRows = (
  rows: BreakdownRecord[],
  fieldName: string,
) =>
  rows
    .map((row) => {
      const rawKey = cleanText(row[fieldName]);
      const key = rawKey || "unspecified";

      return {
        key,
        label: resolveBreakdownLabel(fieldName, rawKey),
        orders: toInteger(row.cnt),
        revenue: Math.round(toNumber(row.total)),
      };
    })
    .filter((row) => row.orders > 0 || row.revenue > 0);

const normalizeOrderTypeBreakdownRows = (
  rows: OrderTypeBreakdownRecord[],
) => {
  const merged = new Map<
    OrderType,
    {
      key: OrderType;
      label: string;
      orders: number;
      revenue: number;
    }
  >();

  for (const row of rows) {
    const key = resolveDerivedOrderType({
      metaType: cleanText(row.meta_type__c),
      isRenewal: toBoolean(row.meta_is_renewal__c),
      isUpgrade: toBoolean(row.meta_is_upgrade__c),
    });
    const current =
      merged.get(key) ??
      {
        key,
        label: humanizeToken(key),
        orders: 0,
        revenue: 0,
      };

    current.orders += toInteger(row.cnt);
    current.revenue += Math.round(toNumber(row.total));
    merged.set(key, current);
  }

  return ORDER_TYPES.map((orderType) => merged.get(orderType))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .filter((row) => row.orders > 0 || row.revenue > 0);
};

const normalizeSubscriptionStatusRows = (rows: SubscriptionStatusRecord[]) =>
  rows
    .map((row) => {
      const rawStatus = cleanText(row.status__c);

      return {
        key: rawStatus || "unspecified",
        label: resolveSubscriptionStatusLabel(rawStatus),
        count: toInteger(row.cnt),
      };
    })
    .filter((row) => row.count > 0);

const buildIntervalDailyOrderTypeRevenueSeries = (
  rows: OrderTypeDailyBreakdownRecord[],
  window: RevenueWindow,
  enabled: boolean,
) => {
  if (!enabled) {
    return {
      intervalDailyLabels: [],
      intervalDailyOrderTypeRevenue: ORDER_TYPES.reduce<Record<string, number[]>>((acc, orderType) => {
        acc[orderType] = [];
        return acc;
      }, {}),
    };
  }

  const dates = buildDateKeys(window);
  const revenueByOrderType = ORDER_TYPES.reduce<Record<OrderType, Map<string, number>>>((acc, orderType) => {
    acc[orderType] = new Map<string, number>();
    return acc;
  }, {
    new: new Map<string, number>(),
    renewal: new Map<string, number>(),
    upgrade: new Map<string, number>(),
    downgrade: new Map<string, number>(),
  });

  for (const row of rows) {
    const year = toInteger(row.yr);
    const month = toInteger(row.mo);
    const day = toInteger(row.dy);

    if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
      continue;
    }

    const orderType = resolveDerivedOrderType({
      metaType: cleanText(row.meta_type__c),
      isRenewal: toBoolean(row.meta_is_renewal__c),
      isUpgrade: toBoolean(row.meta_is_upgrade__c),
    });
    const key = dateKey(year, month, day);
    const current = revenueByOrderType[orderType].get(key) ?? 0;

    revenueByOrderType[orderType].set(key, current + Math.round(toNumber(row.total)));
  }

  return {
    intervalDailyLabels: dates.map(formatDayLabel),
    intervalDailyOrderTypeRevenue: ORDER_TYPES.reduce<Record<string, number[]>>((acc, orderType) => {
      acc[orderType] = dates.map((key) => revenueByOrderType[orderType].get(key) ?? 0);
      return acc;
    }, {}),
  };
};

const buildValueSegmentRows = (
  mtdRows: BreakdownRecord[],
  ytdRows: BreakdownRecord[],
) => {
  const merged = new Map<
    string,
    {
      key: string;
      label: string;
      revenueMtd: number;
      ordersMtd: number;
      revenueYtd: number;
      ordersYtd: number;
    }
  >();

  const readRows = (
    rows: BreakdownRecord[],
    variant: "mtd" | "ytd",
  ) => {
    for (const row of rows) {
      const rawKey = cleanText(row.ValueSegment__c);
      const key = VALUE_SEGMENT_KEYS.includes(rawKey as (typeof VALUE_SEGMENT_KEYS)[number])
        ? rawKey
        : "";
      const current =
        merged.get(key) ??
        {
          key: key || "unspecified",
          label: resolveValueSegmentLabel(key),
          revenueMtd: 0,
          ordersMtd: 0,
          revenueYtd: 0,
          ordersYtd: 0,
        };

      if (variant === "mtd") {
        current.revenueMtd += Math.round(toNumber(row.total));
        current.ordersMtd += toInteger(row.cnt);
      } else {
        current.revenueYtd += Math.round(toNumber(row.total));
        current.ordersYtd += toInteger(row.cnt);
      }

      merged.set(key, current);
    }
  };

  readRows(mtdRows, "mtd");
  readRows(ytdRows, "ytd");

  return VALUE_SEGMENT_KEYS.map((segmentKey) => {
    const row =
      merged.get(segmentKey) ??
      {
        key: segmentKey || "unspecified",
        label: resolveValueSegmentLabel(segmentKey),
        revenueMtd: 0,
        ordersMtd: 0,
        revenueYtd: 0,
        ordersYtd: 0,
      };

    return {
      ...row,
      avgOrderValueMtd: row.ordersMtd > 0 ? Math.round(row.revenueMtd / row.ordersMtd) : 0,
      avgOrderValueYtd: row.ordersYtd > 0 ? Math.round(row.revenueYtd / row.ordersYtd) : 0,
    };
  }).filter((row) => row.revenueMtd > 0 || row.ordersMtd > 0 || row.revenueYtd > 0 || row.ordersYtd > 0);
};

const normalizeSeries = (
  rows: CountryMonthAggRecord[],
  customerChannel: RevenueFilters["customerChannel"],
): Map<string, CountrySeries> => {
  const series = new Map<string, CountrySeries>();

  for (const row of rows) {
    const country = resolveMapCountry(row, customerChannel);

    if (!country) {
      continue;
    }

    const year = toInteger(row.yr);
    const month = toInteger(row.mo);

    if (year <= 0 || month < 1 || month > 12) {
      continue;
    }

    const key = monthKey(year, month);
    const current =
      series.get(country) ??
      {
        country,
        continent: resolveContinent(country),
        revenueByMonth: new Map<string, number>(),
        ordersByMonth: new Map<string, number>(),
      };

    current.revenueByMonth.set(key, (current.revenueByMonth.get(key) ?? 0) + Math.round(toNumber(row.total)));
    current.ordersByMonth.set(key, (current.ordersByMonth.get(key) ?? 0) + toInteger(row.cnt));

    series.set(country, current);
  }

  return series;
};

const normalizePreviousSnapshot = (
  rows: CountrySnapshotAggRecord[],
  customerChannel: RevenueFilters["customerChannel"],
): Map<string, PreviousSnapshot> => {
  const snapshot = new Map<string, PreviousSnapshot>();

  for (const row of rows) {
    const country = resolveMapCountry(row, customerChannel);

    if (!country) {
      continue;
    }

    const current = snapshot.get(country) ?? { revenue: 0, orders: 0 };
    current.revenue += Math.round(toNumber(row.total));
    current.orders += toInteger(row.cnt);
    snapshot.set(country, current);
  }

  return snapshot;
};

const buildLocationPins = (
  rows: LocationAggRecord[],
  customerChannel: RevenueFilters["customerChannel"],
) => {
  const locations = new Map<
    string,
    {
      label: string;
      country: string;
      state: string | null;
      scope: "country" | "us-state";
      orders: number;
      revenue: number;
    }
  >();

  for (const row of rows) {
    const country = resolveMapCountry(row, customerChannel);

    if (!country) {
      continue;
    }

    const normalizedCountry = normalizeLabel(country);
    const normalizedState = resolveMapState(row, customerChannel, country);
    const isUsState = normalizedCountry === "united states" && normalizedState.length > 0;
    const key = isUsState
      ? `us-state:${normalizeLabel(normalizedState)}`
      : `country:${normalizedCountry}`;
    const current =
      locations.get(key) ?? {
        label: isUsState ? normalizedState : country,
        country,
        state: isUsState ? normalizedState : null,
        scope: isUsState ? "us-state" : "country",
        orders: 0,
        revenue: 0,
      };

    current.orders += toInteger(row.cnt);
    current.revenue += Math.round(toNumber(row.total));
    locations.set(key, current);
  }

  return [...locations.values()]
    .filter((location) => location.orders > 0 || location.revenue > 0)
    .sort((left, right) => right.orders - left.orders || right.revenue - left.revenue);
};

const buildContinentYtdRows = (
  currentRows: CountrySnapshotAggRecord[],
  previousRows: CountrySnapshotAggRecord[],
  customerChannel: RevenueFilters["customerChannel"],
) => {
  const currentRevenueByContinent = new Map<string, number>();
  const previousRevenueByContinent = new Map<string, number>();

  for (const row of currentRows) {
    const country = resolveMapCountry(row, customerChannel);

    if (!country) {
      continue;
    }

    const continent = resolveContinent(country);
    currentRevenueByContinent.set(
      continent,
      (currentRevenueByContinent.get(continent) ?? 0) + Math.round(toNumber(row.total)),
    );
  }

  for (const row of previousRows) {
    const country = resolveMapCountry(row, customerChannel);

    if (!country) {
      continue;
    }

    const continent = resolveContinent(country);
    previousRevenueByContinent.set(
      continent,
      (previousRevenueByContinent.get(continent) ?? 0) + Math.round(toNumber(row.total)),
    );
  }

  return [...new Set([...currentRevenueByContinent.keys(), ...previousRevenueByContinent.keys()])]
    .map((continent) => ({
      continent,
      currentRevenue: currentRevenueByContinent.get(continent) ?? 0,
      previousRevenue: previousRevenueByContinent.get(continent) ?? 0,
    }))
    .filter((row) => row.currentRevenue > 0 || row.previousRevenue > 0)
    .sort(
      (left, right) =>
        Math.max(right.currentRevenue, right.previousRevenue) -
          Math.max(left.currentRevenue, left.previousRevenue) ||
        right.currentRevenue - left.currentRevenue,
    );
};

const buildSurgeMetric = (
  series: CountrySeries,
  currentYear: number,
  currentMonth: number,
): SurgeMetric | null => {
  const sameMonthLastYear = monthKey(currentYear - 1, currentMonth);
  const currentMonthKey = monthKey(currentYear, currentMonth);
  const currentRollingKeys = toMonthKeys(currentYear, currentMonth, [-2, -1, 0]);
  const priorRollingKeys = toMonthKeys(currentYear, currentMonth, [-5, -4, -3]);

  const candidates: SurgeMetric[] = [];
  const revenueYoY = computeGrowthPct(
    series.revenueByMonth.get(currentMonthKey) ?? 0,
    series.revenueByMonth.get(sameMonthLastYear) ?? 0,
  );
  const ordersYoY = computeGrowthPct(
    series.ordersByMonth.get(currentMonthKey) ?? 0,
    series.ordersByMonth.get(sameMonthLastYear) ?? 0,
  );
  const revenueRolling3 = computeGrowthPct(
    sumMonthValues(series.revenueByMonth, currentRollingKeys),
    sumMonthValues(series.revenueByMonth, priorRollingKeys),
  );
  const ordersRolling3 = computeGrowthPct(
    sumMonthValues(series.ordersByMonth, currentRollingKeys),
    sumMonthValues(series.ordersByMonth, priorRollingKeys),
  );

  if (revenueYoY !== null) {
    candidates.push({ label: "Revenue YoY", pct: revenueYoY });
  }

  if (ordersYoY !== null) {
    candidates.push({ label: "Orders YoY", pct: ordersYoY });
  }

  if (revenueRolling3 !== null) {
    candidates.push({ label: "Revenue 3M", pct: revenueRolling3 });
  }

  if (ordersRolling3 !== null) {
    candidates.push({ label: "Orders 3M", pct: ordersRolling3 });
  }

  if (candidates.length === 0) {
    return null;
  }

  return candidates.sort((left, right) => right.pct - left.pct)[0] ?? null;
};

const buildMapPayload = (
  now: Date,
  customerChannel: RevenueFilters["customerChannel"],
  interval: ScorecardMapInterval,
  currentWindow: RevenueWindow,
  comparisonWindow: RevenueWindow,
  seriesRows: CountryMonthAggRecord[],
  currentRows: CountrySnapshotAggRecord[],
  previousRows: CountrySnapshotAggRecord[],
  previousYearRows: CountrySnapshotAggRecord[],
  locationRows: LocationAggRecord[],
): SfScorecardMapResponse => {
  const asOfDate = formatDateOnlyUtc(now);
  const { year: currentYear, month: currentMonth } = parseDateOnly(asOfDate);
  const { currentLabel, previousLabel } = buildMapComparisonLabels(
    interval,
    currentWindow,
    comparisonWindow,
  );
  const series = normalizeSeries(seriesRows, customerChannel);
  const currentSnapshot = normalizePreviousSnapshot(currentRows, customerChannel);
  const previousSnapshot = normalizePreviousSnapshot(previousRows, customerChannel);
  const previousYearSnapshot = normalizePreviousSnapshot(previousYearRows, customerChannel);

  const countryRows: SfScorecardMapCountry[] = [];
  let totalRevenue = 0;
  let totalOrders = 0;
  let previousTotalOrders = 0;

  for (const [country, current] of currentSnapshot.entries()) {
    const countrySeries =
      series.get(country) ??
      {
        country,
        continent: resolveContinent(country),
        revenueByMonth: new Map<string, number>(),
        ordersByMonth: new Map<string, number>(),
      };
    const previous = previousSnapshot.get(country) ?? { revenue: 0, orders: 0 };
    const surgeMetric = buildSurgeMetric(countrySeries, currentYear, currentMonth);
    const revenue = current.revenue;
    const orders = current.orders;

    if (revenue === 0 && orders === 0) {
      continue;
    }

    totalRevenue += revenue;
    totalOrders += orders;
    previousTotalOrders += previous.orders;

    countryRows.push({
      country,
      continent: countrySeries.continent,
      revenue,
      orders,
      momGrowthPct: roundPct(computeGrowthPct(revenue, previous.revenue)),
      revenueSharePct: 0,
      surgeLabel: surgeMetric?.label ?? null,
      surgePct: roundPct(surgeMetric?.pct ?? null),
    });
  }

  const countryRowsWithShare = countryRows
    .map((row) => ({
      ...row,
      revenueSharePct: totalRevenue > 0 ? roundPct((row.revenue / totalRevenue) * 100) ?? 0 : 0,
    }))
    .sort((left, right) => right.revenue - left.revenue);

  const continentAccumulator = new Map<
    string,
    {
      continent: string;
      revenue: number;
      orders: number;
      previousRevenue: number;
      previousYearRevenue: number;
      countries: SfScorecardMapCountry[];
    }
  >();

  for (const row of countryRowsWithShare) {
    const current =
      continentAccumulator.get(row.continent) ?? {
        continent: row.continent,
        revenue: 0,
        orders: 0,
        previousRevenue: 0,
        previousYearRevenue: 0,
        countries: [],
      };
    const previous = previousSnapshot.get(row.country) ?? { revenue: 0, orders: 0 };
    const previousYear = previousYearSnapshot.get(row.country) ?? { revenue: 0, orders: 0 };

    current.revenue += row.revenue;
    current.orders += row.orders;
    current.previousRevenue += previous.revenue;
    current.previousYearRevenue += previousYear.revenue;
    current.countries.push(row);
    continentAccumulator.set(row.continent, current);
  }

  const continentTable = [...continentAccumulator.values()]
    .map((row) => ({
      continent: row.continent,
      revenue: row.revenue,
      orders: row.orders,
      momGrowthPct: roundPct(computeGrowthPct(row.revenue, row.previousRevenue)),
      yoyGrowthPct: roundPct(computeGrowthPct(row.revenue, row.previousYearRevenue)),
      revenueSharePct: totalRevenue > 0 ? roundPct((row.revenue / totalRevenue) * 100) ?? 0 : 0,
      countries: row.countries,
    }))
    .sort((left, right) => right.revenue - left.revenue);

  const topContinent =
    continentTable[0] ?? {
      continent: "No live data",
      revenue: 0,
      revenueSharePct: 0,
      countries: [],
    };
  const europe =
    continentTable.find((row) => row.continent === "Europe") ?? {
      continent: "Europe",
      revenue: 0,
      orders: 0,
      momGrowthPct: null,
      yoyGrowthPct: null,
      revenueSharePct: 0,
      countries: [],
    };

  let emergingCountries = countryRowsWithShare
    .filter(
      (row) =>
        isEmergingMarketCandidate(row.country, row.continent) &&
        row.surgePct !== null &&
        row.surgePct >= 15,
    )
    .sort((left, right) => (right.surgePct ?? -Infinity) - (left.surgePct ?? -Infinity) || right.revenue - left.revenue);

  if (emergingCountries.length === 0) {
    emergingCountries = countryRowsWithShare
      .filter((row) => isEmergingMarketCandidate(row.country, row.continent))
      .sort((left, right) => (right.surgePct ?? -Infinity) - (left.surgePct ?? -Infinity) || right.revenue - left.revenue)
      .slice(0, 8);
  }

  const emergingRevenue = emergingCountries.reduce((sum, row) => sum + row.revenue, 0);
  const ytdComparison = buildContinentYtdRows(currentRows, previousYearRows, customerChannel);
  const locationPins = buildLocationPins(locationRows, customerChannel);
  const comparisonCurrentYear = parseDateOnly(currentWindow.to).year;
  const comparisonPreviousYear = parseDateOnly(comparisonWindow.to).year;

  return sfScorecardMapResponseSchema.parse({
    asOfDate,
    ordersThisMonth: totalOrders,
    ordersMoMGrowthPct: roundPct(computeGrowthPct(totalOrders, previousTotalOrders)),
    topContinent: {
      continent: topContinent.continent,
      revenue: topContinent.revenue,
      revenueSharePct: topContinent.revenueSharePct,
      countries: topContinent.countries,
    },
    emergingMarkets: {
      revenue: emergingRevenue,
      revenueSharePct: totalRevenue > 0 ? roundPct((emergingRevenue / totalRevenue) * 100) ?? 0 : 0,
      countries: emergingCountries,
    },
    europe: {
      revenue: europe.revenue,
      revenueSharePct: europe.revenueSharePct,
      countries: europe.countries,
    },
    ytdComparison: {
      currentYear: comparisonCurrentYear,
      previousYear: comparisonPreviousYear,
      currentLabel,
      previousLabel,
      currentPeriodStartDate: currentWindow.from,
      currentPeriodEndDate: currentWindow.to,
      previousPeriodStartDate: comparisonWindow.from,
      previousPeriodEndDate: comparisonWindow.to,
      continents: ytdComparison,
    },
    continentTable,
    locationPins,
  });
};

const loadScorecardMapPayload = async (
  filters: RevenueFilters,
  interval: ScorecardMapInterval,
  now: Date,
): Promise<SfScorecardMapResponse> => {
  const currentWindow = buildMapIntervalWindow(interval, now);
  const previousWindow = buildMapPriorPeriodWindow(interval, now);
  const previousYearWindow = buildMapYoYWindow(interval, now);
  const seriesWindow = buildCountrySeriesWindow(now);
  const customerChannels = resolveCustomerChannels(filters.customerChannel);

  const [seriesRows, currentRows, previousRows, previousYearRows, locationRows] = await Promise.all([
    querySalesforce<CountryMonthAggRecord>(
      buildCountrySeriesQuery(seriesWindow, customerChannels, filters.salesChannel),
    ),
    querySalesforce<CountrySnapshotAggRecord>(
      buildCountrySnapshotQuery(currentWindow, customerChannels, filters.salesChannel),
    ),
    querySalesforce<CountrySnapshotAggRecord>(
      buildCountrySnapshotQuery(previousWindow, customerChannels, filters.salesChannel),
    ),
    querySalesforce<CountrySnapshotAggRecord>(
      buildCountrySnapshotQuery(previousYearWindow, customerChannels, filters.salesChannel),
    ),
    querySalesforce<LocationAggRecord>(
      buildLocationSnapshotQuery(currentWindow, customerChannels, filters.salesChannel),
    ),
  ]);

  return buildMapPayload(
    now,
    filters.customerChannel,
    interval,
    currentWindow,
    previousYearWindow,
    seriesRows,
    currentRows,
    previousRows,
    previousYearRows,
    locationRows,
  );
};

const buildTopDealsPayload = (
  now: Date,
  totals: {
    count: number;
    total: number;
  },
  rows: TopDealRecord[],
): SfTopDealsResponse =>
  sfTopDealsResponseSchema.parse({
    asOfDate: formatDateOnlyUtc(now),
    totalAmount: Math.round(totals.total),
    totalDeals: totals.count,
    deals: rows.map((row) => ({
      id: cleanText(row.Id) || cleanText(row.Name) || crypto.randomUUID(),
      company: resolveTopDealCompany(row),
      owner: resolveTopDealOwner(row),
      amount: Math.round(toNumber(row.Totalextax__c)),
      type: resolveTopDealType(row),
      licenceType: resolveTopDealLicenceType(row),
      stage: resolveStageLabel(row),
    })),
  });

const buildTodaySummaryPayload = (
  now: Date,
  currentOrders: {
    count: number;
    total: number;
  },
  previousOrders: {
    count: number;
    total: number;
  },
  currentByType: Record<OrderType, number>,
  previousByType: Record<OrderType, number>,
  currentPipelineAdded: number,
  previousPipelineAdded: number,
): SfTodaySummaryResponse => {
  const currentAvgDealSize =
    currentOrders.count > 0 ? Math.round(currentOrders.total / currentOrders.count) : 0;
  const previousAvgDealSize =
    previousOrders.count > 0 ? Math.round(previousOrders.total / previousOrders.count) : 0;

  return sfTodaySummaryResponseSchema.parse({
    asOfDate: formatDateOnlyUtc(now),
    totalRevenue: Math.round(currentOrders.total),
    revenueDiff: Math.round(currentOrders.total - previousOrders.total),
    newLicences: currentByType.new,
    newLicencesDiff: currentByType.new - previousByType.new,
    renewals: currentByType.renewal,
    renewalsDiff: currentByType.renewal - previousByType.renewal,
    upgrades: currentByType.upgrade,
    upgradesDiff: currentByType.upgrade - previousByType.upgrade,
    avgDealSize: currentAvgDealSize,
    avgDealSizeDiff: currentAvgDealSize - previousAvgDealSize,
    pipelineAdded: Math.round(currentPipelineAdded),
    pipelineAddedDiff: Math.round(currentPipelineAdded - previousPipelineAdded),
  });
};

const loadTopDealsPayload = async (
  filters: RevenueFilters,
  now: Date,
): Promise<SfTopDealsResponse> => {
  const today = formatDateOnlyUtc(now);
  const customerChannels = resolveCustomerChannels(filters.customerChannel);
  const todayWindow = {
    from: today,
    to: today,
  };
  const [aggregateRows, rows] = await Promise.all([
    querySalesforce<AggregateRecord>(
      buildOrderAggregateQuery(todayWindow, customerChannels, filters.salesChannel),
    ),
    querySalesforce<TopDealRecord>(
      buildTopDealsQuery(
        todayWindow,
        customerChannels,
        filters.salesChannel,
      ),
    ),
  ]);

  return buildTopDealsPayload(now, readAggregateSummary(aggregateRows), rows);
};

const loadTodaySummaryPayload = async (
  filters: RevenueFilters,
  now: Date,
): Promise<SfTodaySummaryResponse> => {
  const today = formatDateOnlyUtc(now);
  const todayWindow = {
    from: today,
    to: today,
  };
  const previousDayWindow = shiftDayWindow(todayWindow, -1);
  const customerChannels = resolveCustomerChannels(filters.customerChannel);

  const currentOrdersPromise = querySalesforce<AggregateRecord>(
    buildOrderAggregateQuery(todayWindow, customerChannels, filters.salesChannel),
  );
  const previousOrdersPromise = querySalesforce<AggregateRecord>(
    buildOrderAggregateQuery(previousDayWindow, customerChannels, filters.salesChannel),
  );
  const currentByTypePromises = ORDER_TYPES.map((orderType) =>
    querySalesforce<AggregateRecord>(
      buildOrderAggregateQuery(todayWindow, customerChannels, filters.salesChannel, orderType),
    ),
  );
  const previousByTypePromises = ORDER_TYPES.map((orderType) =>
    querySalesforce<AggregateRecord>(
      buildOrderAggregateQuery(previousDayWindow, customerChannels, filters.salesChannel, orderType),
    ),
  );
  const currentPipelinePromise = querySalesforce<AggregateRecord>(
    buildPipelineAddedQuery(todayWindow),
  );
  const previousPipelinePromise = querySalesforce<AggregateRecord>(
    buildPipelineAddedQuery(previousDayWindow),
  );

  const [
    currentOrdersRows,
    previousOrdersRows,
    currentTypeRows,
    previousTypeRows,
    currentPipelineRows,
    previousPipelineRows,
  ] = await Promise.all([
    currentOrdersPromise,
    previousOrdersPromise,
    Promise.all(currentByTypePromises),
    Promise.all(previousByTypePromises),
    currentPipelinePromise,
    previousPipelinePromise,
  ]);

  const currentByType = ORDER_TYPES.reduce<Record<OrderType, number>>((acc, orderType, index) => {
    acc[orderType] = readAggregateSummary(currentTypeRows[index] ?? []).count;
    return acc;
  }, {
    new: 0,
    renewal: 0,
    upgrade: 0,
    downgrade: 0,
  });
  const previousByType = ORDER_TYPES.reduce<Record<OrderType, number>>((acc, orderType, index) => {
    acc[orderType] = readAggregateSummary(previousTypeRows[index] ?? []).count;
    return acc;
  }, {
    new: 0,
    renewal: 0,
    upgrade: 0,
    downgrade: 0,
  });

  return buildTodaySummaryPayload(
    now,
    readAggregateSummary(currentOrdersRows),
    readAggregateSummary(previousOrdersRows),
    currentByType,
    previousByType,
    readAggregateSummary(currentPipelineRows).total,
    readAggregateSummary(previousPipelineRows).total,
  );
};

const buildChannelDashboardPayload = (
  filters: RevenueFilters,
  intervalWindow: RevenueWindow,
  now: Date,
  input: {
    currentMtd: DashboardAggregateRecord[];
    previousMtd: DashboardAggregateRecord[];
    currentYtd: DashboardAggregateRecord[];
    previousYtd: DashboardAggregateRecord[];
    currentMtdNewSubscriptions: AggregateRecord[];
    previousMtdNewSubscriptions: AggregateRecord[];
    currentYtdNewSubscriptions: AggregateRecord[];
    previousYtdNewSubscriptions: AggregateRecord[];
    paymentMethodsMtd: BreakdownRecord[];
    orderTypesMtd: OrderTypeBreakdownRecord[];
    salesChannelsMtd: BreakdownRecord[];
    licenseTypesYtd: BreakdownRecord[];
    topCountriesYtd: BreakdownRecord[];
    subscriptionStatuses: SubscriptionStatusRecord[];
    includeIntervalDailyOrderTypes: boolean;
    intervalDailyOrderTypes: OrderTypeDailyBreakdownRecord[];
    valueSegmentsMtd: BreakdownRecord[];
    valueSegmentsYtd: BreakdownRecord[];
  },
): SfScorecardChannelDashboardResponse =>
  sfScorecardChannelDashboardResponseSchema.parse({
    asOfDate: formatDateOnlyUtc(now),
    customerChannel: filters.customerChannel,
    salesChannel: filters.salesChannel,
    mtd: buildChannelMetric(
      readDashboardAggregateSummary(input.currentMtd),
      readAggregateSummary(input.currentMtdNewSubscriptions).count,
    ),
    previousMtd: buildChannelMetric(
      readDashboardAggregateSummary(input.previousMtd),
      readAggregateSummary(input.previousMtdNewSubscriptions).count,
    ),
    ytd: buildChannelMetric(
      readDashboardAggregateSummary(input.currentYtd),
      readAggregateSummary(input.currentYtdNewSubscriptions).count,
    ),
    previousYtd: buildChannelMetric(
      readDashboardAggregateSummary(input.previousYtd),
      readAggregateSummary(input.previousYtdNewSubscriptions).count,
    ),
    paymentMethodsMtd: normalizeBreakdownRows(input.paymentMethodsMtd, "payment_method__c"),
    orderTypesMtd: normalizeOrderTypeBreakdownRows(input.orderTypesMtd),
    salesChannelsMtd: normalizeBreakdownRows(input.salesChannelsMtd, "meta_SalesChannel__c"),
    licenseTypesYtd: normalizeBreakdownRows(input.licenseTypesYtd, "LicenseType__c"),
    topCountriesYtd: normalizeBreakdownRows(input.topCountriesYtd, "shipping_country__c"),
    subscriptionStatuses: normalizeSubscriptionStatusRows(input.subscriptionStatuses),
    ...buildIntervalDailyOrderTypeRevenueSeries(
      input.intervalDailyOrderTypes,
      intervalWindow,
      input.includeIntervalDailyOrderTypes,
    ),
    valueSegments: buildValueSegmentRows(input.valueSegmentsMtd, input.valueSegmentsYtd),
  });

const loadScorecardChannelDashboardPayload = async (
  filters: RevenueFilters,
  intervalWindow: RevenueWindow,
  now: Date,
): Promise<SfScorecardChannelDashboardResponse> => {
  const customerChannels = resolveCustomerChannels(filters.customerChannel);
  const currentMtdWindow = buildMonthToDateWindow(now);
  const previousMtdWindow = buildPreviousMonthToDateWindow(now);
  const currentYtdWindow = buildYearToDateWindow(now, 0);
  const previousYtdWindow = buildYearToDateWindow(now, -1);
  const includeIntervalDailyOrderTypes = countDaysInWindow(intervalWindow) <= 31;

  const [
    currentMtd,
    previousMtd,
    currentYtd,
    previousYtd,
    currentMtdNewSubscriptions,
    previousMtdNewSubscriptions,
    currentYtdNewSubscriptions,
    previousYtdNewSubscriptions,
    paymentMethodsMtd,
    orderTypesMtd,
    salesChannelsMtd,
    licenseTypesYtd,
    topCountriesYtd,
    subscriptionStatuses,
    intervalDailyOrderTypes,
    valueSegmentsMtd,
    valueSegmentsYtd,
  ] = await Promise.all([
    querySalesforce<DashboardAggregateRecord>(
      buildDashboardOrderSummaryQuery(currentMtdWindow, customerChannels, filters.salesChannel),
    ),
    querySalesforce<DashboardAggregateRecord>(
      buildDashboardOrderSummaryQuery(previousMtdWindow, customerChannels, filters.salesChannel),
    ),
    querySalesforce<DashboardAggregateRecord>(
      buildDashboardOrderSummaryQuery(currentYtdWindow, customerChannels, filters.salesChannel),
    ),
    querySalesforce<DashboardAggregateRecord>(
      buildDashboardOrderSummaryQuery(previousYtdWindow, customerChannels, filters.salesChannel),
    ),
    querySalesforce<AggregateRecord>(
      buildNewSubscriptionsQuery(currentMtdWindow, customerChannels, filters.salesChannel),
    ),
    querySalesforce<AggregateRecord>(
      buildNewSubscriptionsQuery(previousMtdWindow, customerChannels, filters.salesChannel),
    ),
    querySalesforce<AggregateRecord>(
      buildNewSubscriptionsQuery(currentYtdWindow, customerChannels, filters.salesChannel),
    ),
    querySalesforce<AggregateRecord>(
      buildNewSubscriptionsQuery(previousYtdWindow, customerChannels, filters.salesChannel),
    ),
    querySalesforce<BreakdownRecord>(
      buildOrderBreakdownQuery(
        "payment_method__c",
        currentMtdWindow,
        customerChannels,
        filters.salesChannel,
        6,
      ),
    ),
    querySalesforce<OrderTypeBreakdownRecord>(
      buildOrderTypeBreakdownQuery(
        currentMtdWindow,
        customerChannels,
        filters.salesChannel,
      ),
    ),
    querySalesforce<BreakdownRecord>(
      buildOrderBreakdownQuery(
        "meta_SalesChannel__c",
        currentMtdWindow,
        customerChannels,
        filters.salesChannel,
        6,
      ),
    ),
    querySalesforce<BreakdownRecord>(
      buildOrderBreakdownQuery(
        "LicenseType__c",
        currentYtdWindow,
        customerChannels,
        filters.salesChannel,
        6,
      ),
    ),
    querySalesforce<BreakdownRecord>(
      buildOrderBreakdownQuery(
        "shipping_country__c",
        currentYtdWindow,
        customerChannels,
        filters.salesChannel,
        6,
      ),
    ),
    querySalesforce<SubscriptionStatusRecord>(
      buildSubscriptionStatusQuery(customerChannels, filters.salesChannel),
    ),
    includeIntervalDailyOrderTypes
      ? querySalesforce<OrderTypeDailyBreakdownRecord>(
          buildOrderTypeDailyBreakdownQuery(intervalWindow, customerChannels, filters.salesChannel),
        )
      : Promise.resolve([] as OrderTypeDailyBreakdownRecord[]),
    querySalesforce<BreakdownRecord>(
      buildOrderBreakdownQuery(
        "ValueSegment__c",
        currentMtdWindow,
        customerChannels,
        filters.salesChannel,
      ),
    ),
    querySalesforce<BreakdownRecord>(
      buildOrderBreakdownQuery(
        "ValueSegment__c",
        currentYtdWindow,
        customerChannels,
        filters.salesChannel,
      ),
    ),
  ]);

  return buildChannelDashboardPayload(filters, intervalWindow, now, {
    currentMtd,
    previousMtd,
    currentYtd,
    previousYtd,
    currentMtdNewSubscriptions,
    previousMtdNewSubscriptions,
    currentYtdNewSubscriptions,
    previousYtdNewSubscriptions,
    paymentMethodsMtd,
    orderTypesMtd,
    salesChannelsMtd,
    licenseTypesYtd,
    topCountriesYtd,
    subscriptionStatuses,
    includeIntervalDailyOrderTypes,
    intervalDailyOrderTypes,
    valueSegmentsMtd,
    valueSegmentsYtd,
  });
};

export const getScorecardMapPayload = async (
  filters: RevenueFilters = {
    customerChannel: DEFAULT_REVENUE_CUSTOMER_CHANNEL,
    salesChannel: DEFAULT_REVENUE_SALES_CHANNEL,
  },
  interval: ScorecardMapInterval = DEFAULT_SCORECARD_MAP_INTERVAL,
  now: Date = new Date(),
): Promise<ScorecardServiceResult<SfScorecardMapResponse>> => {
  const cacheKey = `${formatDateOnlyUtc(now)}:${buildFiltersKey(filters)}:interval:${interval}`;
  const cached = readCache(mapCache, cacheKey);

  if (cached) {
    return {
      payload: cached,
      cacheHit: true,
    };
  }

  const running = mapInFlight.get(cacheKey);

  if (running) {
    return {
      payload: await running,
      cacheHit: true,
    };
  }

  const task = loadScorecardMapPayload(filters, interval, now)
    .then((payload) => {
      writeCache(mapCache, cacheKey, payload);
      return payload;
    })
    .finally(() => {
      mapInFlight.delete(cacheKey);
    });

  mapInFlight.set(cacheKey, task);

  return {
    payload: await task,
    cacheHit: false,
  };
};

export const getScorecardTodaySummaryPayload = async (
  filters: RevenueFilters = {
    customerChannel: DEFAULT_REVENUE_CUSTOMER_CHANNEL,
    salesChannel: DEFAULT_REVENUE_SALES_CHANNEL,
  },
  now: Date = new Date(),
): Promise<ScorecardServiceResult<SfTodaySummaryResponse>> => {
  const cacheKey = `${formatDateOnlyUtc(now)}:${buildFiltersKey(filters)}:today-summary`;
  const cached = readCache(todaySummaryCache, cacheKey);

  if (cached) {
    return {
      payload: cached,
      cacheHit: true,
    };
  }

  const running = todaySummaryInFlight.get(cacheKey);

  if (running) {
    return {
      payload: await running,
      cacheHit: true,
    };
  }

  const task = loadTodaySummaryPayload(filters, now)
    .then((payload) => {
      writeCache(todaySummaryCache, cacheKey, payload);
      return payload;
    })
    .finally(() => {
      todaySummaryInFlight.delete(cacheKey);
    });

  todaySummaryInFlight.set(cacheKey, task);

  return {
    payload: await task,
    cacheHit: false,
  };
};

export const getScorecardTopDealsPayload = async (
  filters: RevenueFilters = {
    customerChannel: DEFAULT_REVENUE_CUSTOMER_CHANNEL,
    salesChannel: DEFAULT_REVENUE_SALES_CHANNEL,
  },
  now: Date = new Date(),
): Promise<ScorecardServiceResult<SfTopDealsResponse>> => {
  const cacheKey = `${formatDateOnlyUtc(now)}:${buildFiltersKey(filters)}`;
  const cached = readCache(topDealsCache, cacheKey);

  if (cached) {
    return {
      payload: cached,
      cacheHit: true,
    };
  }

  const running = topDealsInFlight.get(cacheKey);

  if (running) {
    return {
      payload: await running,
      cacheHit: true,
    };
  }

  const task = loadTopDealsPayload(filters, now)
    .then((payload) => {
      writeCache(topDealsCache, cacheKey, payload);
      return payload;
    })
    .finally(() => {
      topDealsInFlight.delete(cacheKey);
    });

  topDealsInFlight.set(cacheKey, task);

  return {
    payload: await task,
    cacheHit: false,
  };
};

export const getScorecardChannelDashboardPayload = async (
  filters: RevenueFilters = {
    customerChannel: DEFAULT_REVENUE_CUSTOMER_CHANNEL,
    salesChannel: DEFAULT_REVENUE_SALES_CHANNEL,
  },
  intervalWindow: RevenueWindow,
  now: Date = new Date(),
): Promise<ScorecardServiceResult<SfScorecardChannelDashboardResponse>> => {
  const cacheKey = `${formatDateOnlyUtc(now)}:${buildFiltersKey(filters)}:channel-dashboard:${intervalWindow.from}:${intervalWindow.to}`;
  const cached = readCache(channelDashboardCache, cacheKey);

  if (cached) {
    return {
      payload: cached,
      cacheHit: true,
    };
  }

  const running = channelDashboardInFlight.get(cacheKey);

  if (running) {
    return {
      payload: await running,
      cacheHit: true,
    };
  }

  const task = loadScorecardChannelDashboardPayload(filters, intervalWindow, now)
    .then((payload) => {
      writeCache(channelDashboardCache, cacheKey, payload);
      return payload;
    })
    .finally(() => {
      channelDashboardInFlight.delete(cacheKey);
    });

  channelDashboardInFlight.set(cacheKey, task);

  return {
    payload: await task,
    cacheHit: false,
  };
};
