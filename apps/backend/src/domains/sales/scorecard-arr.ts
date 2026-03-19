import {
  sfScorecardArrResponseSchema,
  type SfScorecardArrBridge,
  type SfScorecardArrConcentrationItem,
  type SfScorecardArrResponse,
} from "@contracts/sales";

import { querySalesforce } from "../../platform/salesforce/client";
import { formatDateOnlyUtc } from "./revenue-window";

type CacheEntry<T> = {
  payload: T;
  expiresAt: number;
};

type ScorecardServiceResult<T> = {
  payload: T;
  cacheHit: boolean;
};

type SalesforceReference = {
  Name?: unknown;
};

type SubscriptionRecord = {
  Id?: unknown;
  status__c?: unknown;
  CurrencyIsoCode?: unknown;
  Subscription_Start_Date__c?: unknown;
  Subscription_End_Date__c?: unknown;
  Cancelled_Date__c?: unknown;
  shipping_company__c?: unknown;
  billing_company__c?: unknown;
  Customer__c?: unknown;
  Customer__r?: SalesforceReference;
  Order__c?: unknown;
};

type OrderRecord = {
  Id?: unknown;
  Subscription__c?: unknown;
  License_Owner_Account__c?: unknown;
  License_Owner_Account__r?: SalesforceReference;
  Order_Type__c?: unknown;
  OrderEffectiveDate__c?: unknown;
  OrderisComplete__c?: unknown;
  Totalextax__c?: unknown;
  meta_industry__c?: unknown;
  Support_Type__c?: unknown;
  SubscriptionType__c?: unknown;
};

type OrderLineRecord = {
  Id?: unknown;
  Order__c?: unknown;
  Name?: unknown;
  name__c?: unknown;
  total__c?: unknown;
  total_tax__c?: unknown;
  SubscriptionType__c?: unknown;
  LicenseType__c?: unknown;
};

type NormalizedSubscription = {
  id: string;
  status: string;
  currencyCode: string;
  startAt: Date | null;
  endAt: Date | null;
  cancelledAt: Date | null;
  terminatedAt: Date | null;
  fallbackCustomerKey: string;
  fallbackCustomerLabel: string;
  originalOrderId: string;
};

type NormalizedOrder = {
  id: string;
  subscriptionId: string;
  orderType: "new" | "renewal" | "upgrade" | "downgrade";
  effectiveAt: Date;
  completed: boolean;
  totalExTax: number;
  industry: string;
  supportType: string;
  subscriptionType: string;
  customerKey: string;
  customerLabel: string;
};

type NormalizedOrderLine = {
  id: string;
  orderId: string;
  lineName: string;
  amount: number;
  subscriptionType: string;
  licenseType: string;
};

type OrderSummary = {
  id: string;
  subscriptionId: string;
  orderType: "new" | "renewal" | "upgrade" | "downgrade";
  effectiveAt: Date;
  totalRevenue: number;
  customerKey: string;
  customerLabel: string;
  industry: string;
  baseArr: number;
  newSalesArr: number;
  upgradeArr: number;
  downgradeArr: number;
  recurringRevenue: number;
};

type ArrState = {
  arr: number;
  customerKey: string;
  customerLabel: string;
  industry: string;
};

type SnapshotState = {
  active: boolean;
  arr: number;
  customerKey: string;
  customerLabel: string;
  industry: string;
};

type Snapshot = {
  totalArr: number;
  activeSubscriptions: number;
  activeCustomers: number;
  topCustomerSharePct: number;
  top5CustomerSharePct: number;
  top10CustomerSharePct: number;
  topIndustrySharePct: number;
  customerItems: SfScorecardArrConcentrationItem[];
  industryItems: SfScorecardArrConcentrationItem[];
  states: Map<string, SnapshotState>;
};

type ChurnedSubscription = {
  subscriptionId: string;
  arr: number;
  customerKey: string;
};

type ChurnMonth = {
  items: ChurnedSubscription[];
  customerKeys: Set<string>;
};

const CACHE_TTL_MS = Number(process.env.SF_REVENUE_CACHE_TTL_MS ?? 5 * 60 * 1000);
const CACHE_MAX_ENTRIES = 8;
const MONTHS_TO_SHOW = 14;
const RUNWAY_MONTHS = 6;
const DAY_MS = 24 * 60 * 60 * 1000;
const SUPPORT_MARKER_REGEX = /advantage|maintenance|support|renewal|subscription|service renewal|premium support/i;
const EXCLUDED_LINE_REGEX = /version upgrade|migration fee|custom license fee|grants of saas license|customer installations/i;

const ACTIVE_SNAPSHOT_STATUSES = new Set(["active", "pending", "on-hold", "pending-cancel"]);
const TERMINAL_SNAPSHOT_STATUSES = new Set(["cancelled", "expired", "trash"]);
const TERMINAL_LIKE_SNAPSHOT_STATUSES = new Set([
  ...TERMINAL_SNAPSHOT_STATUSES,
  "pending-cancel",
]);
const SUPPORT_TYPES = new Set(["advantage", "advantage plus"]);
const ARR_ORDER_TYPES = new Set(["new", "renewal", "upgrade", "downgrade"]);

const statusSortOrder = new Map<string, number>([
  ["active", 0],
  ["pending", 1],
  ["on-hold", 2],
  ["pending-cancel", 3],
  ["cancelled", 4],
  ["expired", 5],
  ["trash", 6],
]);

const orderPriority = new Map<string, number>([
  ["new", 0],
  ["renewal", 1],
  ["upgrade", 2],
  ["downgrade", 3],
]);

const scorecardArrCache = new Map<string, CacheEntry<SfScorecardArrResponse>>();
const scorecardArrInFlight = new Map<string, Promise<SfScorecardArrResponse>>();

const cleanText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const toNumber = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundCurrency = (value: number): number => Math.round(value);

const roundPct = (value: number): number => Math.round(value * 10) / 10;

const pct = (numerator: number, denominator: number): number =>
  denominator > 0 ? roundPct((numerator / denominator) * 100) : 0;

const toUtcMonthStart = (value: Date): Date =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));

const shiftUtcMonth = (value: Date, delta: number): Date =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + delta, 1));

