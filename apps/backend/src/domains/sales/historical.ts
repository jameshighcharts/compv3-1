import {
  DEFAULT_REVENUE_CUSTOMER_CHANNEL,
  sfHistoricalResponseSchema,
  type RevenueCustomerChannel,
  type SfHistoricalResponse,
} from "@contracts/sales";

import type { RevenueWindow } from "./schema";
import { querySalesforce } from "../../platform/salesforce/client";

const DIRECT_CUSTOMER_CHANNEL = "Direct Sales";
const PARTNER_CUSTOMER_CHANNEL = "Channel Partner Sales";

const ORDER_TYPES = ["new", "upgrade", "renewal", "downgrade"] as const;

type OrderType = (typeof ORDER_TYPES)[number];

type HistoricalOrderTypeAggRecord = {
  yr?: unknown;
  mo?: unknown;
  total?: unknown;
};

type NormalizedHistoricalOrderTypeRecord = {
  orderType: OrderType;
  yr: number;
  mo: number;
  total: number;
};

type HistoricalFilters = {
  customerChannel: RevenueCustomerChannel;
};

type HistoricalCacheEntry = {
  payload: SfHistoricalResponse;
  expiresAt: number;
};

type HistoricalServiceResult = {
  payload: SfHistoricalResponse;
  cacheHit: boolean;
};

const CACHE_TTL_MS = Number(process.env.SF_HISTORICAL_CACHE_TTL_MS ?? 5 * 60 * 1000);
const CACHE_MAX_ENTRIES = 24;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ALL_CUSTOMER_CHANNELS = [
  DIRECT_CUSTOMER_CHANNEL,
  PARTNER_CUSTOMER_CHANNEL,
] as const;

const cache = new Map<string, HistoricalCacheEntry>();
const inFlight = new Map<string, Promise<SfHistoricalResponse>>();

const quoteLiteral = (value: string): string => `'${value.replace(/'/g, "\\'")}'`;
const quoteLiterals = (values: readonly string[]): string => values.map(quoteLiteral).join(", ");

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

const toSfDateTimeStart = (dateOnly: string): string => `${dateOnly}T00:00:00Z`;
const toSfDateTimeEnd = (dateOnly: string): string => `${dateOnly}T23:59:59Z`;
const toThousandsRounded = (value: number): number => Math.round(value / 1000);

const resolveCustomerChannels = (
  customerChannel: RevenueCustomerChannel,
): readonly string[] =>
  customerChannel === DEFAULT_REVENUE_CUSTOMER_CHANNEL
    ? ALL_CUSTOMER_CHANNELS
    : [customerChannel];

const buildCustomerChannelsClause = (customerChannels: readonly string[]): string | null => {
  if (customerChannels.length === 0 || customerChannels.length === ALL_CUSTOMER_CHANNELS.length) {
    return null;
  }

  if (customerChannels.length === 1) {
    return `AND CustomerChannel__c = ${quoteLiteral(customerChannels[0])}`;
  }

  return `AND CustomerChannel__c IN (${quoteLiterals(customerChannels)})`;
};

const buildHistoricalOrderTypeQuery = (
  orderType: OrderType,
  { from, to }: RevenueWindow,
  customerChannels: readonly string[],
): string => {
  const customerChannelsClause = buildCustomerChannelsClause(customerChannels);

  return [
    "SELECT CALENDAR_YEAR(OrderEffectiveDate__c) yr,",
    "CALENDAR_MONTH(OrderEffectiveDate__c) mo,",
    "SUM(Totalextax__c) total",
    "FROM woo_Order__c",
    `WHERE Order_Type__c = ${quoteLiteral(orderType)}`,
    customerChannelsClause,
    `AND OrderEffectiveDate__c >= ${toSfDateTimeStart(from)}`,
    `AND OrderEffectiveDate__c <= ${toSfDateTimeEnd(to)}`,
    "GROUP BY CALENDAR_YEAR(OrderEffectiveDate__c), CALENDAR_MONTH(OrderEffectiveDate__c)",
    "ORDER BY CALENDAR_YEAR(OrderEffectiveDate__c), CALENDAR_MONTH(OrderEffectiveDate__c)",
  ]
    .filter(Boolean)
    .join(" ");
};

