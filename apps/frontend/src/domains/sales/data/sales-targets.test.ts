import { describe, expect, it } from "vitest";

import {
  buildSalesTargetBenchmarks,
  resolveSalesTargetSummary,
} from "./sales-targets";

describe("sales target helpers", () => {
  it("keeps to-date gauge targets separate from full-period scorecard targets", () => {
    const now = new Date(2026, 1, 20, 12, 0, 0, 0);
    const summary = resolveSalesTargetSummary(["Jan '26", "Feb '26"], now);

    expect(summary.month.toDate.budget).toBeCloseTo(833_333.4, 1);
    expect(summary.month.total.budget).toBeCloseTo(1_111_111.2, 1);
    expect(summary.month.total.budget).toBeGreaterThan(summary.month.toDate.budget);
    expect(summary.ytd.total.budget).toBeGreaterThan(summary.ytd.toDate.budget);
  });

  it("builds scorecard benchmarks from full targets plus to-date pacing", () => {
    const now = new Date(2026, 1, 20, 12, 0, 0, 0);
    const summary = resolveSalesTargetSummary(["Jan '26", "Feb '26"], now);
    const benchmarks = buildSalesTargetBenchmarks(
      900_000,
      summary.month.total,
      summary.month.toDate,
    );

    expect(benchmarks).toEqual([
      expect.objectContaining({
        key: "base",
        name: "Base",
        pctReached: 87.2,
        pctOnTrack: 116.3,
      }),
      expect.objectContaining({
        key: "budget",
        name: "Budget",
        pctReached: 81.0,
        pctOnTrack: 108.0,
      }),
      expect.objectContaining({
        key: "high",
        name: "High",
        pctReached: 75.6,
        pctOnTrack: 100.8,
      }),
    ]);
  });
});
