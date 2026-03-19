import {
  DEFAULT_REVENUE_CUSTOMER_CHANNEL,
  DEFAULT_REVENUE_SALES_CHANNEL,
  sfRevenueResponseSchema,
  type RevenueCustomerChannel,
  type RevenueSalesChannel,
  type SfRevenueResponse,
} from "@contracts/sales";

import type { RevenueFilters, RevenueWindow } from "./schema";
import { formatDateOnlyUtc } from "./revenue-window";
import { querySalesforce } from "../../platform/salesforce/client";

const DIRECT_CUSTOMER_CHANNEL = "Direct Sales";
const PARTNER_CUSTOMER_CHANNEL = "Channel Partner Sales";

const ORDER_TYPES = ["new", "upgrade", "renewal", "downgrade"] as const;

type OrderType = (typeof ORDER_TYPES)[number];

type ChannelAggRecord = {
  meta_SalesChannel__c?: unknown;
  yr?: unknown;
  mo?: unknown;
  total?: unknown;
};

type OrderTypeAggRecord = {
  yr?: unknown;
  mo?: unknown;
  cnt?: unknown;
  total?: unknown;
};

type DailyAggRecord = {
  dy?: unknown;
  cnt?: unknown;
  total?: unknown;
};

type RangeDailyAggRecord = {
  yr?: unknown;
  mo?: unknown;
  dy?: unknown;
  cnt?: unknown;
  total?: unknown;
};

type NormalizedChannelRecord = {
  customerChannel: string;
  salesChannel: string;
  yr: number;
  mo: number;
  total: number;
};

type NormalizedOrderTypeRecord = {
  orderType: OrderType;
  yr: number;
  mo: number;
  total: number;
  count: number;
};

type ToplineTotals = {
  thisMonthTotal: number;
  prevMonthTotal: number;
  ytdTotal: number;
  prevYtdTotal: number;
};

type SnapshotTotals = {
  todayTotal: number;
  prevDayTotal: number;
};

type DailySeriesSnapshot = SnapshotTotals & {
  asOfDate: string;
  currentMonthDailyRevenue: number[];
  currentMonthDailyOrderTypeRevenue: Record<string, number[]>;
  priorYearMonthDailyRevenue: number[];
  currentMonthDailyOrders: number[];
  priorYearMonthDailyOrders: number[];
};

type RangeDailySnapshot = {
  rangeDailyLabels: string[];
  rangeDailyRevenue: number[];
  rangeDailyOrderTypeRevenue: Record<string, number[]>;
};

type CacheEntry = {
  payload: SfRevenueResponse;
  expiresAt: number;
};

const CACHE_TTL_MS = Number(process.env.SF_REVENUE_CACHE_TTL_MS ?? 5 * 60 * 1000);
const CACHE_MAX_ENTRIES = 24;

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<SfRevenueResponse>>();

const quoteLiteral = (value: string): string => `'${value.replace(/'/g, "\\'")}'`;
const quoteLiterals = (values: readonly string[]): string =>
  values.map(quoteLiteral).join(", ");

const ALL_CUSTOMER_CHANNELS = [
  DIRECT_CUSTOMER_CHANNEL,
  PARTNER_CUSTOMER_CHANNEL,
] as const;

const resolveCustomerChannels = (
  customerChannel: RevenueCustomerChannel,
): readonly string[] =>
  customerChannel === DEFAULT_REVENUE_CUSTOMER_CHANNEL
    ? ALL_CUSTOMER_CHANNELS
    : [customerChannel];

const buildSalesChannelClause = (salesChannel: RevenueSalesChannel): string | null =>
  salesChannel === DEFAULT_REVENUE_SALES_CHANNEL
    ? null
    : `AND meta_SalesChannel__c = ${quoteLiteral(salesChannel)}`;

const buildCustomerChannelsClause = (customerChannels: readonly string[]): string | null => {
  if (customerChannels.length === 0 || customerChannels.length === ALL_CUSTOMER_CHANNELS.length) {
    return null;
  }

  if (customerChannels.length === 1) {
    return `AND CustomerChannel__c = ${quoteLiteral(customerChannels[0])}`;
  }

  return `AND CustomerChannel__c IN (${quoteLiterals(customerChannels)})`;
};

const toNumber = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toInteger = (value: unknown): number => Math.trunc(toNumber(value));

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

