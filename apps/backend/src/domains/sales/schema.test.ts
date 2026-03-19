import { describe, expect, it } from "vitest";

import { resolveRevenueWindow } from "./schema";

const DAYS_IN_MS = 24 * 60 * 60 * 1000;

const inclusiveDaysBetween = (from: string, to: string): number => {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.floor((end - start) / DAYS_IN_MS) + 1;
};

describe("resolveRevenueWindow", () => {
  const now = new Date("2026-03-04T12:00:00Z");

  it("uses the default 12-month interval", () => {
    const result = resolveRevenueWindow({}, now);

    expect(result.range).toBe("12m");
    expect(result.from).toBe("2025-04-01");
    expect(result.to).toBe("2026-03-04");
    expect(result.isCustom).toBe(false);
  });

  it("resolves preset ranges", () => {
    const result = resolveRevenueWindow({ range: "30d" }, now);

    expect(result.range).toBe("30d");
    expect(inclusiveDaysBetween(result.from, result.to)).toBe(30);
  });

  it("resolves custom from/to windows", () => {
    const result = resolveRevenueWindow(
      {
        from: "2026-01-01",
        to: "2026-02-15",
      },
      now,
    );

    expect(result.range).toBeNull();
    expect(result.from).toBe("2026-01-01");
    expect(result.to).toBe("2026-02-15");
    expect(result.isCustom).toBe(true);
  });

  it("rejects mixed range and custom window params", () => {
    expect(() =>
      resolveRevenueWindow(
        {
          range: "90d",
          from: "2026-01-01",
          to: "2026-02-15",
        },
        now,
      ),
    ).toThrowError("Use either `range` or `from/to`, not both.");
  });
});
