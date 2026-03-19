import { beforeEach, describe, expect, it, vi } from "vitest";

const { querySalesforceMock } = vi.hoisted(() => ({
  querySalesforceMock: vi.fn(),
}));

vi.mock("../../platform/salesforce/client", () => ({
  querySalesforce: querySalesforceMock,
}));

const makeChannelRows = (
  salesChannel: string,
  rows: Array<{ yr: number; mo: number; total: number }>,
) =>
  rows.map(({ yr, mo, total }) => ({
    meta_SalesChannel__c: salesChannel,
    yr,
    mo,
    total,
  }));

describe("getRevenuePayload", () => {
  beforeEach(() => {
    vi.resetModules();
    querySalesforceMock.mockReset();
  });

  it("uses a prior-year comparison window for YTD totals on rolling 12-month dashboards", async () => {
    const chartDirectRows = makeChannelRows("Assisted", [
      { yr: 2025, mo: 4, total: 400_000 },
      { yr: 2025, mo: 5, total: 300_000 },
      { yr: 2025, mo: 6, total: 350_000 },
      { yr: 2025, mo: 7, total: 325_000 },
      { yr: 2025, mo: 8, total: 360_000 },
      { yr: 2025, mo: 9, total: 380_000 },
      { yr: 2025, mo: 10, total: 420_000 },
      { yr: 2025, mo: 11, total: 410_000 },
      { yr: 2025, mo: 12, total: 430_000 },
      { yr: 2026, mo: 1, total: 700_000 },
      { yr: 2026, mo: 2, total: 500_000 },
      { yr: 2026, mo: 3, total: 1_200_000 },
    ]);
    const chartPartnerRows = makeChannelRows("Assisted", [
      { yr: 2025, mo: 4, total: 200_000 },
      { yr: 2025, mo: 5, total: 240_000 },
      { yr: 2025, mo: 6, total: 220_000 },
      { yr: 2025, mo: 7, total: 210_000 },
      { yr: 2025, mo: 8, total: 205_000 },
      { yr: 2025, mo: 9, total: 215_000 },
      { yr: 2025, mo: 10, total: 230_000 },
      { yr: 2025, mo: 11, total: 225_000 },
      { yr: 2025, mo: 12, total: 235_000 },
      { yr: 2026, mo: 1, total: 300_000 },
      { yr: 2026, mo: 2, total: 400_000 },
      { yr: 2026, mo: 3, total: 800_000 },
    ]);

    const toplineDirectRows = makeChannelRows("Assisted", [
      { yr: 2025, mo: 1, total: 600_000 },
      { yr: 2025, mo: 2, total: 300_000 },
      { yr: 2025, mo: 3, total: 500_000 },
      ...chartDirectRows.map(({ yr, mo, total }) => ({ yr, mo, total })),
    ]);
    const toplinePartnerRows = makeChannelRows("Assisted", [
      { yr: 2025, mo: 1, total: 400_000 },
      { yr: 2025, mo: 2, total: 200_000 },
      { yr: 2025, mo: 3, total: 500_000 },
      ...chartPartnerRows.map(({ yr, mo, total }) => ({ yr, mo, total })),
    ]);

    const currentMonthDailyRows = [
      { dy: 1, cnt: 3, total: 101_000 },
      { dy: 2, cnt: 2, total: 98_000 },
      { dy: 15, cnt: 4, total: 20_695 },
      { dy: 16, cnt: 5, total: 24_115 },
    ];

    const currentMonthDailyOrderTypeRows = {
      new: [
        { dy: 1, total: 50_000 },
        { dy: 2, total: 68_000 },
        { dy: 16, total: 20_000 },
      ],
      renewal: [
        { dy: 1, total: 51_000 },
        { dy: 15, total: 10_695 },
      ],
      upgrade: [
        { dy: 2, total: 30_000 },
        { dy: 15, total: 10_000 },
      ],
      downgrade: [
        { dy: 16, total: 4_115 },
      ],
    };

    const priorYearMonthDailyRows = [
      { dy: 1, cnt: 2, total: 91_000 },
      { dy: 2, cnt: 1, total: 87_000 },
      { dy: 15, cnt: 3, total: 18_400 },
      { dy: 16, cnt: 2, total: 19_600 },
    ];

    querySalesforceMock.mockImplementation(async (query: string) => {
      if (
        query.includes("WHERE Order_Type__c = 'new'") &&
        query.includes("DAY_IN_MONTH(OrderEffectiveDate__c) dy") &&
        query.includes("OrderEffectiveDate__c >= 2026-03-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-16T23:59:59Z")
      ) {
        return currentMonthDailyOrderTypeRows.new;
      }

      if (
        query.includes("WHERE Order_Type__c = 'renewal'") &&
        query.includes("DAY_IN_MONTH(OrderEffectiveDate__c) dy") &&
        query.includes("OrderEffectiveDate__c >= 2026-03-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-16T23:59:59Z")
      ) {
        return currentMonthDailyOrderTypeRows.renewal;
      }

      if (
        query.includes("WHERE Order_Type__c = 'upgrade'") &&
        query.includes("DAY_IN_MONTH(OrderEffectiveDate__c) dy") &&
        query.includes("OrderEffectiveDate__c >= 2026-03-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-16T23:59:59Z")
      ) {
        return currentMonthDailyOrderTypeRows.upgrade;
      }

      if (
        query.includes("WHERE Order_Type__c = 'downgrade'") &&
        query.includes("DAY_IN_MONTH(OrderEffectiveDate__c) dy") &&
        query.includes("OrderEffectiveDate__c >= 2026-03-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-16T23:59:59Z")
      ) {
        return currentMonthDailyOrderTypeRows.downgrade;
      }

      if (
        query.includes("DAY_IN_MONTH(OrderEffectiveDate__c) dy") &&
        query.includes("OrderEffectiveDate__c >= 2026-03-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-16T23:59:59Z")
      ) {
        return currentMonthDailyRows;
      }

      if (
        query.includes("DAY_IN_MONTH(OrderEffectiveDate__c) dy") &&
        query.includes("OrderEffectiveDate__c >= 2025-03-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2025-03-16T23:59:59Z")
      ) {
        return priorYearMonthDailyRows;
      }

      if (
        query.includes("CustomerChannel__c = 'Direct Sales'") &&
        query.includes("OrderEffectiveDate__c >= 2025-04-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-16T23:59:59Z")
      ) {
        return chartDirectRows;
      }

      if (
        query.includes("CustomerChannel__c = 'Channel Partner Sales'") &&
        query.includes("OrderEffectiveDate__c >= 2025-04-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-16T23:59:59Z")
      ) {
        return chartPartnerRows;
      }

      if (
        query.includes("CustomerChannel__c = 'Direct Sales'") &&
        query.includes("OrderEffectiveDate__c >= 2025-01-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-16T23:59:59Z")
      ) {
        return toplineDirectRows;
      }

      if (
        query.includes("CustomerChannel__c = 'Channel Partner Sales'") &&
        query.includes("OrderEffectiveDate__c >= 2025-01-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-16T23:59:59Z")
      ) {
        return toplinePartnerRows;
      }

      return [];
    });

    const { resolveRevenueWindow } = await import("./schema");
    const { getRevenuePayload } = await import("./service");

    const window = resolveRevenueWindow(
      { range: "12m" },
      new Date("2026-03-16T12:00:00Z"),
    );

    const { payload } = await getRevenuePayload(window);

    expect(payload.months).toEqual([
      "Apr '25",
      "May '25",
      "Jun '25",
      "Jul '25",
      "Aug '25",
      "Sep '25",
      "Oct '25",
      "Nov '25",
      "Dec '25",
      "Jan '26",
      "Feb '26",
      "Mar '26",
    ]);
    expect(payload.thisMonthTotal).toBe(2);
    expect(payload.prevMonthTotal).toBe(0.9);
    expect(payload.ytdTotal).toBe(3.9);
    expect(payload.prevYtdTotal).toBe(2.5);
    expect(payload.asOfDate).toBe("2026-03-16");
    expect(payload.todayTotal).toBe(24_115);
    expect(payload.prevDayTotal).toBe(20_695);
    expect(payload.rangeDailyLabels).toEqual([]);
    expect(payload.rangeDailyRevenue).toEqual([]);
    expect(payload.rangeDailyOrderTypeRevenue).toEqual({
      new: [],
      upgrade: [],
      renewal: [],
      downgrade: [],
    });
    expect(payload.currentMonthDailyRevenue).toHaveLength(16);
    expect(payload.currentMonthDailyRevenue.at(0)).toBe(101_000);
    expect(payload.currentMonthDailyRevenue.at(14)).toBe(20_695);
    expect(payload.currentMonthDailyRevenue.at(15)).toBe(24_115);
    expect(payload.currentMonthDailyOrderTypeRevenue.new.at(0)).toBe(50_000);
    expect(payload.currentMonthDailyOrderTypeRevenue.new.at(1)).toBe(68_000);
    expect(payload.currentMonthDailyOrderTypeRevenue.renewal.at(0)).toBe(51_000);
    expect(payload.currentMonthDailyOrderTypeRevenue.upgrade.at(14)).toBe(10_000);
    expect(payload.currentMonthDailyOrderTypeRevenue.downgrade.at(15)).toBe(4_115);
    expect(payload.priorYearMonthDailyRevenue).toHaveLength(16);
    expect(payload.priorYearMonthDailyRevenue.at(15)).toBe(19_600);
    expect(payload.currentMonthDailyOrders.at(15)).toBe(5);
    expect(payload.priorYearMonthDailyOrders.at(15)).toBe(2);

    const issuedQueries = querySalesforceMock.mock.calls.map(([query]) => String(query));

    expect(issuedQueries).toEqual(
      expect.arrayContaining([
        expect.stringContaining("OrderEffectiveDate__c >= 2025-01-01T00:00:00Z"),
        expect.stringContaining("DAY_IN_MONTH(OrderEffectiveDate__c) dy"),
      ]),
    );
  });

  it("returns cross-month daily revenue series for 30d windows", async () => {
    const chartDirectRows = makeChannelRows("Assisted", [
      { yr: 2026, mo: 2, total: 200_000 },
      { yr: 2026, mo: 3, total: 300_000 },
    ]);

    const toplineDirectRows = makeChannelRows("Assisted", [
      { yr: 2025, mo: 1, total: 150_000 },
      { yr: 2025, mo: 2, total: 180_000 },
      { yr: 2025, mo: 3, total: 190_000 },
      { yr: 2026, mo: 1, total: 100_000 },
      { yr: 2026, mo: 2, total: 200_000 },
      { yr: 2026, mo: 3, total: 300_000 },
    ]);

    const monthlyOrderTypeRows = {
      new: [
        { yr: 2026, mo: 2, cnt: 2, total: 120_000 },
        { yr: 2026, mo: 3, cnt: 3, total: 130_000 },
      ],
      renewal: [
        { yr: 2026, mo: 2, cnt: 1, total: 50_000 },
        { yr: 2026, mo: 3, cnt: 2, total: 70_000 },
      ],
      upgrade: [
        { yr: 2026, mo: 2, cnt: 1, total: 30_000 },
        { yr: 2026, mo: 3, cnt: 1, total: 90_000 },
      ],
      downgrade: [
        { yr: 2026, mo: 3, cnt: 1, total: 10_000 },
      ],
    };

    const currentMonthDailyRows = [
      { dy: 1, cnt: 1, total: 3_000 },
      { dy: 17, cnt: 2, total: 7_000 },
    ];

    const currentMonthDailyOrderTypeRows = {
      new: [
        { dy: 1, total: 3_000 },
      ],
      renewal: [],
      upgrade: [
        { dy: 17, total: 6_000 },
      ],
      downgrade: [
        { dy: 17, total: 1_000 },
      ],
    };

    const priorYearMonthDailyRows = [
      { dy: 1, cnt: 1, total: 2_500 },
      { dy: 17, cnt: 1, total: 5_500 },
    ];

    const rangeDailyRows = [
      { yr: 2026, mo: 2, dy: 16, cnt: 1, total: 1_000 },
      { yr: 2026, mo: 2, dy: 28, cnt: 2, total: 5_000 },
      { yr: 2026, mo: 3, dy: 1, cnt: 1, total: 3_000 },
      { yr: 2026, mo: 3, dy: 17, cnt: 2, total: 7_000 },
    ];

    const rangeDailyOrderTypeRows = {
      new: [
        { yr: 2026, mo: 2, dy: 16, total: 1_000 },
        { yr: 2026, mo: 3, dy: 1, total: 3_000 },
      ],
      renewal: [
        { yr: 2026, mo: 2, dy: 28, total: 5_000 },
      ],
      upgrade: [
        { yr: 2026, mo: 3, dy: 17, total: 6_000 },
      ],
      downgrade: [
        { yr: 2026, mo: 3, dy: 17, total: 1_000 },
      ],
    };

    querySalesforceMock.mockImplementation(async (query: string) => {
      if (
        query.includes("CALENDAR_YEAR(OrderEffectiveDate__c) yr") &&
        query.includes("DAY_IN_MONTH(OrderEffectiveDate__c) dy") &&
        query.includes("OrderEffectiveDate__c >= 2026-02-16T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-17T23:59:59Z")
      ) {
        if (query.includes("WHERE Order_Type__c = 'new'")) {
          return rangeDailyOrderTypeRows.new;
        }

        if (query.includes("WHERE Order_Type__c = 'renewal'")) {
          return rangeDailyOrderTypeRows.renewal;
        }

        if (query.includes("WHERE Order_Type__c = 'upgrade'")) {
          return rangeDailyOrderTypeRows.upgrade;
        }

        if (query.includes("WHERE Order_Type__c = 'downgrade'")) {
          return rangeDailyOrderTypeRows.downgrade;
        }

        return rangeDailyRows;
      }

      if (
        query.includes("DAY_IN_MONTH(OrderEffectiveDate__c) dy") &&
        query.includes("OrderEffectiveDate__c >= 2026-03-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-17T23:59:59Z")
      ) {
        if (query.includes("WHERE Order_Type__c = 'new'")) {
          return currentMonthDailyOrderTypeRows.new;
        }

        if (query.includes("WHERE Order_Type__c = 'renewal'")) {
          return currentMonthDailyOrderTypeRows.renewal;
        }

        if (query.includes("WHERE Order_Type__c = 'upgrade'")) {
          return currentMonthDailyOrderTypeRows.upgrade;
        }

        if (query.includes("WHERE Order_Type__c = 'downgrade'")) {
          return currentMonthDailyOrderTypeRows.downgrade;
        }

        return currentMonthDailyRows;
      }

      if (
        query.includes("DAY_IN_MONTH(OrderEffectiveDate__c) dy") &&
        query.includes("OrderEffectiveDate__c >= 2025-03-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2025-03-17T23:59:59Z")
      ) {
        return priorYearMonthDailyRows;
      }

      if (
        query.includes("COUNT(Id) cnt") &&
        query.includes("CALENDAR_MONTH(OrderEffectiveDate__c) mo") &&
        query.includes("OrderEffectiveDate__c >= 2026-02-16T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-17T23:59:59Z")
      ) {
        if (query.includes("WHERE Order_Type__c = 'new'")) {
          return monthlyOrderTypeRows.new;
        }

        if (query.includes("WHERE Order_Type__c = 'renewal'")) {
          return monthlyOrderTypeRows.renewal;
        }

        if (query.includes("WHERE Order_Type__c = 'upgrade'")) {
          return monthlyOrderTypeRows.upgrade;
        }

        if (query.includes("WHERE Order_Type__c = 'downgrade'")) {
          return monthlyOrderTypeRows.downgrade;
        }
      }

      if (
        query.includes("CustomerChannel__c = 'Direct Sales'") &&
        query.includes("OrderEffectiveDate__c >= 2026-02-16T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-17T23:59:59Z")
      ) {
        return chartDirectRows;
      }

      if (
        query.includes("CustomerChannel__c = 'Direct Sales'") &&
        query.includes("OrderEffectiveDate__c >= 2025-01-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-17T23:59:59Z")
      ) {
        return toplineDirectRows;
      }

      return [];
    });

    const { resolveRevenueWindow } = await import("./schema");
    const { getRevenuePayload } = await import("./service");

    const window = resolveRevenueWindow(
      { range: "30d" },
      new Date("2026-03-17T12:00:00Z"),
    );

    const { payload } = await getRevenuePayload(window, {
      customerChannel: "Direct Sales",
      salesChannel: "all",
    });

    expect(payload.months).toEqual(["Feb '26", "Mar '26"]);
    expect(payload.rangeDailyLabels).toHaveLength(30);
    expect(payload.rangeDailyLabels.at(0)).toBe("Feb 16");
    expect(payload.rangeDailyLabels.at(12)).toBe("Feb 28");
    expect(payload.rangeDailyLabels.at(13)).toBe("Mar 1");
    expect(payload.rangeDailyLabels.at(29)).toBe("Mar 17");
    expect(payload.rangeDailyRevenue.at(0)).toBe(1_000);
    expect(payload.rangeDailyRevenue.at(12)).toBe(5_000);
    expect(payload.rangeDailyRevenue.at(13)).toBe(3_000);
    expect(payload.rangeDailyRevenue.at(29)).toBe(7_000);
    expect(payload.rangeDailyOrderTypeRevenue.new.at(0)).toBe(1_000);
    expect(payload.rangeDailyOrderTypeRevenue.new.at(13)).toBe(3_000);
    expect(payload.rangeDailyOrderTypeRevenue.renewal.at(12)).toBe(5_000);
    expect(payload.rangeDailyOrderTypeRevenue.upgrade.at(29)).toBe(6_000);
    expect(payload.rangeDailyOrderTypeRevenue.downgrade.at(29)).toBe(1_000);

    const issuedQueries = querySalesforceMock.mock.calls.map(([query]) => String(query));

    expect(issuedQueries).toEqual(
      expect.arrayContaining([
        expect.stringContaining("OrderEffectiveDate__c >= 2026-02-16T00:00:00Z"),
        expect.stringContaining("CALENDAR_YEAR(OrderEffectiveDate__c) yr"),
      ]),
    );
  });
});