const normalizeOrderTypeRecords = (
  orderType: OrderType,
  records: HistoricalOrderTypeAggRecord[],
): NormalizedHistoricalOrderTypeRecord[] =>
  records
    .map((record) => ({
      orderType,
      yr: toInteger(record.yr),
      mo: toInteger(record.mo),
      total: toNumber(record.total),
    }))
    .filter(
      (record): record is NormalizedHistoricalOrderTypeRecord =>
        record.yr > 0 &&
        record.mo >= 1 &&
        record.mo <= 12,
    );

const buildMonthKeysForWindow = (
  fromDate: string,
  toDate: string,
): string[] => {
  const start = parseDateOnly(fromDate);
  const end = parseDateOnly(toDate);
  const cursor = new Date(Date.UTC(start.year, start.month - 1, 1));
  const last = new Date(Date.UTC(end.year, end.month - 1, 1));
  const keys: string[] = [];

  while (cursor.getTime() <= last.getTime()) {
    keys.push(monthKey(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return keys;
};

const pivotOrderMetric = (
  records: NormalizedHistoricalOrderTypeRecord[],
  keys: string[],
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

      valuesByMonth.set(monthKey(record.yr, record.mo), toThousandsRounded(record.total));
    }

    out[orderType] = keys.map((key) => valuesByMonth.get(key) ?? 0);
  }

  return out;
};

const readCache = (key: string): SfHistoricalResponse | null => {
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

const writeCache = (key: string, payload: SfHistoricalResponse): void => {
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

const buildFiltersKey = (filters: HistoricalFilters): string =>
  `customer:${filters.customerChannel}`;

const buildHistoricalPayload = (
  window: RevenueWindow,
  records: NormalizedHistoricalOrderTypeRecord[],
): SfHistoricalResponse => {
  const keys = buildMonthKeysForWindow(window.from, window.to);

  return sfHistoricalResponseSchema.parse({
    asOfDate: window.to,
    fromDate: window.from,
    toDate: window.to,
    months: keys.map(monthLabel),
    orderTypeRevenue: pivotOrderMetric(records, keys),
  });
};

const loadHistoricalPayload = async (
  window: RevenueWindow,
  filters: HistoricalFilters,
): Promise<SfHistoricalResponse> => {
  const customerChannels = resolveCustomerChannels(filters.customerChannel);
  const [newRows, upgradeRows, renewalRows, downgradeRows] = await Promise.all([
    querySalesforce<HistoricalOrderTypeAggRecord>(
      buildHistoricalOrderTypeQuery("new", window, customerChannels),
    ),
    querySalesforce<HistoricalOrderTypeAggRecord>(
      buildHistoricalOrderTypeQuery("upgrade", window, customerChannels),
    ),
    querySalesforce<HistoricalOrderTypeAggRecord>(
      buildHistoricalOrderTypeQuery("renewal", window, customerChannels),
    ),
    querySalesforce<HistoricalOrderTypeAggRecord>(
      buildHistoricalOrderTypeQuery("downgrade", window, customerChannels),
    ),
  ]);

  return buildHistoricalPayload(window, [
    ...normalizeOrderTypeRecords("new", newRows),
    ...normalizeOrderTypeRecords("upgrade", upgradeRows),
    ...normalizeOrderTypeRecords("renewal", renewalRows),
    ...normalizeOrderTypeRecords("downgrade", downgradeRows),
  ]);
};

export const getHistoricalPayload = async (
  window: RevenueWindow,
  filters: HistoricalFilters = {
    customerChannel: DEFAULT_REVENUE_CUSTOMER_CHANNEL,
  },
): Promise<HistoricalServiceResult> => {
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

  const task = loadHistoricalPayload(window, filters)
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
