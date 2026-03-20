import {
  sfStrategyInitiativesResponseSchema,
  type SfStrategyInitiativesResponse,
  type StrategyInitiativeKey,
} from "@contracts/sales";

import { querySalesforce } from "../../platform/salesforce/client";
import { formatDateOnlyUtc } from "./revenue-window";

type CacheEntry<T> = {
  payload: T;
  expiresAt: number;
};

type StrategyInitiativesServiceResult<T> = {
  payload: T;
  cacheHit: boolean;
};

type OpportunityInitiativeAggRecord = {
  yr?: unknown;
  mo?: unknown;
  LeadSource?: unknown;
  recordCount?: unknown;
  totalAmount?: unknown;
};

type GridInitiativeAggRecord = {
  yr?: unknown;
  mo?: unknown;
  recordCount?: unknown;
  totalAmount?: unknown;
};

type MonthSlot = {
  monthStart: string;
  monthLabel: string;
  year: number;
  month: number;
};

type InitiativeSummaryDraft = {
  key: StrategyInitiativeKey;
  label: string;
  sourceObject: "Opportunity" | "woo_OrderLine__c";
  rule: string;
  totalRevenue: number;
  ytdRevenue: number;
  recordCount: number;
};

const CACHE_TTL_MS = Number(process.env.SF_STRATEGY_INITIATIVES_CACHE_TTL_MS ?? 5 * 60 * 1000);
const CACHE_MAX_ENTRIES = 12;
const WINDOW_MONTHS = Number(process.env.SF_STRATEGY_INITIATIVES_WINDOW_MONTHS ?? 18);
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WOODES_LEAD_SOURCES = ["Woodes in breach", "Woodes no license"] as const;
const MORNINGSTAR_LEAD_SOURCES = ["Referral from Morningstar"] as const;

const strategyInitiativesCache = new Map<string, CacheEntry<SfStrategyInitiativesResponse>>();
const strategyInitiativesInFlight = new Map<string, Promise<SfStrategyInitiativesResponse>>();

const roundCurrency = (value: number): number => Math.round(value * 100) / 100;

const toNumber = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toInteger = (value: unknown): number => Math.trunc(toNumber(value));

const cleanText = (value: unknown): string =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

const quoteLiteral = (value: string): string => `'${value.replace(/'/g, "\\'")}'`;

const toUtcMonthStart = (value: Date): Date =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));

const shiftUtcMonth = (value: Date, delta: number): Date =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + delta, 1));

const endOfUtcMonth = (monthStart: Date): Date =>
  new Date(shiftUtcMonth(monthStart, 1).getTime() - 1);

const formatMonthLabel = (value: Date): string =>
  `${MONTH_NAMES[value.getUTCMonth()] ?? "Unknown"} ${value.getUTCFullYear()}`;

const formatDateTimeUtc = (value: Date): string =>
  value.toISOString().replace(".000Z", "Z");

