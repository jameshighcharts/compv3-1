import { beforeEach, describe, expect, it, vi } from "vitest";

const { querySalesforceMock } = vi.hoisted(() => ({
  querySalesforceMock: vi.fn(),
}));

vi.mock("../../platform/salesforce/client", () => ({
  querySalesforce: querySalesforceMock,
}));

describe("strategy initiatives service", () => {
  beforeEach(() => {
    vi.resetModules();
    querySalesforceMock.mockReset();
  });

  it("builds monthly Woodes, Morningstar, and Grid revenue streams", async () => {
    querySalesforceMock.mockImplementation(async (query: string) => {
      if (query.includes("FROM Opportunity")) {
        expect(query).toContain("IsWon = true");
        expect(query).toContain("LeadSource IN ('Woodes in breach', 'Woodes no license', 'Referral from Morningstar')");

        return [
          {
            yr: 2025,
            mo: 2,
            LeadSource: "Woodes in breach",
            recordCount: 6,
            totalAmount: 70_904.84,
          },
          {
            yr: 2025,
            mo: 2,
            LeadSource: "Referral from Morningstar",
            recordCount: 1,
            totalAmount: 32_000,
          },
          {
            yr: 2025,
            mo: 3,
            LeadSource: "Woodes no license",
            recordCount: 2,
            totalAmount: 3_756,
          },
        ];
      }

      if (query.includes("FROM woo_OrderLine__c")) {
        expect(query).toContain("name__c LIKE '%Grid%'");
        expect(query).toContain("OrderEffectiveDate__c");

        return [
          {
            yr: 2026,
            mo: 1,
            recordCount: 9,
            totalAmount: 2_030.25,
          },
          {
            yr: 2026,
            mo: 2,
            recordCount: 7,
            totalAmount: 2_217,
          },
        ];
      }

      throw new Error(`Unexpected query: ${query}`);
    });

    const { getStrategyInitiativesPayload } = await import("./strategy-initiatives");

    const { payload, cacheHit } = await getStrategyInitiativesPayload(
      new Date("2026-03-19T12:00:00Z"),
    );

    expect(cacheHit).toBe(false);
    expect(payload.asOfDate).toBe("2026-03-19");
    expect(payload.fromMonth).toBe("2024-10-01");
    expect(payload.currentYear).toBe(2026);
    expect(payload.previousYear).toBe(2025);
    expect(payload.monthly).toHaveLength(18);

    expect(
      payload.monthly.find((row) => row.monthStart === "2025-02-01"),
    ).toMatchObject({
      woodes: 70_904.84,
      morningstar: 32_000,
      grid: 0,
      combined: 102_904.84,
    });

    expect(
      payload.monthly.find((row) => row.monthStart === "2026-01-01"),
    ).toMatchObject({
      woodes: 0,
      morningstar: 0,
      grid: 2_030.25,
      combined: 2_030.25,
    });

    expect(payload.initiatives).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "Woodes",
          sourceObject: "Opportunity",
          totalRevenue: 74_660.84,
          ytdRevenue: 0,
          recordCount: 8,
        }),
        expect.objectContaining({
          key: "Morningstar",
          sourceObject: "Opportunity",
          totalRevenue: 32_000,
          ytdRevenue: 0,
          recordCount: 1,
        }),
        expect.objectContaining({
          key: "Grid",
          sourceObject: "woo_OrderLine__c",
          totalRevenue: 4_247.25,
          ytdRevenue: 4_247.25,
          recordCount: 16,
        }),
      ]),
    );

    expect(payload.ytdCurrentRevenue).toBe(4_247.25);
    expect(payload.ytdPreviousRevenue).toBe(106_660.84);
    expect(payload.ytdDiffRevenue).toBe(-102_413.59);
    expect(payload.ytdDiffPct).toBe(-96.02);
  });
});
