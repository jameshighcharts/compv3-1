import { z } from "zod";

export const chartSeriesSchema = z.object({
  name: z.string().min(1),
  data: z.array(z.number()),
  type: z.string().min(1).optional(),
  stack: z.string().min(1).optional(),
});

export const chartPayloadSchema = z.object({
  categories: z.array(z.string()),
  series: z.array(chartSeriesSchema),
  meta: z.object({
    asOf: z.string().datetime({ offset: true }),
    currency: z.string().min(1),
    source: z.string().min(1),
  }),
});

export const kpiPayloadSchema = z.object({
  totalRevenue: z.number(),
  monthlyGrowthPct: z.number(),
  yearlyGrowthPct: z.number(),
  wonDeals: z.number(),
  avgDealSize: z.number(),
  asOf: z.string().datetime({ offset: true }),
  currency: z.string().min(1),
});

export type ChartSeries = z.infer<typeof chartSeriesSchema>;
export type ChartPayload = z.infer<typeof chartPayloadSchema>;
export type KpiPayload = z.infer<typeof kpiPayloadSchema>;