const monthStartKey = (year: number, month: number): string =>
  `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;

const resolveOpportunityInitiativeKey = (leadSource: string): StrategyInitiativeKey | null => {
  const normalized = leadSource.toLowerCase();

  if (normalized.includes("woodes")) {
    return "Woodes";
  }

  if (normalized.includes("morningstar")) {
    return "Morningstar";
  }

  return null;
};

const buildMonthSlots = (fromMonth: Date, toMonth: Date): MonthSlot[] => {
  const out: MonthSlot[] = [];

  for (let cursor = fromMonth; cursor.getTime() <= toMonth.getTime(); cursor = shiftUtcMonth(cursor, 1)) {
    out.push({
      monthStart: formatDateOnlyUtc(cursor),
      monthLabel: formatMonthLabel(cursor),
      year: cursor.getUTCFullYear(),
      month: cursor.getUTCMonth() + 1,
    });
  }

  return out;
};

const buildOpportunityQuery = (fromDate: string, toDate: string): string =>
  [
    "SELECT CALENDAR_YEAR(CloseDate) yr, CALENDAR_MONTH(CloseDate) mo, LeadSource,",
    "COUNT(Id) recordCount, SUM(Amount) totalAmount",
    "FROM Opportunity",
    "WHERE IsDeleted = false",
    "AND Amount != null",
    "AND IsWon = true",
    `AND CloseDate >= ${fromDate}`,
    `AND CloseDate <= ${toDate}`,
    `AND LeadSource IN (${[...WOODES_LEAD_SOURCES, ...MORNINGSTAR_LEAD_SOURCES].map(quoteLiteral).join(", ")})`,
    "GROUP BY CALENDAR_YEAR(CloseDate), CALENDAR_MONTH(CloseDate), LeadSource",
    "ORDER BY CALENDAR_YEAR(CloseDate), CALENDAR_MONTH(CloseDate), LeadSource",
  ].join(" ");

const buildGridQuery = (fromDateTime: string, toDateTime: string): string =>
  [
    "SELECT CALENDAR_YEAR(OrderEffectiveDate__c) yr, CALENDAR_MONTH(OrderEffectiveDate__c) mo,",
    "COUNT(Id) recordCount, SUM(total__c) totalAmount",
    "FROM woo_OrderLine__c",
    "WHERE IsDeleted = false",
    "AND total__c != null",
    `AND OrderEffectiveDate__c >= ${fromDateTime}`,
    `AND OrderEffectiveDate__c <= ${toDateTime}`,
    "AND name__c LIKE '%Grid%'",
    "GROUP BY CALENDAR_YEAR(OrderEffectiveDate__c), CALENDAR_MONTH(OrderEffectiveDate__c)",
    "ORDER BY CALENDAR_YEAR(OrderEffectiveDate__c), CALENDAR_MONTH(OrderEffectiveDate__c)",
  ].join(" ");

const readCache = <T>(cache: Map<string, CacheEntry<T>>, key: string): T | null => {
  const hit = cache.get(key);

  if (!hit) {
    return null;
  }

  if (hit.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return hit.payload;
};

const writeCache = <T>(cache: Map<string, CacheEntry<T>>, key: string, payload: T): void => {
  cache.set(key, {
    payload,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  if (cache.size <= CACHE_MAX_ENTRIES) {
    return;
  }

  const oldestKey = cache.keys().next().value;

  if (typeof oldestKey === "string") {
    cache.delete(oldestKey);
  }
};

const buildPayload = (
  opportunityRows: readonly OpportunityInitiativeAggRecord[],
  gridRows: readonly GridInitiativeAggRecord[],
  now: Date,
): SfStrategyInitiativesResponse => {
  const asOfDate = formatDateOnlyUtc(now);
  const toMonth = toUtcMonthStart(now);
  const fromMonth = shiftUtcMonth(toMonth, -(WINDOW_MONTHS - 1));
  const currentYear = toMonth.getUTCFullYear();
  const previousYear = currentYear - 1;
  const ytdMonth = toMonth.getUTCMonth() + 1;
  const monthSlots = buildMonthSlots(fromMonth, toMonth);
  const byMonth = new Map<string, { woodes: number; morningstar: number; grid: number }>();

  const initiativeSummaries = new Map<StrategyInitiativeKey, InitiativeSummaryDraft>([
    [
      "Woodes",
      {
        key: "Woodes",
        label: "Woodes",
        sourceObject: "Opportunity",
        rule: "Closed-won Opportunity where LeadSource is Woodes in breach or Woodes no license.",
        totalRevenue: 0,
        ytdRevenue: 0,
        recordCount: 0,
      },
    ],
    [
      "Morningstar",
      {
        key: "Morningstar",
        label: "Morningstar",
        sourceObject: "Opportunity",
        rule: "Closed-won Opportunity where LeadSource is Referral from Morningstar.",
        totalRevenue: 0,
        ytdRevenue: 0,
        recordCount: 0,
      },
    ],
    [
      "Grid",
      {
        key: "Grid",
        label: "Grid",
        sourceObject: "woo_OrderLine__c",
        rule: "woo_OrderLine__c where name__c contains Grid, using OrderEffectiveDate__c and total__c.",
        totalRevenue: 0,
        ytdRevenue: 0,
        recordCount: 0,
      },
    ],
  ]);

  const ensureMonth = (key: string) => {
    const current = byMonth.get(key);

    if (current) {
      return current;
    }

    const created = {
      woodes: 0,
      morningstar: 0,
      grid: 0,
    };

    byMonth.set(key, created);
    return created;
  };

  for (const row of opportunityRows) {
    const leadSource = cleanText(row.LeadSource);
    const initiative = resolveOpportunityInitiativeKey(leadSource);
    const year = toInteger(row.yr);
    const month = toInteger(row.mo);

    if (!initiative || year < 2000 || month < 1 || month > 12) {
      continue;
    }

    const key = monthStartKey(year, month);
    const revenue = roundCurrency(toNumber(row.totalAmount));
    const recordCount = toInteger(row.recordCount);
    const slot = ensureMonth(key);
    const summary = initiativeSummaries.get(initiative);

    if (!summary) {
      continue;
    }

    if (initiative === "Woodes") {
      slot.woodes += revenue;
    } else {
      slot.morningstar += revenue;
    }

    summary.totalRevenue += revenue;
    summary.recordCount += recordCount;

    if (year === currentYear && month <= ytdMonth) {
      summary.ytdRevenue += revenue;
    }
  }

  for (const row of gridRows) {
    const year = toInteger(row.yr);
    const month = toInteger(row.mo);

    if (year < 2000 || month < 1 || month > 12) {
      continue;
    }

    const key = monthStartKey(year, month);
    const revenue = roundCurrency(toNumber(row.totalAmount));
    const recordCount = toInteger(row.recordCount);
    const slot = ensureMonth(key);
    const summary = initiativeSummaries.get("Grid");

    if (!summary) {
      continue;
    }

    slot.grid += revenue;
    summary.totalRevenue += revenue;
    summary.recordCount += recordCount;

    if (year === currentYear && month <= ytdMonth) {
      summary.ytdRevenue += revenue;
    }
  }

  const monthly = monthSlots.map((slot) => {
    const values = byMonth.get(slot.monthStart) ?? {
      woodes: 0,
      morningstar: 0,
      grid: 0,
    };
    const woodes = roundCurrency(values.woodes);
    const morningstar = roundCurrency(values.morningstar);
    const grid = roundCurrency(values.grid);

    return {
      monthStart: slot.monthStart,
      monthLabel: slot.monthLabel,
      year: slot.year,
      month: slot.month,
      woodes,
      morningstar,
      grid,
      combined: roundCurrency(woodes + morningstar + grid),
    };
  });

  const ytdCurrentRevenue = roundCurrency(
    monthly
      .filter((row) => row.year === currentYear && row.month <= ytdMonth)
      .reduce((sum, row) => sum + row.combined, 0),
  );
  const ytdPreviousRevenue = roundCurrency(
    monthly
      .filter((row) => row.year === previousYear && row.month <= ytdMonth)
      .reduce((sum, row) => sum + row.combined, 0),
  );
  const ytdDiffRevenue = roundCurrency(ytdCurrentRevenue - ytdPreviousRevenue);
  const ytdDiffPct =
    ytdPreviousRevenue > 0
      ? roundCurrency((ytdDiffRevenue / ytdPreviousRevenue) * 100)
      : null;

  return sfStrategyInitiativesResponseSchema.parse({
    asOfDate,
    fromMonth: formatDateOnlyUtc(fromMonth),
    toMonth: formatDateOnlyUtc(endOfUtcMonth(toMonth)),
    currentYear,
    previousYear,
    ytdMonth,
    ytdCurrentRevenue,
    ytdPreviousRevenue,
    ytdDiffRevenue,
    ytdDiffPct,
    initiatives: [...initiativeSummaries.values()].map((summary) => ({
      ...summary,
      totalRevenue: roundCurrency(summary.totalRevenue),
      ytdRevenue: roundCurrency(summary.ytdRevenue),
    })),
    monthly,
  });
};

const loadStrategyInitiativesPayload = async (now: Date): Promise<SfStrategyInitiativesResponse> => {
  const toMonth = toUtcMonthStart(now);
  const fromMonth = shiftUtcMonth(toMonth, -(WINDOW_MONTHS - 1));
  const fromDate = formatDateOnlyUtc(fromMonth);
  const toDate = formatDateOnlyUtc(endOfUtcMonth(toMonth));
  const fromDateTime = formatDateTimeUtc(fromMonth);
  const toDateTime = formatDateTimeUtc(endOfUtcMonth(toMonth));
  const [opportunityRows, gridRows] = await Promise.all([
    querySalesforce<OpportunityInitiativeAggRecord>(buildOpportunityQuery(fromDate, toDate)),
    querySalesforce<GridInitiativeAggRecord>(buildGridQuery(fromDateTime, toDateTime)),
  ]);

  return buildPayload(opportunityRows, gridRows, now);
};

export const getStrategyInitiativesPayload = async (
  now: Date = new Date(),
): Promise<StrategyInitiativesServiceResult<SfStrategyInitiativesResponse>> => {
  const cacheKey = `strategy-initiatives:${formatDateOnlyUtc(now)}:${WINDOW_MONTHS}`;
  const cached = readCache(strategyInitiativesCache, cacheKey);

  if (cached) {
    return {
      payload: cached,
      cacheHit: true,
    };
  }

  const running = strategyInitiativesInFlight.get(cacheKey);

  if (running) {
    return {
      payload: await running,
      cacheHit: true,
    };
  }

  const task = loadStrategyInitiativesPayload(now)
    .then((payload) => {
      writeCache(strategyInitiativesCache, cacheKey, payload);
      return payload;
    })
    .finally(() => {
      strategyInitiativesInFlight.delete(cacheKey);
    });

  strategyInitiativesInFlight.set(cacheKey, task);

  return {
    payload: await task,
    cacheHit: false,
  };
};