const endOfUtcMonth = (monthStart: Date): Date =>
  new Date(shiftUtcMonth(monthStart, 1).getTime() - 1);

const formatMonthLabel = (value: Date): string =>
  value.toLocaleString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
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

const parseSfDateTime = (value: unknown): Date | null => {
  const raw = cleanText(value);

  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeOrderType = (value: unknown): NormalizedOrder["orderType"] | "" => {
  const normalized = cleanText(value).toLowerCase();
  return ARR_ORDER_TYPES.has(normalized) ? (normalized as NormalizedOrder["orderType"]) : "";
};

const isCompletedOrder = (value: unknown): boolean => {
  const normalized = cleanText(value).toLowerCase();
  return normalized === "yes" || normalized === "true" || normalized === "completed" || normalized === "1";
};

const sameUtcMonth = (left: Date, right: Date): boolean =>
  left.getUTCFullYear() === right.getUTCFullYear() &&
  left.getUTCMonth() === right.getUTCMonth();

const isInMonth = (value: Date | null, monthStart: Date): boolean => {
  if (!value) {
    return false;
  }

  const nextMonth = shiftUtcMonth(monthStart, 1);
  return value >= monthStart && value < nextMonth;
};

const isWithinWindow = (value: Date, start: Date, end: Date): boolean =>
  value >= start && value <= end;

const buildFallbackCustomer = (input: {
  shippingCompany: string;
  billingCompany: string;
  customerName: string;
  customerId: string;
}): { key: string; label: string } => {
  if (input.shippingCompany) {
    return { key: `shipping:${input.shippingCompany.toLowerCase()}`, label: input.shippingCompany };
  }

  if (input.billingCompany) {
    return { key: `billing:${input.billingCompany.toLowerCase()}`, label: input.billingCompany };
  }

  if (input.customerName) {
    return { key: `customer-name:${input.customerName.toLowerCase()}`, label: input.customerName };
  }

  if (input.customerId) {
    return { key: `customer-id:${input.customerId}`, label: input.customerId };
  }

  return { key: "", label: "Unknown customer" };
};

const normalizeSubscription = (record: SubscriptionRecord): NormalizedSubscription | null => {
  const id = cleanText(record.Id);

  if (!id) {
    return null;
  }

  const status = cleanText(record.status__c).toLowerCase() || "unknown";
  const startAt = parseSfDateTime(record.Subscription_Start_Date__c);
  const endAt = parseSfDateTime(record.Subscription_End_Date__c);
  const cancelledAt = parseSfDateTime(record.Cancelled_Date__c);
  const terminatedAt =
    endAt ??
    (TERMINAL_LIKE_SNAPSHOT_STATUSES.has(status) ? cancelledAt : null);
  const fallbackCustomer = buildFallbackCustomer({
    shippingCompany: cleanText(record.shipping_company__c),
    billingCompany: cleanText(record.billing_company__c),
    customerName: cleanText(record.Customer__r?.Name),
    customerId: cleanText(record.Customer__c),
  });

  return {
    id,
    status,
    currencyCode: cleanText(record.CurrencyIsoCode) || "USD",
    startAt,
    endAt,
    cancelledAt,
    terminatedAt,
    fallbackCustomerKey: fallbackCustomer.key,
    fallbackCustomerLabel: fallbackCustomer.label,
    originalOrderId: cleanText(record.Order__c),
  };
};

const normalizeOrder = (record: OrderRecord): NormalizedOrder | null => {
  const id = cleanText(record.Id);
  const orderType = normalizeOrderType(record.Order_Type__c);
  const effectiveAt = parseSfDateTime(record.OrderEffectiveDate__c);

  if (!id || !orderType || !effectiveAt) {
    return null;
  }

  const accountId = cleanText(record.License_Owner_Account__c);
  const accountName = cleanText(record.License_Owner_Account__r?.Name);

  return {
    id,
    subscriptionId: cleanText(record.Subscription__c),
    orderType,
    effectiveAt,
    completed: isCompletedOrder(record.OrderisComplete__c),
    totalExTax: roundCurrency(toNumber(record.Totalextax__c)),
    industry: cleanText(record.meta_industry__c) || "Unspecified",
    supportType: cleanText(record.Support_Type__c).toLowerCase(),
    subscriptionType: cleanText(record.SubscriptionType__c),
    customerKey: accountId || (accountName ? `account-name:${accountName.toLowerCase()}` : ""),
    customerLabel: accountName || "",
  };
};

const normalizeOrderLine = (record: OrderLineRecord): NormalizedOrderLine | null => {
  const id = cleanText(record.Id);
  const orderId = cleanText(record.Order__c);
  const amount = roundCurrency(toNumber(record.total__c));

  if (!id || !orderId || amount <= 0) {
    return null;
  }

  return {
    id,
    orderId,
    lineName: cleanText(record.name__c) || cleanText(record.Name),
    amount,
    subscriptionType: cleanText(record.SubscriptionType__c),
    licenseType: cleanText(record.LicenseType__c),
  };
};

const orderLineLooksRecurring = (lineName: string): boolean => SUPPORT_MARKER_REGEX.test(lineName);

const orderLineLooksExcluded = (lineName: string): boolean => EXCLUDED_LINE_REGEX.test(lineName);

const summarizeOrderLines = (
  order: NormalizedOrder,
  lines: readonly NormalizedOrderLine[],
): OrderSummary | null => {
  let baseArr = 0;
  let newSalesArr = 0;
  let upgradeArr = 0;
  let downgradeArr = 0;
  let recurringRevenue = 0;

  const classifyFallback = (subscriptionType: string): void => {
    if (subscriptionType === "Annual") {
      if (order.orderType === "new") {
        baseArr += order.totalExTax;
        newSalesArr += order.totalExTax;
      }

      if (order.orderType === "renewal") {
        baseArr += order.totalExTax;
        recurringRevenue += order.totalExTax;
      }

      if (order.orderType === "upgrade") {
        upgradeArr += order.totalExTax;
        recurringRevenue += order.totalExTax;
      }

      if (order.orderType === "downgrade") {
        downgradeArr += order.totalExTax;
      }
    }
  };

  for (const line of lines) {
    const subscriptionType = line.subscriptionType || order.subscriptionType;
    const hasSupportMarker =
      SUPPORT_TYPES.has(order.supportType) ||
      orderLineLooksRecurring(line.lineName);
    const isExcluded = orderLineLooksExcluded(line.lineName);

    if (!subscriptionType || isExcluded) {
      continue;
    }

    if (subscriptionType === "Annual") {
      if (order.orderType === "new") {
        baseArr += line.amount;
        newSalesArr += line.amount;
      }

      if (order.orderType === "renewal") {
        baseArr += line.amount;
        recurringRevenue += line.amount;
      }

      if (order.orderType === "upgrade") {
        upgradeArr += line.amount;
        recurringRevenue += line.amount;
      }

      if (order.orderType === "downgrade") {
        downgradeArr += line.amount;
      }

      continue;
    }

    if (subscriptionType === "Perpetual") {
      if (order.orderType === "renewal") {
        baseArr += line.amount;
        recurringRevenue += line.amount;
      }

      if (order.orderType === "upgrade" && hasSupportMarker) {
        upgradeArr += line.amount;
        recurringRevenue += line.amount;
      }

      if (order.orderType === "downgrade" && hasSupportMarker) {
        downgradeArr += line.amount;
      }

      continue;
    }

    if (subscriptionType === "Custom" && hasSupportMarker) {
      if (order.orderType === "new") {
        baseArr += line.amount;
      }

      if (order.orderType === "renewal") {
        baseArr += line.amount;
        recurringRevenue += line.amount;
      }

      if (order.orderType === "upgrade") {
        upgradeArr += line.amount;
        recurringRevenue += line.amount;
      }

      if (order.orderType === "downgrade") {
        downgradeArr += line.amount;
      }
    }
  }

  if (lines.length === 0) {
    classifyFallback(order.subscriptionType);
  }

  if (baseArr <= 0 && newSalesArr <= 0 && upgradeArr <= 0 && downgradeArr <= 0 && recurringRevenue <= 0) {
    return null;
  }

  return {
    id: order.id,
    subscriptionId: order.subscriptionId,
    orderType: order.orderType,
    effectiveAt: order.effectiveAt,
    totalRevenue: order.totalExTax,
    customerKey: order.customerKey,
    customerLabel: order.customerLabel,
    industry: order.industry,
    baseArr: roundCurrency(baseArr),
    newSalesArr: roundCurrency(newSalesArr),
    upgradeArr: roundCurrency(upgradeArr),
    downgradeArr: roundCurrency(downgradeArr),
    recurringRevenue: roundCurrency(recurringRevenue),
  };
};

const sortOrderSummaries = (left: OrderSummary, right: OrderSummary): number => {
  if (left.effectiveAt.getTime() !== right.effectiveAt.getTime()) {
    return left.effectiveAt.getTime() - right.effectiveAt.getTime();
  }

  const leftPriority = orderPriority.get(left.orderType) ?? 99;
  const rightPriority = orderPriority.get(right.orderType) ?? 99;
  return leftPriority - rightPriority;
};

const isActiveOnDate = (subscription: NormalizedSubscription, date: Date): boolean => {
  if (!subscription.startAt || subscription.startAt > date) {
    return false;
  }

  return !subscription.terminatedAt || subscription.terminatedAt > date;
};

const buildSnapshotItems = <T extends { label: string; arr: number }>(
  source: Map<string, T>,
  limit: number,
): SfScorecardArrConcentrationItem[] =>
  Array.from(source.entries())
    .map(([key, value]) => ({
      key,
      label: value.label || "Unspecified",
      arr: roundCurrency(value.arr),
      sharePct: 0,
    }))
    .sort((left, right) => right.arr - left.arr)
    .slice(0, limit);

const applySharePct = (
  items: readonly SfScorecardArrConcentrationItem[],
  totalArr: number,
): SfScorecardArrConcentrationItem[] =>
  items.map((item) => ({
    ...item,
    sharePct: pct(item.arr, totalArr),
  }));

const topSharePct = (
  items: readonly SfScorecardArrConcentrationItem[],
  count: number,
  totalArr: number,
): number =>
  pct(items.slice(0, count).reduce((sum, item) => sum + item.arr, 0), totalArr);

const buildPayload = (
  input: {
    subscriptions: readonly SubscriptionRecord[];
    orders: readonly OrderRecord[];
    orderLines: readonly OrderLineRecord[];
  },
  now: Date,
): SfScorecardArrResponse => {
  const subscriptions = input.subscriptions
    .map(normalizeSubscription)
    .filter((record): record is NormalizedSubscription => record !== null);
  const orders = input.orders
    .map(normalizeOrder)
    .filter((record): record is NormalizedOrder => record !== null);
  const orderLines = input.orderLines
    .map(normalizeOrderLine)
    .filter((record): record is NormalizedOrderLine => record !== null);
  const linesByOrderId = new Map<string, NormalizedOrderLine[]>();

  for (const line of orderLines) {
    const bucket = linesByOrderId.get(line.orderId) ?? [];
    bucket.push(line);
    linesByOrderId.set(line.orderId, bucket);
  }

  const completedOrders = orders.filter((order) => order.completed);
  const orderSummaries = completedOrders
    .map((order) => summarizeOrderLines(order, linesByOrderId.get(order.id) ?? []))
    .filter((summary): summary is OrderSummary => summary !== null)
    .sort(sortOrderSummaries);
  const eventsBySubscription = new Map<string, OrderSummary[]>();
  const renewalCandidatesBySubscription = new Map<string, OrderSummary[]>();

  for (const summary of orderSummaries) {
    if (!summary.subscriptionId) {
      continue;
    }

    const eventBucket = eventsBySubscription.get(summary.subscriptionId) ?? [];
    eventBucket.push(summary);
    eventsBySubscription.set(summary.subscriptionId, eventBucket);

    if (summary.recurringRevenue > 0 && (summary.orderType === "renewal" || summary.orderType === "upgrade")) {
      const renewalBucket = renewalCandidatesBySubscription.get(summary.subscriptionId) ?? [];
      renewalBucket.push(summary);
      renewalCandidatesBySubscription.set(summary.subscriptionId, renewalBucket);
    }
  }

  const getArrStateAtDate = (() => {
    const cache = new Map<string, ArrState>();

    return (subscription: NormalizedSubscription, date: Date): ArrState => {
      const cacheKey = `${subscription.id}:${date.getTime()}`;
      const cached = cache.get(cacheKey);

      if (cached) {
        return cached;
      }

      let arr = 0;
      let customerKey = subscription.fallbackCustomerKey;
      let customerLabel = subscription.fallbackCustomerLabel;
      let industry = "Unspecified";
      const events = eventsBySubscription.get(subscription.id) ?? [];

      for (const event of events) {
        if (event.effectiveAt > date) {
          break;
        }

        if (event.customerKey) {
          customerKey = event.customerKey;
        }

        if (event.customerLabel) {
          customerLabel = event.customerLabel;
        }

        if (event.industry) {
          industry = event.industry;
        }

        if (event.baseArr > 0) {
          arr = event.baseArr;
        }

        if (event.upgradeArr > 0) {
          arr += event.upgradeArr;
        }

        if (event.downgradeArr > 0) {
          arr = Math.max(0, arr - event.downgradeArr);
        }
      }

      const payload = {
        arr: roundCurrency(arr),
        customerKey,
        customerLabel: customerLabel || subscription.fallbackCustomerLabel || "Unknown customer",
        industry,
      };

      cache.set(cacheKey, payload);
      return payload;
    };
  })();

  const snapshotCache = new Map<number, Snapshot>();

  const getSnapshotAtDate = (date: Date): Snapshot => {
    const cacheKey = date.getTime();
    const cached = snapshotCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    let totalArr = 0;
    let activeSubscriptions = 0;
    const customerBuckets = new Map<string, { label: string; arr: number }>();
    const industryBuckets = new Map<string, { label: string; arr: number }>();
    const states = new Map<string, SnapshotState>();

    for (const subscription of subscriptions) {
      const active = isActiveOnDate(subscription, date);

      if (active) {
        activeSubscriptions += 1;
      }

      const arrState = getArrStateAtDate(subscription, date);
      const arr = active ? arrState.arr : 0;

      if (arr > 0) {
        totalArr += arr;

        if (arrState.customerKey) {
          const currentCustomer = customerBuckets.get(arrState.customerKey) ?? {
            label: arrState.customerLabel,
            arr: 0,
          };
          currentCustomer.arr += arr;
          customerBuckets.set(arrState.customerKey, currentCustomer);
        }

        const industryKey = (arrState.industry || "Unspecified").toLowerCase();
        const currentIndustry = industryBuckets.get(industryKey) ?? {
          label: arrState.industry || "Unspecified",
          arr: 0,
        };
        currentIndustry.arr += arr;
        industryBuckets.set(industryKey, currentIndustry);
      }

      states.set(subscription.id, {
        active,
        arr,
        customerKey: arrState.customerKey,
        customerLabel: arrState.customerLabel,
        industry: arrState.industry,
      });
    }

    const customerItems = applySharePct(buildSnapshotItems(customerBuckets, 10), totalArr);
    const industryItems = applySharePct(buildSnapshotItems(industryBuckets, 5), totalArr);
    const snapshot = {
      totalArr: roundCurrency(totalArr),
      activeSubscriptions,
      activeCustomers: customerBuckets.size,
      topCustomerSharePct: topSharePct(customerItems, 1, totalArr),
      top5CustomerSharePct: topSharePct(customerItems, 5, totalArr),
      top10CustomerSharePct: topSharePct(customerItems, 10, totalArr),
      topIndustrySharePct: topSharePct(industryItems, 1, totalArr),
      customerItems,
      industryItems,
      states,
    };

    snapshotCache.set(cacheKey, snapshot);
    return snapshot;
  };

  const resolveDueDateForMonth = (
    subscription: NormalizedSubscription,
    monthStart: Date,
  ): Date | null => {
    const startAt = subscription.startAt;

    if (!startAt || monthStart.getUTCFullYear() <= startAt.getUTCFullYear()) {
      return null;
    }

    const month = monthStart.getUTCMonth();

    if (month !== startAt.getUTCMonth()) {
      return null;
    }

    const targetYear = monthStart.getUTCFullYear();
    const daysInMonth = new Date(Date.UTC(targetYear, month + 1, 0)).getUTCDate();
    const day = Math.min(startAt.getUTCDate(), daysInMonth);
    const anniversary = new Date(Date.UTC(
      targetYear,
      month,
      day,
      startAt.getUTCHours(),
      startAt.getUTCMinutes(),
      startAt.getUTCSeconds(),
      startAt.getUTCMilliseconds(),
    ));

    if (anniversary <= startAt) {
      return null;
    }

    if (
      subscription.endAt &&
      sameUtcMonth(subscription.endAt, monthStart) &&
      Math.abs(subscription.endAt.getTime() - anniversary.getTime()) <= 45 * DAY_MS
    ) {
      return subscription.endAt;
    }

    return anniversary;
  };

  const hasRenewalWithinWindow = (subscriptionId: string, dueDate: Date): boolean => {
    const candidates = renewalCandidatesBySubscription.get(subscriptionId) ?? [];
    const windowStart = new Date(dueDate.getTime() - 30 * DAY_MS);
    const windowEnd = new Date(dueDate.getTime() + 30 * DAY_MS);
    return candidates.some((candidate) => isWithinWindow(candidate.effectiveAt, windowStart, windowEnd));
  };

  const churnMonthCache = new Map<string, ChurnMonth>();

  const getChurnedInMonth = (monthStart: Date): ChurnMonth => {
    const cacheKey = formatDateOnlyUtc(monthStart);
    const cached = churnMonthCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const items: ChurnedSubscription[] = [];
    const customerKeys = new Set<string>();

    for (const subscription of subscriptions) {
      const terminatedAt = subscription.endAt ?? subscription.terminatedAt;

      if (!isInMonth(terminatedAt, monthStart) || !terminatedAt) {
        continue;
      }

      const dueDate = resolveDueDateForMonth(subscription, monthStart) ?? terminatedAt;

      if (hasRenewalWithinWindow(subscription.id, dueDate)) {
        continue;
      }

      const arrState = getArrStateAtDate(
        subscription,
        new Date(Math.max(terminatedAt.getTime() - 1, 0)),
      );

      if (arrState.customerKey) {
        customerKeys.add(arrState.customerKey);
      }

      items.push({
        subscriptionId: subscription.id,
        arr: arrState.arr,
        customerKey: arrState.customerKey,
      });
    }

    const payload = { items, customerKeys };
    churnMonthCache.set(cacheKey, payload);
    return payload;
  };

  const getRenewalStatsForMonth = (monthStart: Date): { dueCount: number; renewedCount: number } => {
    let dueCount = 0;
    let renewedCount = 0;

    for (const subscription of subscriptions) {
      const dueDate = resolveDueDateForMonth(subscription, monthStart);

      if (!dueDate || !isInMonth(dueDate, monthStart)) {
        continue;
      }

      if (subscription.terminatedAt && subscription.terminatedAt < new Date(dueDate.getTime() - 30 * DAY_MS)) {
        continue;
      }

      dueCount += 1;

      if (hasRenewalWithinWindow(subscription.id, dueDate)) {
        renewedCount += 1;
      }
    }

    return { dueCount, renewedCount };
  };

  const getNewSalesStatsForMonth = (monthStart: Date): { newArr: number; newSubscriptions: number } => {
    const subscriptionIds = new Set<string>();
    let newArr = 0;

    for (const summary of orderSummaries) {
      if (!summary.subscriptionId || !isInMonth(summary.effectiveAt, monthStart) || summary.newSalesArr <= 0) {
        continue;
      }

      newArr += summary.newSalesArr;
      subscriptionIds.add(summary.subscriptionId);
    }

    return {
      newArr: roundCurrency(newArr),
      newSubscriptions: subscriptionIds.size,
    };
  };

  const getRevenueStatsForMonth = (monthStart: Date): { totalRevenue: number; recurringRevenue: number } => {
    let totalRevenue = 0;
    let recurringRevenue = 0;

    for (const order of completedOrders) {
      if (isInMonth(order.effectiveAt, monthStart)) {
        totalRevenue += order.totalExTax;
      }
    }

    for (const summary of orderSummaries) {
      if (isInMonth(summary.effectiveAt, monthStart)) {
        recurringRevenue += summary.recurringRevenue;
      }
    }

    return {
      totalRevenue: roundCurrency(totalRevenue),
      recurringRevenue: roundCurrency(recurringRevenue),
    };
  };

  const buildBridgeBetweenDates = (
    startDate: Date,
    endDate: Date,
  ): {
    total: SfScorecardArrBridge;
    organic: SfScorecardArrBridge;
    nrr: SfScorecardArrBridge;
    totalArrGrowthPct: number;
    organicArrGrowthPct: number;
    nrrPct: number;
    openingCustomerCount: number;
    lostCustomerCount: number;
  } => {
    const startSnapshot = getSnapshotAtDate(startDate);
    const endSnapshot = getSnapshotAtDate(endDate);
    let openingArr = 0;
    let expansionArr = 0;
    let contractionArr = 0;
    let churnArr = 0;
    let cohortClosingArr = 0;
    const openingCustomerKeys = new Set<string>();
    const endingCustomerKeys = new Set<string>();
    const openingSubscriptionIds = new Set<string>();

    for (const [subscriptionId, state] of startSnapshot.states.entries()) {
      if (state.arr <= 0) {
        continue;
      }

      openingSubscriptionIds.add(subscriptionId);
      openingArr += state.arr;

      if (state.customerKey) {
        openingCustomerKeys.add(state.customerKey);
      }

      const endState = endSnapshot.states.get(subscriptionId);
      const endingArr = endState?.arr ?? 0;
      cohortClosingArr += endingArr;

      if (endingArr <= 0) {
        churnArr += state.arr;
        continue;
      }

      if (endState?.customerKey) {
        endingCustomerKeys.add(endState.customerKey);
      }

      if (endingArr > state.arr) {
        expansionArr += endingArr - state.arr;
      } else if (endingArr < state.arr) {
        contractionArr += state.arr - endingArr;
      }
    }

    let newSalesClosingArr = 0;

    for (const [subscriptionId, state] of endSnapshot.states.entries()) {
      if (state.arr <= 0 || openingSubscriptionIds.has(subscriptionId)) {
        continue;
      }

      newSalesClosingArr += state.arr;
    }

    const lostCustomerCount = Array.from(openingCustomerKeys).filter(
      (customerKey) => !endingCustomerKeys.has(customerKey),
    ).length;
    const totalClosingArr = roundCurrency(endSnapshot.totalArr);
    const organicClosingArr = roundCurrency(cohortClosingArr);

    return {
      total: {
        openingArr: roundCurrency(openingArr),
        newSalesArr: roundCurrency(newSalesClosingArr),
        expansionArr: roundCurrency(expansionArr),
        contractionArr: roundCurrency(contractionArr),
        churnArr: roundCurrency(churnArr),
        closingArr: totalClosingArr,
      },
      organic: {
        openingArr: roundCurrency(openingArr),
        newSalesArr: 0,
        expansionArr: roundCurrency(expansionArr),
        contractionArr: roundCurrency(contractionArr),
        churnArr: roundCurrency(churnArr),
        closingArr: organicClosingArr,
      },
      nrr: {
        openingArr: roundCurrency(openingArr),
        newSalesArr: 0,
        expansionArr: roundCurrency(expansionArr),
        contractionArr: roundCurrency(contractionArr),
        churnArr: roundCurrency(churnArr),
        closingArr: organicClosingArr,
      },
      totalArrGrowthPct: pct(totalClosingArr - openingArr, openingArr),
      organicArrGrowthPct: pct(organicClosingArr - openingArr, openingArr),
      nrrPct: pct(organicClosingArr, openingArr),
      openingCustomerCount: openingCustomerKeys.size,
      lostCustomerCount,
    };
  };

  const nowSnapshot = getSnapshotAtDate(now);
  const asOfDate = formatDateOnlyUtc(now);
  const currentMonthStart = toUtcMonthStart(now);
  const latestFullMonthStart = shiftUtcMonth(currentMonthStart, -1);
  const latestFullMonthEnd = endOfUtcMonth(latestFullMonthStart);
  const latestFullMonthLabel = formatMonthLabel(latestFullMonthStart);
  const previousMonthStart = shiftUtcMonth(latestFullMonthStart, -1);
  const previousMonthEnd = endOfUtcMonth(previousMonthStart);
  const previousMonthLabel = formatMonthLabel(previousMonthStart);
  const firstVisibleMonth = shiftUtcMonth(latestFullMonthStart, -(MONTHS_TO_SHOW - 1));
  const currentTtmStart = shiftUtcMonth(latestFullMonthStart, -11);
  const currentTtmOpeningDate = endOfUtcMonth(shiftUtcMonth(currentTtmStart, -1));
  const previousTtmStart = shiftUtcMonth(currentTtmStart, -12);
  const previousTtmEnd = endOfUtcMonth(shiftUtcMonth(currentTtmStart, -1));
  const latestMonthNewSales = getNewSalesStatsForMonth(latestFullMonthStart);
  const previousMonthNewSales = getNewSalesStatsForMonth(previousMonthStart);
  const latestMonthChurn = getChurnedInMonth(latestFullMonthStart);
  const previousMonthChurn = getChurnedInMonth(previousMonthStart);
  const latestMonthRevenue = getRevenueStatsForMonth(latestFullMonthStart);
  const latestMonthRenewal = getRenewalStatsForMonth(latestFullMonthStart);
  const currentTtmBridge = buildBridgeBetweenDates(currentTtmOpeningDate, latestFullMonthEnd);
  let currentTtmNewSalesArr = 0;
  let currentTtmNewLogos = 0;
  let previousTtmNewSalesArr = 0;
  const currentTtmNewLogoIds = new Set<string>();
  const previousTtmNewLogoIds = new Set<string>();
  let currentTtmRecurringRevenue = 0;
  let currentTtmTotalRevenue = 0;
  let ttmDueCount = 0;
  let ttmRenewedCount = 0;

  for (let index = 0; index < 12; index += 1) {
    const monthStart = shiftUtcMonth(currentTtmStart, index);
    const newSales = getNewSalesStatsForMonth(monthStart);
    const revenue = getRevenueStatsForMonth(monthStart);
    const renewal = getRenewalStatsForMonth(monthStart);

    currentTtmNewSalesArr += newSales.newArr;
    currentTtmRecurringRevenue += revenue.recurringRevenue;
    currentTtmTotalRevenue += revenue.totalRevenue;
    ttmDueCount += renewal.dueCount;
    ttmRenewedCount += renewal.renewedCount;

    for (const summary of orderSummaries) {
      if (
        summary.newSalesArr > 0 &&
        summary.subscriptionId &&
        isInMonth(summary.effectiveAt, monthStart)
      ) {
        currentTtmNewLogoIds.add(summary.subscriptionId);
      }
    }
  }

  for (let index = 0; index < 12; index += 1) {
    const monthStart = shiftUtcMonth(previousTtmStart, index);
    const newSales = getNewSalesStatsForMonth(monthStart);
    previousTtmNewSalesArr += newSales.newArr;

    for (const summary of orderSummaries) {
      if (
        summary.newSalesArr > 0 &&
        summary.subscriptionId &&
        isInMonth(summary.effectiveAt, monthStart)
      ) {
        previousTtmNewLogoIds.add(summary.subscriptionId);
      }
    }
  }

  currentTtmNewLogos = currentTtmNewLogoIds.size;
  const latestMonthStartSnapshot = getSnapshotAtDate(endOfUtcMonth(previousMonthStart));
  const latestMonthBridge = buildBridgeBetweenDates(previousMonthEnd, latestFullMonthEnd);
  const monthlyFlow = Array.from({ length: MONTHS_TO_SHOW }, (_, index) => {
    const monthStart = shiftUtcMonth(firstVisibleMonth, index);
    const monthEnd = endOfUtcMonth(monthStart);
    const previousEnd = endOfUtcMonth(shiftUtcMonth(monthStart, -1));
    const startSnapshot = getSnapshotAtDate(previousEnd);
    const endSnapshot = getSnapshotAtDate(monthEnd);
    const newSales = getNewSalesStatsForMonth(monthStart);
    const churn = getChurnedInMonth(monthStart);
    const revenue = getRevenueStatsForMonth(monthStart);
    const renewal = getRenewalStatsForMonth(monthStart);
    const bridge = buildBridgeBetweenDates(previousEnd, monthEnd);

    return {
      monthStart: formatDateOnlyUtc(monthStart),
      monthLabel: formatMonthLabel(monthStart),
      totalArr: endSnapshot.totalArr,
      activeSubscriptions: endSnapshot.activeSubscriptions,
      activeCustomers: endSnapshot.activeCustomers,
      newSubscriptions: newSales.newSubscriptions,
      endedSubscriptions: churn.items.length,
      netSubscriptions: newSales.newSubscriptions - churn.items.length,
      newArr: newSales.newArr,
      endedArr: roundCurrency(churn.items.reduce((sum, item) => sum + item.arr, 0)),
      netArr: roundCurrency(newSales.newArr - churn.items.reduce((sum, item) => sum + item.arr, 0)),
      totalRevenue: revenue.totalRevenue,
      recurringRevenue: revenue.recurringRevenue,
      recurringRevenuePct: pct(revenue.recurringRevenue, revenue.totalRevenue),
      renewalRatePct: pct(renewal.renewedCount, renewal.dueCount),
      arrChurnPct: pct(churn.items.reduce((sum, item) => sum + item.arr, 0), startSnapshot.totalArr),
      customerChurnPct: pct(churn.customerKeys.size, startSnapshot.activeCustomers),
      retentionPct: roundPct(100 - pct(churn.customerKeys.size, startSnapshot.activeCustomers)),
      netRevenueRetentionPct: bridge.nrrPct,
      topCustomerSharePct: endSnapshot.topCustomerSharePct,
      top5CustomerSharePct: endSnapshot.top5CustomerSharePct,
      topIndustrySharePct: endSnapshot.topIndustrySharePct,
    };
  });

  const currentStatusSubscriptions = subscriptions.filter((subscription) =>
    ACTIVE_SNAPSHOT_STATUSES.has(subscription.status),
  );
  const currentActiveStates = currentStatusSubscriptions.map((subscription) => ({
    subscription,
    state: nowSnapshot.states.get(subscription.id),
  }));
  const activeArr = roundCurrency(
    currentActiveStates.reduce((sum, item) => sum + (item.state?.arr ?? 0), 0),
  );
  const activeCustomerKeys = new Set(
    currentActiveStates
      .map((item) => item.state?.arr && item.state.customerKey ? item.state.customerKey : "")
      .filter(Boolean),
  );
  const pendingCancelStates = currentActiveStates.filter(
    (item) => item.subscription.status === "pending-cancel",
  );
  const pendingCancelArr = roundCurrency(
    pendingCancelStates.reduce((sum, item) => sum + (item.state?.arr ?? 0), 0),
  );
  const statusSnapshot = Array.from(
    subscriptions.reduce((map, subscription) => {
      const current = map.get(subscription.status) ?? { subscriptions: 0, arr: 0 };
      current.subscriptions += 1;

      if (ACTIVE_SNAPSHOT_STATUSES.has(subscription.status)) {
        current.arr += nowSnapshot.states.get(subscription.id)?.arr ?? 0;
      }

      map.set(subscription.status, current);
      return map;
    }, new Map<string, { subscriptions: number; arr: number }>()),
  )
    .map(([status, value]) => ({
      status,
      subscriptions: value.subscriptions,
      arr: roundCurrency(value.arr),
      arrSharePct: pct(value.arr, activeArr),
    }))
    .sort((left, right) => {
      const leftOrder = statusSortOrder.get(left.status) ?? 99;
      const rightOrder = statusSortOrder.get(right.status) ?? 99;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return right.arr - left.arr;
    });

  const runway = Array.from({ length: RUNWAY_MONTHS }, (_, index) => {
    const monthStart = shiftUtcMonth(currentMonthStart, index);
    const eligible = currentStatusSubscriptions.filter(
      (subscription) => subscription.endAt && isInMonth(subscription.endAt, monthStart),
    );
    const endingArr = eligible.reduce(
      (sum, subscription) => sum + (nowSnapshot.states.get(subscription.id)?.arr ?? 0),
      0,
    );
    const pendingCancelEligible = eligible.filter((subscription) => subscription.status === "pending-cancel");
    const pendingCancelMonthArr = pendingCancelEligible.reduce(
      (sum, subscription) => sum + (nowSnapshot.states.get(subscription.id)?.arr ?? 0),
      0,
    );

    return {
      monthStart: formatDateOnlyUtc(monthStart),
      monthLabel: formatMonthLabel(monthStart),
      endingSubscriptions: eligible.length,
      endingArr: roundCurrency(endingArr),
      pendingCancelSubscriptions: pendingCancelEligible.length,
      pendingCancelArr: roundCurrency(pendingCancelMonthArr),
    };
  });

  const currentSnapshot = {
    totalArr: activeArr,
    activeSubscriptions: currentStatusSubscriptions.length,
    activeCustomers: activeCustomerKeys.size,
    activeArr,
    arrPerCustomer: activeCustomerKeys.size > 0 ? roundCurrency(activeArr / activeCustomerKeys.size) : 0,
    pendingCancelSubscriptions: pendingCancelStates.length,
    pendingCancelArr,
    renewalRatePct: pct(ttmRenewedCount, ttmDueCount),
    topCustomerSharePct: nowSnapshot.topCustomerSharePct,
    top5CustomerSharePct: nowSnapshot.top5CustomerSharePct,
    topIndustrySharePct: nowSnapshot.topIndustrySharePct,
  };

  const latestMonthEndedArr = roundCurrency(latestMonthChurn.items.reduce((sum, item) => sum + item.arr, 0));
  const previousMonthEndedArr = roundCurrency(previousMonthChurn.items.reduce((sum, item) => sum + item.arr, 0));
  const trailingTwelveMonths = {
    totalArrGrowthPct: currentTtmBridge.totalArrGrowthPct,
    organicArrGrowthPct: currentTtmBridge.organicArrGrowthPct,
    newSalesArrGrowthPct: pct(currentTtmNewSalesArr - previousTtmNewSalesArr, previousTtmNewSalesArr),
    recurringRevenuePct: pct(currentTtmRecurringRevenue, currentTtmTotalRevenue),
    netRevenueRetentionPct: currentTtmBridge.nrrPct,
    renewalRatePct: pct(ttmRenewedCount, ttmDueCount),
    arrChurnPct: pct(currentTtmBridge.total.churnArr, currentTtmBridge.total.openingArr),
    customerChurnPct: pct(currentTtmBridge.lostCustomerCount, currentTtmBridge.openingCustomerCount),
    retentionPct: roundPct(100 - pct(currentTtmBridge.lostCustomerCount, currentTtmBridge.openingCustomerCount)),
    averageSalesPrice:
      currentTtmNewLogos > 0 ? roundCurrency(currentTtmNewSalesArr / currentTtmNewLogos) : 0,
    ltvProxy:
      currentTtmBridge.lostCustomerCount > 0 && currentTtmBridge.openingCustomerCount > 0
        ? roundCurrency(
            currentSnapshot.arrPerCustomer /
              Math.max(pct(currentTtmBridge.lostCustomerCount, currentTtmBridge.openingCustomerCount) / 100, 0.0001),
          )
        : 0,
    newSalesArr: roundCurrency(currentTtmNewSalesArr),
    newLogos: currentTtmNewLogos,
    recurringRevenue: roundCurrency(currentTtmRecurringRevenue),
    totalRevenue: roundCurrency(currentTtmTotalRevenue),
  };

  const terminalCoveragePool = subscriptions.filter((subscription) =>
    TERMINAL_LIKE_SNAPSHOT_STATUSES.has(subscription.status),
  );
  const terminalCoverageDated = terminalCoveragePool.filter(
    (subscription) => subscription.endAt !== null || subscription.cancelledAt !== null,
  );
  const uniqueCurrencies = [...new Set(subscriptions.map((subscription) => subscription.currencyCode).filter(Boolean))];
  const currencyCode = uniqueCurrencies.length === 1 ? uniqueCurrencies[0] : "USD";

  return sfScorecardArrResponseSchema.parse({
    asOfDate,
    latestFullMonthStartDate: formatDateOnlyUtc(latestFullMonthStart),
    latestFullMonthLabel,
    previousMonthLabel,
    currencyCode,
    currentSnapshot,
    latestMonth: {
      newSubscriptions: latestMonthNewSales.newSubscriptions,
      endedSubscriptions: latestMonthChurn.items.length,
      netSubscriptions: latestMonthNewSales.newSubscriptions - latestMonthChurn.items.length,
      newArr: latestMonthNewSales.newArr,
      endedArr: latestMonthEndedArr,
      netArr: roundCurrency(latestMonthNewSales.newArr - latestMonthEndedArr),
      newArrDiff: latestMonthNewSales.newArr - previousMonthNewSales.newArr,
      endedArrDiff: latestMonthEndedArr - previousMonthEndedArr,
      netArrDiff:
        roundCurrency(latestMonthNewSales.newArr - latestMonthEndedArr) -
        roundCurrency(previousMonthNewSales.newArr - previousMonthEndedArr),
      totalRevenue: latestMonthRevenue.totalRevenue,
      recurringRevenue: latestMonthRevenue.recurringRevenue,
      recurringRevenuePct: pct(latestMonthRevenue.recurringRevenue, latestMonthRevenue.totalRevenue),
      renewalRatePct: pct(latestMonthRenewal.renewedCount, latestMonthRenewal.dueCount),
      arrChurnPct: pct(latestMonthEndedArr, latestMonthStartSnapshot.totalArr),
      customerChurnPct: pct(latestMonthChurn.customerKeys.size, latestMonthStartSnapshot.activeCustomers),
      retentionPct: roundPct(100 - pct(latestMonthChurn.customerKeys.size, latestMonthStartSnapshot.activeCustomers)),
      netRevenueRetentionPct: latestMonthBridge.nrrPct,
    },
    trailingTwelveMonths,
    terminalDateCoverage: {
      statusCount: terminalCoveragePool.length,
      datedCount: terminalCoverageDated.length,
      missingCount: terminalCoveragePool.length - terminalCoverageDated.length,
      coveragePct: pct(terminalCoverageDated.length, terminalCoveragePool.length),
    },
    monthlyFlow,
    statusSnapshot,
    runway,
    bridges: {
      totalArr: currentTtmBridge.total,
      organicArr: currentTtmBridge.organic,
      netRevenueRetention: currentTtmBridge.nrr,
    },
    concentration: {
      customers: {
        top1Pct: nowSnapshot.topCustomerSharePct,
        top5Pct: nowSnapshot.top5CustomerSharePct,
        top10Pct: nowSnapshot.top10CustomerSharePct,
        items: nowSnapshot.customerItems,
      },
      industries: {
        top1Pct: nowSnapshot.topIndustrySharePct,
        top5Pct: topSharePct(nowSnapshot.industryItems, 5, nowSnapshot.totalArr),
        items: nowSnapshot.industryItems,
      },
    },
    caveats: [
      "Upgrade ARR uses qualifying woo_OrderLine__c line totals, not full Woo order totals.",
      "Perpetual new orders are excluded from ARR until a paid recurring renewal or support-bearing upgrade appears.",
      "New Sales ARR counts annual new subscriptions only; custom new rows stay out until their support logic is cleaner.",
      "Renewal rate uses subscription anniversaries from Subscription Start Date, with Subscription End Date only anchoring churn timing and due-month overrides.",
      "Industry concentration comes from the latest ARR-bearing Woo order industry value for each active subscription.",
    ],
  });
};

const buildSubscriptionQuery = (): string =>
  [
    "SELECT Id, status__c, CurrencyIsoCode, Subscription_Start_Date__c, Subscription_End_Date__c,",
    "Cancelled_Date__c, shipping_company__c, billing_company__c, Customer__c, Customer__r.Name, Order__c",
    "FROM woo_Subscription__c",
    "WHERE IsDeleted = false",
  ].join(" ");

const buildOrderQuery = (): string =>
  [
    "SELECT Id, Subscription__c, License_Owner_Account__c, License_Owner_Account__r.Name,",
    "Order_Type__c, OrderEffectiveDate__c, OrderisComplete__c, Totalextax__c, meta_industry__c,",
    "Support_Type__c, SubscriptionType__c",
    "FROM woo_Order__c",
    "WHERE IsDeleted = false",
    "AND OrderEffectiveDate__c != null",
  ].join(" ");

const buildOrderLineQuery = (): string =>
  [
    "SELECT Id, Order__c, Name, name__c, total__c, total_tax__c, SubscriptionType__c, LicenseType__c",
    "FROM woo_OrderLine__c",
    "WHERE IsDeleted = false",
    "AND Order__c != null",
  ].join(" ");

export const getScorecardArrPayload = async (
  now: Date = new Date(),
): Promise<ScorecardServiceResult<SfScorecardArrResponse>> => {
  const cacheKey = `scorecard-arr:${formatDateOnlyUtc(now)}`;
  const cached = readCache(scorecardArrCache, cacheKey);

  if (cached) {
    return {
      payload: cached,
      cacheHit: true,
    };
  }

  const inFlight = scorecardArrInFlight.get(cacheKey);

  if (inFlight) {
    return {
      payload: await inFlight,
      cacheHit: true,
    };
  }

  const loadPromise = Promise.all([
    querySalesforce<SubscriptionRecord>(buildSubscriptionQuery()),
    querySalesforce<OrderRecord>(buildOrderQuery()),
    querySalesforce<OrderLineRecord>(buildOrderLineQuery()),
  ])
    .then(([subscriptions, orders, orderLines]) => {
      const payload = buildPayload({ subscriptions, orders, orderLines }, now);
      writeCache(scorecardArrCache, cacheKey, payload);
      return payload;
    })
    .finally(() => {
      scorecardArrInFlight.delete(cacheKey);
    });

  scorecardArrInFlight.set(cacheKey, loadPromise);

  return {
    payload: await loadPromise,
    cacheHit: false,
  };
};
