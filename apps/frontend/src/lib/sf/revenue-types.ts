export const REVENUE_RANGE_VALUES = ["30d", "90d", "ytd", "12m"] as const;

export type RevenueRange = (typeof REVENUE_RANGE_VALUES)[number];

export const DEFAULT_REVENUE_RANGE: RevenueRange = "12m";

export const REVENUE_RANGE_LABELS: Record<RevenueRange, string> = {
  "30d": "30D",
  "90d": "90D",
  ytd: "YTD",
  "12m": "12M",
};
