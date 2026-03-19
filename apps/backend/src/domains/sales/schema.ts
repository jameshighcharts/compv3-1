import { z } from "zod";

import {
  DEFAULT_REVENUE_CUSTOMER_CHANNEL,
  DEFAULT_REVENUE_RANGE,
  DEFAULT_REVENUE_SALES_CHANNEL,
  DEFAULT_SCORECARD_MAP_INTERVAL,
  REVENUE_CUSTOMER_CHANNEL_VALUES,
  REVENUE_RANGE_VALUES,
  REVENUE_SALES_CHANNEL_VALUES,
  SCORECARD_MAP_INTERVAL_VALUES,
  type ScorecardMapInterval,
  type RevenueCustomerChannel,
  type RevenueRange,
  type RevenueSalesChannel,
} from "@contracts/sales";
import { getRevenueRangeWindow } from "./revenue-window";

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const revenueQuerySchema = z
  .object({
    range: z.enum(REVENUE_RANGE_VALUES).optional(),
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional(),
    customerChannel: z.enum(REVENUE_CUSTOMER_CHANNEL_VALUES).optional(),
    salesChannel: z.enum(REVENUE_SALES_CHANNEL_VALUES).optional(),
  })
  .superRefine((value, ctx) => {
    const hasFrom = Boolean(value.from);
    const hasTo = Boolean(value.to);

    if (hasFrom !== hasTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Both `from` and `to` are required when using custom interval.",
        path: hasFrom ? ["to"] : ["from"],
      });
    }

    if (value.from && value.to && value.from > value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "`from` must be less than or equal to `to`.",
        path: ["from"],
      });
    }

    if (value.range && (value.from || value.to)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use either `range` or `from/to`, not both.",
        path: ["range"],
      });
    }
  });

export type RevenueWindow = {
  key: string;
  from: string;
  to: string;
  label: string;
  range: RevenueRange | null;
  isCustom: boolean;
};

export type RevenueFilters = {
  customerChannel: RevenueCustomerChannel;
  salesChannel: RevenueSalesChannel;
};

export const resolveRevenueWindow = (input: unknown, now: Date = new Date()): RevenueWindow => {
  const parsed = revenueQuerySchema.parse(input);

  if (parsed.from && parsed.to) {
    return {
      key: `custom:${parsed.from}:${parsed.to}`,
      from: parsed.from,
      to: parsed.to,
      label: `${parsed.from} to ${parsed.to}`,
      range: null,
      isCustom: true,
    };
  }

  const range = parsed.range ?? DEFAULT_REVENUE_RANGE;
  const interval = getRevenueRangeWindow(range, now);

  return {
    key: `range:${range}:${interval.from}:${interval.to}`,
    from: interval.from,
    to: interval.to,
    label: interval.label,
    range,
    isCustom: false,
  };
};

export const resolveRevenueFilters = (input: unknown): RevenueFilters => {
  const parsed = revenueQuerySchema.parse(input);

  return {
    customerChannel: parsed.customerChannel ?? DEFAULT_REVENUE_CUSTOMER_CHANNEL,
    salesChannel: parsed.salesChannel ?? DEFAULT_REVENUE_SALES_CHANNEL,
  };
};

export const resolveRevenueWindowFromSearchParams = (
  searchParams: URLSearchParams,
  now: Date = new Date(),
): RevenueWindow =>
  resolveRevenueWindow(
    {
      range: searchParams.get("range") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    },
    now,
  );

export const resolveRevenueFiltersFromSearchParams = (
  searchParams: URLSearchParams,
): RevenueFilters =>
  resolveRevenueFilters({
    customerChannel: searchParams.get("customerChannel") ?? undefined,
    salesChannel: searchParams.get("salesChannel") ?? undefined,
  });

export const resolveScorecardMapInterval = (
  input: unknown,
): ScorecardMapInterval =>
  z
    .enum(SCORECARD_MAP_INTERVAL_VALUES)
    .catch(DEFAULT_SCORECARD_MAP_INTERVAL)
    .parse(input);

export const resolveScorecardMapIntervalFromSearchParams = (
  searchParams: URLSearchParams,
): ScorecardMapInterval =>
  resolveScorecardMapInterval(searchParams.get("interval") ?? undefined);