const monthKey = (yr: number, mo: number): string => `${yr}-${String(mo).padStart(2, "0")}`;

const monthLabel = (key: string): string => {
  const [yearToken, monthToken] = key.split("-");
  const year = Number(yearToken);
  const month = Number(monthToken);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return key;
  }

  return `${MONTH_NAMES[month - 1]} '${String(year).slice(2)}`;
};

const dateKey = (yr: number, mo: number, dy: number): string =>
  `${yr}-${String(mo).padStart(2, "0")}-${String(dy).padStart(2, "0")}`;

const dateLabel = (key: string): string => {
  const [yearToken, monthToken, dayToken] = key.split("-");
  const year = Number(yearToken);
  const month = Number(monthToken);
  const day = Number(dayToken);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return key;
  }

  return `${MONTH_NAMES[month - 1]} ${day}`;
};

const buildDateKeys = (from: string, to: string): string[] => {
  const startParts = parseDateOnly(from);
  const endParts = parseDateOnly(to);
  const cursor = new Date(Date.UTC(startParts.year, startParts.month - 1, startParts.day));
  const end = new Date(Date.UTC(endParts.year, endParts.month - 1, endParts.day));
  const out: string[] = [];

  while (cursor.getTime() <= end.getTime()) {
    out.push(formatDateOnlyUtc(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return out;
};

const toSfDateTimeStart = (dateOnly: string): string => `${dateOnly}T00:00:00Z`;
const toSfDateTimeEnd = (dateOnly: string): string => `${dateOnly}T23:59:59Z`;

const buildChannelQuery = (
  customerChannel: string,
  { from, to }: RevenueWindow,
  salesChannel: RevenueSalesChannel,
): string => {
  const start = toSfDateTimeStart(from);
  const end = toSfDateTimeEnd(to);
  const salesChannelClause = buildSalesChannelClause(salesChannel);

  return [
    "SELECT meta_SalesChannel__c,",
    "CALENDAR_YEAR(OrderEffectiveDate__c) yr,",
    "CALENDAR_MONTH(OrderEffectiveDate__c) mo,",
    "SUM(Totalextax__c) total",
    "FROM woo_Order__c",
    `WHERE CustomerChannel__c = ${quoteLiteral(customerChannel)}`,
    salesChannelClause,
    `AND OrderEffectiveDate__c >= ${start}`,
    `AND OrderEffectiveDate__c <= ${end}`,
    "GROUP BY meta_SalesChannel__c, CALENDAR_YEAR(OrderEffectiveDate__c), CALENDAR_MONTH(OrderEffectiveDate__c)",
    "ORDER BY CALENDAR_YEAR(OrderEffectiveDate__c), CALENDAR_MONTH(OrderEffectiveDate__c), meta_SalesChannel__c",
  ].join(" ");
};

const buildOrderTypeQuery = (
  orderType: OrderType,
  { from, to }: RevenueWindow,
  customerChannels: readonly string[],
  salesChannel: RevenueSalesChannel,
): string => {
  const start = toSfDateTimeStart(from);
  const end = toSfDateTimeEnd(to);
  const customerChannelsClause = buildCustomerChannelsClause(customerChannels);
  const salesChannelClause = buildSalesChannelClause(salesChannel);

  return [
    "SELECT CALENDAR_YEAR(OrderEffectiveDate__c) yr,",
    "CALENDAR_MONTH(OrderEffectiveDate__c) mo,",
    "COUNT(Id) cnt,",
    "SUM(Totalextax__c) total",
    "FROM woo_Order__c",
    `WHERE Order_Type__c = ${quoteLiteral(orderType)}`,
    customerChannelsClause,
    salesChannelClause,
    `AND OrderEffectiveDate__c >= ${start}`,
    `AND OrderEffectiveDate__c <= ${end}`,
    "GROUP BY CALENDAR_YEAR(OrderEffectiveDate__c), CALENDAR_MONTH(OrderEffectiveDate__c)",
    "ORDER BY CALENDAR_YEAR(OrderEffectiveDate__c), CALENDAR_MONTH(OrderEffectiveDate__c)",
  ].join(" ");
};

const buildDailySeriesQuery = (
  { from, to }: RevenueWindow,
  customerChannels: readonly string[],
  salesChannel: RevenueSalesChannel,
): string => {
  const start = toSfDateTimeStart(from);
  const end = toSfDateTimeEnd(to);
  const customerChannelsClause = buildCustomerChannelsClause(customerChannels);
  const salesChannelClause = buildSalesChannelClause(salesChannel);

  return [
    "SELECT DAY_IN_MONTH(OrderEffectiveDate__c) dy,",
    "COUNT(Id) cnt,",
    "SUM(Totalextax__c) total",
    "FROM woo_Order__c",
    `WHERE OrderEffectiveDate__c >= ${start}`,
    `AND OrderEffectiveDate__c <= ${end}`,
    customerChannelsClause,
    salesChannelClause,
    "GROUP BY DAY_IN_MONTH(OrderEffectiveDate__c)",
    "ORDER BY DAY_IN_MONTH(OrderEffectiveDate__c)",
  ]
    .filter(Boolean)
    .join(" ");
};

const buildDailyOrderTypeRevenueQuery = (
  orderType: OrderType,
  { from, to }: RevenueWindow,
  customerChannels: readonly string[],
  salesChannel: RevenueSalesChannel,
): string => {
  const start = toSfDateTimeStart(from);
  const end = toSfDateTimeEnd(to);
  const customerChannelsClause = buildCustomerChannelsClause(customerChannels);
  const salesChannelClause = buildSalesChannelClause(salesChannel);

  return [
    "SELECT DAY_IN_MONTH(OrderEffectiveDate__c) dy,",
    "SUM(Totalextax__c) total",
    "FROM woo_Order__c",
    `WHERE Order_Type__c = ${quoteLiteral(orderType)}`,
    `AND OrderEffectiveDate__c >= ${start}`,
    `AND OrderEffectiveDate__c <= ${end}`,
    customerChannelsClause,
    salesChannelClause,
    "GROUP BY DAY_IN_MONTH(OrderEffectiveDate__c)",
    "ORDER BY DAY_IN_MONTH(OrderEffectiveDate__c)",
  ]
    .filter(Boolean)
    .join(" ");
};

const buildRangeDailySeriesQuery = (
  { from, to }: RevenueWindow,
  customerChannels: readonly string[],
  salesChannel: RevenueSalesChannel,
): string => {
  const start = toSfDateTimeStart(from);
  const end = toSfDateTimeEnd(to);
  const customerChannelsClause = buildCustomerChannelsClause(customerChannels);
  const salesChannelClause = buildSalesChannelClause(salesChannel);

  return [
    "SELECT CALENDAR_YEAR(OrderEffectiveDate__c) yr,",
    "CALENDAR_MONTH(OrderEffectiveDate__c) mo,",
    "DAY_IN_MONTH(OrderEffectiveDate__c) dy,",
    "COUNT(Id) cnt,",
    "SUM(Totalextax__c) total",
    "FROM woo_Order__c",
    `WHERE OrderEffectiveDate__c >= ${start}`,
    `AND OrderEffectiveDate__c <= ${end}`,
    customerChannelsClause,
    salesChannelClause,
    "GROUP BY CALENDAR_YEAR(OrderEffectiveDate__c), CALENDAR_MONTH(OrderEffectiveDate__c), DAY_IN_MONTH(OrderEffectiveDate__c)",
    "ORDER BY CALENDAR_YEAR(OrderEffectiveDate__c), CALENDAR_MONTH(OrderEffectiveDate__c), DAY_IN_MONTH(OrderEffectiveDate__c)",
  ]
    .filter(Boolean)
    .join(" ");
};

const buildRangeDailyOrderTypeRevenueQuery = (
  orderType: OrderType,
  { from, to }: RevenueWindow,
  customerChannels: readonly string[],
  salesChannel: RevenueSalesChannel,
): string => {
  const start = toSfDateTimeStart(from);
  const end = toSfDateTimeEnd(to);
  const customerChannelsClause = buildCustomerChannelsClause(customerChannels);
  const salesChannelClause = buildSalesChannelClause(salesChannel);

  return [
    "SELECT CALENDAR_YEAR(OrderEffectiveDate__c) yr,",
    "CALENDAR_MONTH(OrderEffectiveDate__c) mo,",
    "DAY_IN_MONTH(OrderEffectiveDate__c) dy,",
    "SUM(Totalextax__c) total",
    "FROM woo_Order__c",
    `WHERE Order_Type__c = ${quoteLiteral(orderType)}`,
    `AND OrderEffectiveDate__c >= ${start}`,
    `AND OrderEffectiveDate__c <= ${end}`,
    customerChannelsClause,
    salesChannelClause,
    "GROUP BY CALENDAR_YEAR(OrderEffectiveDate__c), CALENDAR_MONTH(OrderEffectiveDate__c), DAY_IN_MONTH(OrderEffectiveDate__c)",
    "ORDER BY CALENDAR_YEAR(OrderEffectiveDate__c), CALENDAR_MONTH(OrderEffectiveDate__c), DAY_IN_MONTH(OrderEffectiveDate__c)",
  ]
    .filter(Boolean)
    .join(" ");
};

const normalizeChannelRecords = (
  customerChannel: string,
  records: ChannelAggRecord[],
): NormalizedChannelRecord[] =>
  records
    .map((record) => ({
      customerChannel,
      salesChannel:
        typeof record.meta_SalesChannel__c === "string"
          ? record.meta_SalesChannel__c
          : "Unknown",
      yr: toInteger(record.yr),
      mo: toInteger(record.mo),
      total: toNumber(record.total),
    }))
    .filter((record) => record.yr > 0 && record.mo >= 1 && record.mo <= 12);

const normalizeOrderTypeRecords = (
  orderType: OrderType,
  records: OrderTypeAggRecord[],
): NormalizedOrderTypeRecord[] =>
  records
    .map((record) => ({
      orderType,
      yr: toInteger(record.yr),
      mo: toInteger(record.mo),
      total: toNumber(record.total),
      count: toInteger(record.cnt),
    }))
    .filter(
      (record): record is NormalizedOrderTypeRecord =>
        record.yr > 0 &&
        record.mo >= 1 &&
        record.mo <= 12,
    );

const buildMonthKeys = (
  channelRecords: NormalizedChannelRecord[],
  orderTypeRecords: NormalizedOrderTypeRecord[],
): string[] => {
  const keys = new Set<string>();

  for (const record of channelRecords) {
    keys.add(monthKey(record.yr, record.mo));
  }

  for (const record of orderTypeRecords) {
    keys.add(monthKey(record.yr, record.mo));
  }

  return [...keys].sort();
};

const toThousandsRounded = (value: number): number => Math.round(value / 1000);

const pivotChannelRevenue = (
  records: NormalizedChannelRecord[],
  keys: string[],
  customerChannel: string,
): Record<string, number[]> => {
  const selected = records.filter(
    (record) => record.customerChannel === customerChannel,
  );

  const salesChannels = [...new Set(selected.map((record) => record.salesChannel))];
  const out: Record<string, number[]> = {};

  for (const salesChannel of salesChannels) {
    const valuesByMonth = new Map<string, number>();

    for (const record of selected) {
      if (record.salesChannel !== salesChannel) {
        continue;
      }

      const key = monthKey(record.yr, record.mo);
      valuesByMonth.set(key, toThousandsRounded(record.total));
    }

    out[salesChannel] = keys.map((key) => valuesByMonth.get(key) ?? 0);
  }

  return out;
};

const pivotOrderMetric = (
  records: NormalizedOrderTypeRecord[],
  keys: string[],
  field: "total" | "count",
): Record<string, number[]> => {
  const out: Record<string, number[]> = {
    new: [],
    upgrade: [],
    renewal: [],
    downgrade: [],
  };

  for (const orderType of ORDER_TYPES) {
    const valuesByMonth = new Map<string, number>();

    for (const record of records) {
      if (record.orderType !== orderType) {
        continue;
      }

      const key = monthKey(record.yr, record.mo);
      const value = field === "total" ? toThousandsRounded(record.total) : record.count;
      valuesByMonth.set(key, value);
    }

    out[orderType] = keys.map((key) => valuesByMonth.get(key) ?? 0);
  }

  return out;
};

const toMillions1 = (value: number): number =>
  Math.round((value / 1_000_000) * 10) / 10;

const buildToplineTotals = (
  records: NormalizedChannelRecord[],
  asOfDate: string,
): ToplineTotals => {
  const totalsByMonth = new Map<string, number>();

  for (const record of records) {
    const key = monthKey(record.yr, record.mo);
    totalsByMonth.set(key, (totalsByMonth.get(key) ?? 0) + record.total);
  }

  const { year, month } = parseDateOnly(asOfDate);
  const previousMonth = month === 1
    ? { year: year - 1, month: 12 }
    : { year, month: month - 1 };

  const sumYearThroughMonth = (targetYear: number, targetMonth: number): number => {
    let total = 0;

    for (let monthIndex = 1; monthIndex <= targetMonth; monthIndex += 1) {
      total += totalsByMonth.get(monthKey(targetYear, monthIndex)) ?? 0;
    }

    return total;
  };

  const thisMonthTotal = toMillions1(
    totalsByMonth.get(monthKey(year, month)) ?? 0,
  );
  const prevMonthTotal = toMillions1(
    totalsByMonth.get(monthKey(previousMonth.year, previousMonth.month)) ?? 0,
  );

  const ytdTotal = toMillions1(
    sumYearThroughMonth(year, month),
  );

  const prevYtdTotal = toMillions1(
    sumYearThroughMonth(year - 1, month),
  );

  return {
    thisMonthTotal,
    prevMonthTotal,
    ytdTotal,
    prevYtdTotal,
  };
};

const buildMonthToDateWindow = (to: string): RevenueWindow => {
  const { year, month } = parseDateOnly(to);
  const from = `${year}-${String(month).padStart(2, "0")}-01`;

  return {
    key: `month:${from}:${to}`,
    from,
    to,
    label: `Month to date through ${to}`,
    range: null,
    isCustom: true,
  };
};

const buildPriorYearMonthToDateWindow = (to: string): RevenueWindow => {
  const { year, month, day } = parseDateOnly(to);
  const priorYear = year - 1;
  const monthToken = String(month).padStart(2, "0");
  const priorYearMonthDayCount = new Date(Date.UTC(priorYear, month, 0)).getUTCDate();
  const clampedDay = Math.min(day, priorYearMonthDayCount);
  const dayToken = String(clampedDay).padStart(2, "0");

  return {
    key: `month-prior:${priorYear}-${monthToken}-01:${priorYear}-${monthToken}-${dayToken}`,
    from: `${priorYear}-${monthToken}-01`,
    to: `${priorYear}-${monthToken}-${dayToken}`,
    label: `Prior-year month to date through ${priorYear}-${monthToken}-${dayToken}`,
    range: null,
    isCustom: true,
  };
};

const buildDailySeries = (
  rows: DailyAggRecord[],
  dayCount: number,
): {
  revenue: number[];
  orders: number[];
} => {
  const revenue = Array.from({ length: dayCount }, () => 0);
  const orders = Array.from({ length: dayCount }, () => 0);

  for (const row of rows) {
    const day = toInteger(row.dy);

    if (day < 1 || day > dayCount) {
      continue;
    }

    revenue[day - 1] = Math.round(toNumber(row.total));
    orders[day - 1] = toInteger(row.cnt);
  }

  return { revenue, orders };
};

const buildDailyOrderTypeRevenueSeries = (
  rowsByOrderType: Record<OrderType, DailyAggRecord[]>,
  dayCount: number,
): Record<string, number[]> => {
  return ORDER_TYPES.reduce<Record<string, number[]>>((acc, orderType) => {
    acc[orderType] = buildDailySeries(rowsByOrderType[orderType] ?? [], dayCount).revenue;
    return acc;
  }, {});
};

const buildEmptyOrderTypeSeries = (): Record<string, number[]> =>
  ORDER_TYPES.reduce<Record<string, number[]>>((acc, orderType) => {
    acc[orderType] = [];
    return acc;
  }, {});

const buildRangeDailyRevenueSeries = (
  rows: RangeDailyAggRecord[],
  dateKeys: readonly string[],
): number[] => {
  const totalsByDate = new Map<string, number>();

  for (const row of rows) {
    const year = toInteger(row.yr);
    const month = toInteger(row.mo);
    const day = toInteger(row.dy);

    if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
      continue;
    }

    totalsByDate.set(dateKey(year, month, day), Math.round(toNumber(row.total)));
  }

  return dateKeys.map((key) => totalsByDate.get(key) ?? 0);
};

const buildRangeDailyOrderTypeRevenueSeries = (
  rowsByOrderType: Record<OrderType, RangeDailyAggRecord[]>,
  dateKeys: readonly string[],
): Record<string, number[]> =>
  ORDER_TYPES.reduce<Record<string, number[]>>((acc, orderType) => {
    acc[orderType] = buildRangeDailyRevenueSeries(rowsByOrderType[orderType] ?? [], dateKeys);
    return acc;
  }, {});

const buildRangeDailySnapshot = (
  window: RevenueWindow,
  rangeDailyRows: RangeDailyAggRecord[],
  rangeDailyOrderTypeRows: Record<OrderType, RangeDailyAggRecord[]>,
): RangeDailySnapshot => {
  if (window.range !== "30d") {
    return {
      rangeDailyLabels: [],
      rangeDailyRevenue: [],
      rangeDailyOrderTypeRevenue: buildEmptyOrderTypeSeries(),
    };
  }

  const dateKeys = buildDateKeys(window.from, window.to);

  return {
    rangeDailyLabels: dateKeys.map(dateLabel),
    rangeDailyRevenue: buildRangeDailyRevenueSeries(rangeDailyRows, dateKeys),
    rangeDailyOrderTypeRevenue: buildRangeDailyOrderTypeRevenueSeries(
      rangeDailyOrderTypeRows,
      dateKeys,
    ),
  };
};

const buildDailySeriesSnapshot = (
  asOfDate: string,
  currentMonthRows: DailyAggRecord[],
  currentMonthOrderTypeRows: Record<OrderType, DailyAggRecord[]>,
  priorYearRows: DailyAggRecord[],
): DailySeriesSnapshot => {
  const { day } = parseDateOnly(asOfDate);
  const currentMonth = buildDailySeries(currentMonthRows, day);
  const currentMonthOrderTypeRevenue = buildDailyOrderTypeRevenueSeries(
    currentMonthOrderTypeRows,
    day,
  );
  const priorYearMonth = buildDailySeries(priorYearRows, day);

  return {
    asOfDate,
    currentMonthDailyRevenue: currentMonth.revenue,
    currentMonthDailyOrderTypeRevenue: currentMonthOrderTypeRevenue,
    priorYearMonthDailyRevenue: priorYearMonth.revenue,
    currentMonthDailyOrders: currentMonth.orders,
    priorYearMonthDailyOrders: priorYearMonth.orders,
    todayTotal: currentMonth.revenue[day - 1] ?? 0,
    prevDayTotal: day > 1 ? (currentMonth.revenue[day - 2] ?? 0) : 0,
  };
};

const buildToplineWindow = (to: string): RevenueWindow => {
  const { year } = parseDateOnly(to);
  const from = `${year - 1}-01-01`;

  return {
    key: `topline:${from}:${to}`,
    from,
    to,
    label: `Topline comparison through ${to}`,
    range: null,
    isCustom: true,
  };
};

const buildFiltersKey = (filters: RevenueFilters): string =>
  `customer:${filters.customerChannel}:sales:${filters.salesChannel}`;

const readCache = (key: string): SfRevenueResponse | null => {
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

const writeCache = (key: string, payload: SfRevenueResponse): void => {
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

const buildPayload = (
  channelRecords: NormalizedChannelRecord[],
  orderTypeRecords: NormalizedOrderTypeRecord[],
  topline: ToplineTotals,
  snapshot: DailySeriesSnapshot,
  rangeDailySnapshot: RangeDailySnapshot,
): SfRevenueResponse => {
  const keys = buildMonthKeys(channelRecords, orderTypeRecords);
  const months = keys.map(monthLabel);

  const directRevenue = pivotChannelRevenue(
    channelRecords,
    keys,
    DIRECT_CUSTOMER_CHANNEL,
  );
  const channelPartnerRevenue = pivotChannelRevenue(
    channelRecords,
    keys,
    PARTNER_CUSTOMER_CHANNEL,
  );

  const orderTypeRevenue = pivotOrderMetric(orderTypeRecords, keys, "total");
  const orderTypeCount = pivotOrderMetric(orderTypeRecords, keys, "count");

  return sfRevenueResponseSchema.parse({
    months,
    directRevenue,
    channelPartnerRevenue,
    orderTypeRevenue,
    orderTypeCount,
    ...rangeDailySnapshot,
    ...topline,
    ...snapshot,
  });
};

const loadRevenuePayload = async (
  window: RevenueWindow,
  filters: RevenueFilters,
): Promise<SfRevenueResponse> => {
  const toplineWindow = buildToplineWindow(window.to);
  const monthToDateWindow = buildMonthToDateWindow(window.to);
  const priorYearMonthToDateWindow = buildPriorYearMonthToDateWindow(window.to);
  const shouldLoadRangeDaily = window.range === "30d";
  const customerChannels = resolveCustomerChannels(filters.customerChannel);
  const channelRowGroupsPromise = Promise.all(
    customerChannels.map((customerChannel) =>
      querySalesforce<ChannelAggRecord>(
        buildChannelQuery(customerChannel, window, filters.salesChannel),
      ),
    ),
  );
  const orderAndDailyRowsPromise = Promise.all([
    querySalesforce<OrderTypeAggRecord>(
      buildOrderTypeQuery("new", window, customerChannels, filters.salesChannel),
    ),
    querySalesforce<OrderTypeAggRecord>(
      buildOrderTypeQuery("upgrade", window, customerChannels, filters.salesChannel),
    ),
    querySalesforce<OrderTypeAggRecord>(
      buildOrderTypeQuery("renewal", window, customerChannels, filters.salesChannel),
    ),
    querySalesforce<OrderTypeAggRecord>(
      buildOrderTypeQuery("downgrade", window, customerChannels, filters.salesChannel),
    ),
    querySalesforce<DailyAggRecord>(
      buildDailySeriesQuery(monthToDateWindow, customerChannels, filters.salesChannel),
    ),
    querySalesforce<DailyAggRecord>(
      buildDailyOrderTypeRevenueQuery("new", monthToDateWindow, customerChannels, filters.salesChannel),
    ),
    querySalesforce<DailyAggRecord>(
      buildDailyOrderTypeRevenueQuery("renewal", monthToDateWindow, customerChannels, filters.salesChannel),
    ),
    querySalesforce<DailyAggRecord>(
      buildDailyOrderTypeRevenueQuery("upgrade", monthToDateWindow, customerChannels, filters.salesChannel),
    ),
    querySalesforce<DailyAggRecord>(
      buildDailyOrderTypeRevenueQuery("downgrade", monthToDateWindow, customerChannels, filters.salesChannel),
    ),
    querySalesforce<DailyAggRecord>(
      buildDailySeriesQuery(priorYearMonthToDateWindow, customerChannels, filters.salesChannel),
    ),
    shouldLoadRangeDaily
      ? querySalesforce<RangeDailyAggRecord>(
          buildRangeDailySeriesQuery(window, customerChannels, filters.salesChannel),
        )
      : Promise.resolve([] as RangeDailyAggRecord[]),
    shouldLoadRangeDaily
      ? querySalesforce<RangeDailyAggRecord>(
          buildRangeDailyOrderTypeRevenueQuery("new", window, customerChannels, filters.salesChannel),
        )
      : Promise.resolve([] as RangeDailyAggRecord[]),
    shouldLoadRangeDaily
      ? querySalesforce<RangeDailyAggRecord>(
          buildRangeDailyOrderTypeRevenueQuery("renewal", window, customerChannels, filters.salesChannel),
        )
      : Promise.resolve([] as RangeDailyAggRecord[]),
    shouldLoadRangeDaily
      ? querySalesforce<RangeDailyAggRecord>(
          buildRangeDailyOrderTypeRevenueQuery("upgrade", window, customerChannels, filters.salesChannel),
        )
      : Promise.resolve([] as RangeDailyAggRecord[]),
    shouldLoadRangeDaily
      ? querySalesforce<RangeDailyAggRecord>(
          buildRangeDailyOrderTypeRevenueQuery("downgrade", window, customerChannels, filters.salesChannel),
        )
      : Promise.resolve([] as RangeDailyAggRecord[]),
  ]);
  const toplineRowGroupsPromise =
    window.from <= toplineWindow.from
      ? Promise.resolve<[ChannelAggRecord[], ChannelAggRecord[]] | null>(null)
      : Promise.all([
          customerChannels.includes(DIRECT_CUSTOMER_CHANNEL)
            ? querySalesforce<ChannelAggRecord>(
                buildChannelQuery(DIRECT_CUSTOMER_CHANNEL, toplineWindow, filters.salesChannel),
              )
            : Promise.resolve([] as ChannelAggRecord[]),
          customerChannels.includes(PARTNER_CUSTOMER_CHANNEL)
            ? querySalesforce<ChannelAggRecord>(
                buildChannelQuery(PARTNER_CUSTOMER_CHANNEL, toplineWindow, filters.salesChannel),
              )
            : Promise.resolve([] as ChannelAggRecord[]),
        ]);

  const [
    channelRowGroups,
    [
      newRows,
      upgradeRows,
      renewalRows,
      downgradeRows,
      currentMonthDailyRows,
      currentMonthDailyNewRows,
      currentMonthDailyRenewalRows,
      currentMonthDailyUpgradeRows,
      currentMonthDailyDowngradeRows,
      priorYearMonthDailyRows,
      rangeDailyRows,
      rangeDailyNewRows,
      rangeDailyRenewalRows,
      rangeDailyUpgradeRows,
      rangeDailyDowngradeRows,
    ],
    toplineRowGroups,
  ] = await Promise.all([
    channelRowGroupsPromise,
    orderAndDailyRowsPromise,
    toplineRowGroupsPromise,
  ]);

  const channelRowsByCustomerChannel = new Map<string, ChannelAggRecord[]>();

  customerChannels.forEach((customerChannel, index) => {
    channelRowsByCustomerChannel.set(customerChannel, channelRowGroups[index] ?? []);
  });

  const directRows = channelRowsByCustomerChannel.get(DIRECT_CUSTOMER_CHANNEL) ?? [];
  const partnerRows = channelRowsByCustomerChannel.get(PARTNER_CUSTOMER_CHANNEL) ?? [];

  const [toplineDirectRows, toplinePartnerRows] = toplineRowGroups ?? [directRows, partnerRows];

  const channelRecords = [
    ...normalizeChannelRecords(DIRECT_CUSTOMER_CHANNEL, directRows),
    ...normalizeChannelRecords(PARTNER_CUSTOMER_CHANNEL, partnerRows),
  ];

  const orderTypeRecords = [
    ...normalizeOrderTypeRecords("new", newRows),
    ...normalizeOrderTypeRecords("upgrade", upgradeRows),
    ...normalizeOrderTypeRecords("renewal", renewalRows),
    ...normalizeOrderTypeRecords("downgrade", downgradeRows),
  ];

  const toplineRecords = [
    ...normalizeChannelRecords(DIRECT_CUSTOMER_CHANNEL, toplineDirectRows),
    ...normalizeChannelRecords(PARTNER_CUSTOMER_CHANNEL, toplinePartnerRows),
  ];

  return buildPayload(
    channelRecords,
    orderTypeRecords,
    buildToplineTotals(toplineRecords, toplineWindow.to),
    buildDailySeriesSnapshot(
      window.to,
      currentMonthDailyRows,
      {
        new: currentMonthDailyNewRows,
        renewal: currentMonthDailyRenewalRows,
        upgrade: currentMonthDailyUpgradeRows,
        downgrade: currentMonthDailyDowngradeRows,
      },
      priorYearMonthDailyRows,
    ),
    buildRangeDailySnapshot(
      window,
      rangeDailyRows,
      {
        new: rangeDailyNewRows,
        renewal: rangeDailyRenewalRows,
        upgrade: rangeDailyUpgradeRows,
        downgrade: rangeDailyDowngradeRows,
      },
    ),
  );
};

export type RevenueServiceResult = {
  payload: SfRevenueResponse;
  cacheHit: boolean;
};

export const getRevenuePayload = async (
  window: RevenueWindow,
  filters: RevenueFilters = {
    customerChannel: DEFAULT_REVENUE_CUSTOMER_CHANNEL,
    salesChannel: DEFAULT_REVENUE_SALES_CHANNEL,
  },
): Promise<RevenueServiceResult> => {
  const cacheKey = `${window.key}:${buildFiltersKey(filters)}`;
  const cached = readCache(cacheKey);

  if (cached) {
    return {
      payload: cached,
      cacheHit: true,
    };
  }

  const running = inFlight.get(cacheKey);
  if (running) {
    return {
      payload: await running,
      cacheHit: true,
    };
  }

  const task = loadRevenuePayload(window, filters)
    .then((payload) => {
      writeCache(cacheKey, payload);
      return payload;
    })
    .finally(() => {
      inFlight.delete(cacheKey);
    });

  inFlight.set(cacheKey, task);

  return {
    payload: await task,
    cacheHit: false,
  };
};
