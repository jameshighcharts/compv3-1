import { describe, expect, it } from "vitest";

import { chartPayloadSchema, kpiPayloadSchema } from "./common";

describe("contract schemas", () => {
  it("accepts a valid chart payload", () => {
    const result = chartPayloadSchema.safeParse({
      categories: ["Jan", "Feb"],
      series: [{ name: "Revenue", data: [100, 200] }],
      meta: {
        asOf: "2026-02-14T12:00:00Z",
        currency: "USD",
        source: "dashboard/sales/monthly.json",
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects chart payload with invalid date", () => {
    const result = chartPayloadSchema.safeParse({
      categories: ["Jan"],
      series: [{ name: "Revenue", data: [100] }],
      meta: {
        asOf: "not-a-date",
        currency: "USD",
        source: "dashboard/sales/monthly.json",
      },
    });

    expect(result.success).toBe(false);
  });

  it("accepts a valid KPI payload", () => {
    const result = kpiPayloadSchema.safeParse({
      totalRevenue: 200000,
      monthlyGrowthPct: 4.1,
      yearlyGrowthPct: 12.5,
      wonDeals: 85,
      avgDealSize: 23500,
      asOf: "2026-02-14T12:00:00Z",
      currency: "USD",
    });

    expect(result.success).toBe(true);
  });

  it("rejects KPI payload missing numeric fields", () => {
    const result = kpiPayloadSchema.safeParse({
      monthlyGrowthPct: 4.1,
      yearlyGrowthPct: 12.5,
      wonDeals: 85,
      avgDealSize: 23500,
      asOf: "2026-02-14T12:00:00Z",
      currency: "USD",
    });

    expect(result.success).toBe(false);
  });
});
