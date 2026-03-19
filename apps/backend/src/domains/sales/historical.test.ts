import { beforeEach, describe, expect, it, vi } from "vitest";

const { querySalesforceMock } = vi.hoisted(() => ({
  querySalesforceMock: vi.fn(),
}));

vi.mock("../../platform/salesforce/client", () => ({
  querySalesforce: querySalesforceMock,
}));

describe("getHistoricalPayload", () => {
  beforeEach(() => {
    vi.resetModules();
    querySalesforceMock.mockReset();
  });

  it("returns only the monthly order-type revenue series for the selected window", async () => {
    querySalesforceMock.mockImplementation(async (query: string) => {
      if (query.includes("WHERE Order_Type__c = 'new'")) {
        return [
          { yr: 2026, mo: 2, total: 120_000 },
          { yr: 2026, mo: 3, total: 130_000 },
        ];
      }

      if (query.includes("WHERE Order_Type__c = 'renewal'")) {
        return [
          { yr: 2026, mo: 2, total: 50_000 },
          { yr: 2026, mo: 3, total: 70_000 },
        ];
      }

      if (query.includes("WHERE Order_Type__c = 'upgrade'")) {
        return [
          { yr: 2026, mo: 2, total: 30_000 },
          { yr: 2026, mo: 3, total: 90_000 },
        ];
      }

      if (query.includes("WHERE Order_Type__c = 'downgrade'")) {
        return [
          { yr: 2026, mo: 3, total: 10_000 },
        ];
      }

      return [];
    });

    const { resolveRevenueWindow } = await import("./schema");
    const { getHistoricalPayload } = await import("./historical");

    const window = resolveRevenueWindow({
      from: "2026-01-15",
      to: "2026-03-17",
    });

    const { payload, cacheHit } = await getHistoricalPayload(window, {
      customerChannel: "Direct Sales",
    });

    expect(cacheHit).toBe(false);
    expect(payload).toEqual({
      asOfDate: "2026-03-17",
      fromDate: "2026-01-15",
      toDate: "2026-03-17",
      months: ["Jan '26", "Feb '26", "Mar '26"],
      orderTypeRevenue: {
        new: [0, 120, 130],
        upgrade: [0, 30, 90],
        renewal: [0, 50, 70],
        downgrade: [0, 0, 10],
      },
    });

    const issuedQueries = querySalesforceMock.mock.calls.map(([query]) => String(query));

    expect(querySalesforceMock).toHaveBeenCalledTimes(4);
    expect(issuedQueries).toEqual(
      expect.arrayContaining([
        expect.stringContaining("CustomerChannel__c = 'Direct Sales'"),
        expect.stringContaining("OrderEffectiveDate__c >= 2026-01-15T00:00:00Z"),
        expect.stringContaining("OrderEffectiveDate__c <= 2026-03-17T23:59:59Z"),
      ]),
    );
  });
});
