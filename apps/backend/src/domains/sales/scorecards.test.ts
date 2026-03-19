import { beforeEach, describe, expect, it, vi } from "vitest";

const { querySalesforceMock } = vi.hoisted(() => ({
  querySalesforceMock: vi.fn(),
}));

vi.mock("../../platform/salesforce/client", () => ({
  querySalesforce: querySalesforceMock,
}));

describe("scorecard services", () => {
  beforeEach(() => {
    vi.resetModules();
    querySalesforceMock.mockReset();
  });

  it("builds the map payload from live Salesforce aggregates", async () => {
    querySalesforceMock.mockImplementation(async (query: string) => {
      if (query.includes("GROUP BY shipping_country__c, billing_country__c, CALENDAR_YEAR(OrderEffectiveDate__c), CALENDAR_MONTH(OrderEffectiveDate__c)")) {
        return [
          { billing_country__c: "IN", yr: 2025, mo: 10, cnt: 2, total: 18_000 },
          { billing_country__c: "IN", yr: 2025, mo: 11, cnt: 2, total: 20_000 },
          { billing_country__c: "IN", yr: 2025, mo: 12, cnt: 3, total: 22_000 },
          { billing_country__c: "IN", yr: 2026, mo: 1, cnt: 3, total: 40_000 },
          { billing_country__c: "IN", yr: 2026, mo: 2, cnt: 4, total: 50_000 },
          { billing_country__c: "IN", yr: 2026, mo: 3, cnt: 8, total: 120_000 },
          { billing_country__c: "IN", yr: 2025, mo: 3, cnt: 4, total: 60_000 },
          { billing_country__c: "BR", yr: 2025, mo: 10, cnt: 1, total: 12_000 },
          { billing_country__c: "BR", yr: 2025, mo: 11, cnt: 1, total: 14_000 },
          { billing_country__c: "BR", yr: 2025, mo: 12, cnt: 1, total: 16_000 },
          { billing_country__c: "BR", yr: 2026, mo: 1, cnt: 2, total: 30_000 },
          { billing_country__c: "BR", yr: 2026, mo: 2, cnt: 3, total: 45_000 },
          { billing_country__c: "BR", yr: 2026, mo: 3, cnt: 6, total: 90_000 },
          { billing_country__c: "BR", yr: 2025, mo: 3, cnt: 3, total: 40_000 },
          { billing_country__c: "DE", yr: 2026, mo: 2, cnt: 6, total: 150_000 },
          { billing_country__c: "DE", yr: 2026, mo: 3, cnt: 7, total: 180_000 },
          { billing_country__c: "DE", yr: 2025, mo: 3, cnt: 6, total: 170_000 },
          { billing_country__c: "US", yr: 2026, mo: 2, cnt: 8, total: 190_000 },
          { billing_country__c: "US", yr: 2026, mo: 3, cnt: 10, total: 200_000 },
          { billing_country__c: "US", yr: 2025, mo: 3, cnt: 9, total: 180_000 },
        ];
      }

      if (
        query.includes("GROUP BY shipping_country__c, billing_country__c, shipping_state__c, billing_state__c") &&
        query.includes("OrderEffectiveDate__c >= 2026-03-01T00:00:00Z")
      ) {
        return [
          { billing_country__c: "IN", billing_state__c: "Karnataka", cnt: 5, total: 70_000 },
          { billing_country__c: "IN", billing_state__c: "Maharashtra", cnt: 3, total: 50_000 },
          { billing_country__c: "BR", billing_state__c: "SP", cnt: 6, total: 90_000 },
          { billing_country__c: "DE", billing_state__c: "Berlin", cnt: 7, total: 180_000 },
          { billing_country__c: "US", billing_state__c: "NY", cnt: 6, total: 120_000 },
          { billing_country__c: "US", billing_state__c: "CA", cnt: 4, total: 80_000 },
        ];
      }

      if (
        query.includes("GROUP BY shipping_country__c, billing_country__c") &&
        query.includes("OrderEffectiveDate__c >= 2026-03-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-16T23:59:59Z")
      ) {
        return [
          { billing_country__c: "IN", cnt: 8, total: 120_000 },
          { billing_country__c: "BR", cnt: 6, total: 90_000 },
          { billing_country__c: "DE", cnt: 7, total: 180_000 },
          { billing_country__c: "US", cnt: 10, total: 200_000 },
        ];
      }

      if (
        query.includes("GROUP BY shipping_country__c, billing_country__c") &&
        query.includes("OrderEffectiveDate__c >= 2026-02-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-02-16T23:59:59Z")
      ) {
        return [
          { billing_country__c: "IN", cnt: 4, total: 50_000 },
          { billing_country__c: "BR", cnt: 3, total: 45_000 },
          { billing_country__c: "DE", cnt: 6, total: 150_000 },
          { billing_country__c: "US", cnt: 8, total: 190_000 },
        ];
      }

      if (
        query.includes("GROUP BY shipping_country__c, billing_country__c") &&
        query.includes("OrderEffectiveDate__c >= 2025-03-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2025-03-16T23:59:59Z")
      ) {
        return [
          { billing_country__c: "IN", cnt: 4, total: 60_000 },
          { billing_country__c: "BR", cnt: 3, total: 40_000 },
          { billing_country__c: "DE", cnt: 6, total: 170_000 },
          { billing_country__c: "US", cnt: 9, total: 180_000 },
        ];
      }

      if (
        query.includes("GROUP BY shipping_country__c, billing_country__c") &&
        query.includes("OrderEffectiveDate__c >= 2026-01-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-16T23:59:59Z")
      ) {
        return [
          { billing_country__c: "IN", cnt: 15, total: 210_000 },
          { billing_country__c: "BR", cnt: 11, total: 165_000 },
          { billing_country__c: "DE", cnt: 13, total: 330_000 },
          { billing_country__c: "US", cnt: 21, total: 390_000 },
        ];
      }

      if (
        query.includes("GROUP BY shipping_country__c, billing_country__c") &&
        query.includes("OrderEffectiveDate__c >= 2025-01-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2025-03-16T23:59:59Z")
      ) {
        return [
          { billing_country__c: "IN", cnt: 4, total: 60_000 },
          { billing_country__c: "BR", cnt: 3, total: 40_000 },
          { billing_country__c: "DE", cnt: 6, total: 170_000 },
          { billing_country__c: "US", cnt: 9, total: 180_000 },
        ];
      }

      return [];
    });

    const { getScorecardMapPayload } = await import("./scorecards");

    const { payload } = await getScorecardMapPayload(
      {
        customerChannel: "all",
        salesChannel: "all",
      },
      "mtd",
      new Date("2026-03-16T12:00:00Z"),
    );

    expect(payload.asOfDate).toBe("2026-03-16");
    expect(payload.ordersThisMonth).toBe(31);
    expect(payload.topContinent.continent).toBe("North America");
    expect(payload.topContinent.revenue).toBe(200_000);
    expect(payload.europe.revenue).toBe(180_000);
    expect(payload.emergingMarkets.revenue).toBe(210_000);
    expect(payload.emergingMarkets.countries.map((country) => country.country)).toEqual(
      expect.arrayContaining(["India", "Brazil"]),
    );
    expect(payload.locationPins.map((pin) => pin.label)).toEqual(
      expect.arrayContaining(["India", "California", "New York"]),
    );
    expect(payload.ytdComparison.currentYear).toBe(2026);
    expect(payload.ytdComparison.previousYear).toBe(2025);
    expect(payload.ytdComparison.continents[0]).toMatchObject({
      continent: "North America",
      currentRevenue: 200_000,
      previousRevenue: 180_000,
    });
    expect(payload.ytdComparison.continents.map((row) => row.continent)).not.toContain("Other");
    expect(payload.continentTable[0]?.continent).toBe("North America");
    expect(payload.continentTable[0]?.yoyGrowthPct).toBe(11.1);
    expect(payload.ytdComparison.currentLabel).toBe("2026 MTD");
    expect(payload.ytdComparison.previousLabel).toBe("2025 MTD");
    expect(payload.ytdComparison.currentPeriodStartDate).toBe("2026-03-01");
    expect(payload.ytdComparison.previousPeriodStartDate).toBe("2025-03-01");
  });

  it("builds the map payload for the ytd interval", async () => {
    querySalesforceMock.mockImplementation(async (query: string) => {
      if (query.includes("GROUP BY shipping_country__c, billing_country__c, CALENDAR_YEAR(OrderEffectiveDate__c), CALENDAR_MONTH(OrderEffectiveDate__c)")) {
        return [
          { billing_country__c: "IN", yr: 2025, mo: 10, cnt: 2, total: 18_000 },
          { billing_country__c: "IN", yr: 2025, mo: 11, cnt: 2, total: 20_000 },
          { billing_country__c: "IN", yr: 2025, mo: 12, cnt: 3, total: 22_000 },
          { billing_country__c: "IN", yr: 2026, mo: 1, cnt: 3, total: 40_000 },
          { billing_country__c: "IN", yr: 2026, mo: 2, cnt: 4, total: 50_000 },
          { billing_country__c: "IN", yr: 2026, mo: 3, cnt: 8, total: 120_000 },
          { billing_country__c: "IN", yr: 2025, mo: 3, cnt: 4, total: 60_000 },
          { billing_country__c: "BR", yr: 2026, mo: 1, cnt: 2, total: 30_000 },
          { billing_country__c: "BR", yr: 2026, mo: 2, cnt: 3, total: 45_000 },
          { billing_country__c: "BR", yr: 2026, mo: 3, cnt: 6, total: 90_000 },
          { billing_country__c: "BR", yr: 2025, mo: 3, cnt: 3, total: 40_000 },
          { billing_country__c: "DE", yr: 2026, mo: 2, cnt: 6, total: 150_000 },
          { billing_country__c: "DE", yr: 2026, mo: 3, cnt: 7, total: 180_000 },
          { billing_country__c: "DE", yr: 2025, mo: 3, cnt: 6, total: 170_000 },
          { billing_country__c: "US", yr: 2026, mo: 2, cnt: 8, total: 190_000 },
          { billing_country__c: "US", yr: 2026, mo: 3, cnt: 10, total: 200_000 },
          { billing_country__c: "US", yr: 2025, mo: 3, cnt: 9, total: 180_000 },
        ];
      }

      if (
        query.includes("GROUP BY shipping_country__c, billing_country__c, shipping_state__c, billing_state__c") &&
        query.includes("OrderEffectiveDate__c >= 2026-01-01T00:00:00Z")
      ) {
        return [
          { billing_country__c: "IN", billing_state__c: "Karnataka", cnt: 9, total: 125_000 },
          { billing_country__c: "BR", billing_state__c: "SP", cnt: 11, total: 165_000 },
          { billing_country__c: "DE", billing_state__c: "Berlin", cnt: 13, total: 330_000 },
          { billing_country__c: "US", billing_state__c: "CA", cnt: 11, total: 180_000 },
          { billing_country__c: "US", billing_state__c: "NY", cnt: 10, total: 210_000 },
        ];
      }

      if (
        query.includes("GROUP BY shipping_country__c, billing_country__c") &&
        query.includes("OrderEffectiveDate__c >= 2026-01-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-16T23:59:59Z")
      ) {
        return [
          { billing_country__c: "IN", cnt: 15, total: 210_000 },
          { billing_country__c: "BR", cnt: 11, total: 165_000 },
          { billing_country__c: "DE", cnt: 13, total: 330_000 },
          { billing_country__c: "US", cnt: 21, total: 390_000 },
        ];
      }

      if (
        query.includes("GROUP BY shipping_country__c, billing_country__c") &&
        query.includes("OrderEffectiveDate__c >= 2025-01-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2025-03-16T23:59:59Z")
      ) {
        return [
          { billing_country__c: "IN", cnt: 4, total: 60_000 },
          { billing_country__c: "BR", cnt: 3, total: 40_000 },
          { billing_country__c: "DE", cnt: 6, total: 170_000 },
          { billing_country__c: "US", cnt: 9, total: 180_000 },
        ];
      }

      return [];
    });

    const { getScorecardMapPayload } = await import("./scorecards");

    const { payload } = await getScorecardMapPayload(
      {
        customerChannel: "all",
        salesChannel: "all",
      },
      "ytd",
      new Date("2026-03-16T12:00:00Z"),
    );

    expect(payload.ordersThisMonth).toBe(60);
    expect(payload.topContinent.revenue).toBe(390_000);
    expect(payload.continentTable[0]?.yoyGrowthPct).toBe(116.7);
    expect(payload.ytdComparison.currentLabel).toBe("2026 YTD");
    expect(payload.ytdComparison.previousLabel).toBe("2025 YTD");
  });

  it("prefers shipping country for non-US markets and falls back to billing country when shipping is empty", async () => {
    querySalesforceMock.mockImplementation(async (query: string) => {
      if (query.includes("GROUP BY shipping_country__c, billing_country__c, CALENDAR_YEAR(OrderEffectiveDate__c), CALENDAR_MONTH(OrderEffectiveDate__c)")) {
        return [];
      }

      if (
        query.includes("GROUP BY shipping_country__c, billing_country__c, shipping_state__c, billing_state__c") &&
        query.includes("OrderEffectiveDate__c >= 2026-03-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-16T23:59:59Z")
      ) {
        return [
          { shipping_country__c: "PT", billing_country__c: "US", billing_state__c: "CA", cnt: 2, total: 2_000 },
          { shipping_country__c: null, billing_country__c: "DE", billing_state__c: "Berlin", cnt: 1, total: 1_000 },
          { shipping_country__c: "US", billing_country__c: "US", billing_state__c: "NY", cnt: 3, total: 3_000 },
        ];
      }

      if (
        query.includes("GROUP BY shipping_country__c, billing_country__c") &&
        query.includes("OrderEffectiveDate__c >= 2026-03-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-16T23:59:59Z")
      ) {
        return [
          { shipping_country__c: "PT", billing_country__c: "US", cnt: 2, total: 2_000 },
          { shipping_country__c: null, billing_country__c: "DE", cnt: 1, total: 1_000 },
          { shipping_country__c: "US", billing_country__c: "US", cnt: 3, total: 3_000 },
        ];
      }

      if (
        query.includes("GROUP BY shipping_country__c, billing_country__c") &&
        query.includes("OrderEffectiveDate__c >= 2026-02-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-02-16T23:59:59Z")
      ) {
        return [];
      }

      if (
        query.includes("GROUP BY shipping_country__c, billing_country__c") &&
        query.includes("OrderEffectiveDate__c >= 2025-03-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2025-03-16T23:59:59Z")
      ) {
        return [];
      }

      return [];
    });

    const { getScorecardMapPayload } = await import("./scorecards");

    const { payload } = await getScorecardMapPayload(
      {
        customerChannel: "all",
        salesChannel: "all",
      },
      "mtd",
      new Date("2026-03-16T12:00:00Z"),
    );

    expect(payload.locationPins.map((pin) => pin.label)).toEqual(
      expect.arrayContaining(["Portugal", "Germany", "New York"]),
    );
    expect(payload.locationPins.map((pin) => pin.label)).not.toContain("California");
    expect(payload.continentTable.find((row) => row.continent === "Europe")?.revenue).toBe(3_000);
    expect(payload.continentTable.find((row) => row.continent === "North America")?.revenue).toBe(3_000);
  });

  it("uses shipping geography for channel partner orders when billing is locked to Great Britain", async () => {
    querySalesforceMock.mockImplementation(async (query: string) => {
      if (query.includes("GROUP BY shipping_country__c, billing_country__c, CALENDAR_YEAR(OrderEffectiveDate__c), CALENDAR_MONTH(OrderEffectiveDate__c)")) {
        return [];
      }

      if (
        query.includes("GROUP BY shipping_country__c, billing_country__c, shipping_state__c, billing_state__c") &&
        query.includes("OrderEffectiveDate__c >= 2025-04-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-16T23:59:59Z")
      ) {
        return [
          {
            shipping_country__c: "US",
            billing_country__c: "GB",
            shipping_state__c: "NY",
            billing_state__c: null,
            cnt: 12,
            total: 120_000,
          },
          {
            shipping_country__c: "US",
            billing_country__c: "GB",
            shipping_state__c: "CA",
            billing_state__c: null,
            cnt: 8,
            total: 80_000,
          },
          {
            shipping_country__c: "DE",
            billing_country__c: "GB",
            shipping_state__c: null,
            billing_state__c: null,
            cnt: 5,
            total: 50_000,
          },
        ];
      }

      if (
        query.includes("GROUP BY shipping_country__c, billing_country__c") &&
        query.includes("OrderEffectiveDate__c >= 2025-04-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-16T23:59:59Z")
      ) {
        return [
          { shipping_country__c: "US", billing_country__c: "GB", cnt: 20, total: 200_000 },
          { shipping_country__c: "DE", billing_country__c: "GB", cnt: 5, total: 50_000 },
        ];
      }

      if (
        query.includes("GROUP BY shipping_country__c, billing_country__c") &&
        query.includes("OrderEffectiveDate__c >= 2024-04-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2025-03-16T23:59:59Z")
      ) {
        return [];
      }

      return [];
    });

    const { getScorecardMapPayload } = await import("./scorecards");

    const { payload } = await getScorecardMapPayload(
      {
        customerChannel: "Channel Partner Sales",
        salesChannel: "all",
      },
      "12m",
      new Date("2026-03-16T12:00:00Z"),
    );

    expect(payload.topContinent.continent).toBe("North America");
    expect(payload.topContinent.revenue).toBe(200_000);
    expect(payload.locationPins.map((pin) => pin.label)).toEqual(
      expect.arrayContaining(["New York", "California", "Germany"]),
    );
    expect(payload.locationPins.map((pin) => pin.label)).not.toContain("United Kingdom");
  });

  it("keeps all interval locations instead of trimming longer-range map pins", async () => {
    const usStates = [
      "Alabama",
      "Alaska",
      "Arizona",
      "Arkansas",
      "California",
      "Colorado",
      "Connecticut",
      "Delaware",
      "Florida",
      "Georgia",
      "Hawaii",
      "Idaho",
      "Illinois",
      "Indiana",
      "Iowa",
      "Kansas",
      "Kentucky",
      "Louisiana",
      "Maine",
      "Maryland",
      "Massachusetts",
      "Michigan",
      "Minnesota",
      "Mississippi",
      "Missouri",
      "Montana",
      "Nebraska",
      "Nevada",
      "New Hampshire",
      "New Jersey",
      "New Mexico",
      "New York",
      "North Carolina",
      "North Dakota",
      "Ohio",
      "Oklahoma",
      "Oregon",
      "Pennsylvania",
      "Rhode Island",
      "South Carolina",
      "South Dakota",
      "Tennessee",
      "Texas",
      "Utah",
      "Vermont",
      "Virginia",
      "Washington",
      "West Virginia",
      "Wisconsin",
      "Wyoming",
    ];
    const countryCodes = ["DE", "FR", "ES", "IT", "GB", "IE", "NL", "BE", "CH", "SE", "PT"];
    const locationRows = [
      ...usStates.map((state, index) => ({
        billing_country__c: "US",
        billing_state__c: state,
        cnt: 100 - index,
        total: (100 - index) * 1_000,
      })),
      ...countryCodes.map((code, index) => ({
        billing_country__c: code,
        billing_state__c: null,
        cnt: 11 - index,
        total: (11 - index) * 500,
      })),
    ];
    const usOrders = usStates.reduce((sum, _state, index) => sum + (100 - index), 0);
    const usRevenue = usStates.reduce((sum, _state, index) => sum + (100 - index) * 1_000, 0);
    const currentRows = [
      { billing_country__c: "US", cnt: usOrders, total: usRevenue },
      ...countryCodes.map((code, index) => ({
        billing_country__c: code,
        cnt: 11 - index,
        total: (11 - index) * 500,
      })),
    ];
    const previousRows = [
      { billing_country__c: "US", cnt: Math.round(usOrders * 0.9), total: Math.round(usRevenue * 0.9) },
      ...countryCodes.map((code, index) => ({
        billing_country__c: code,
        cnt: Math.max(1, 10 - index),
        total: Math.max(1, 10 - index) * 450,
      })),
    ];

    querySalesforceMock.mockImplementation(async (query: string) => {
      if (query.includes("GROUP BY shipping_country__c, billing_country__c, CALENDAR_YEAR(OrderEffectiveDate__c), CALENDAR_MONTH(OrderEffectiveDate__c)")) {
        return [];
      }

      if (
        query.includes("GROUP BY shipping_country__c, billing_country__c, shipping_state__c, billing_state__c") &&
        query.includes("OrderEffectiveDate__c >= 2025-04-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-16T23:59:59Z")
      ) {
        return locationRows;
      }

      if (
        query.includes("GROUP BY shipping_country__c, billing_country__c") &&
        query.includes("OrderEffectiveDate__c >= 2025-04-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-16T23:59:59Z")
      ) {
        return currentRows;
      }

      if (
        query.includes("GROUP BY shipping_country__c, billing_country__c") &&
        query.includes("OrderEffectiveDate__c >= 2024-04-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2025-03-16T23:59:59Z")
      ) {
        return previousRows;
      }

      return [];
    });

    const { getScorecardMapPayload } = await import("./scorecards");

    const { payload } = await getScorecardMapPayload(
      {
        customerChannel: "all",
        salesChannel: "all",
      },
      "12m",
      new Date("2026-03-16T12:00:00Z"),
    );

    expect(payload.locationPins).toHaveLength(61);
    expect(payload.locationPins.map((pin) => pin.label)).toContain("Portugal");
  });

  it("builds top deals from today's Woo order records", async () => {
    querySalesforceMock.mockImplementation(async (query: string) => {
      if (
        query.includes("SELECT COUNT(Id) cnt,") &&
        query.includes("SUM(Totalextax__c) total") &&
        query.includes("OrderEffectiveDate__c >= 2026-03-16T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-16T23:59:59Z")
      ) {
        return [{ cnt: 12, total: 152_800 }];
      }

      return [
        {
          Id: "a0Y0001",
          billing_company__c: "Acme Corp",
          Totalextax__c: 48_500,
          Order_Type__c: "renewal",
          LicenseType__c: "enterprise",
          status__c: "completed",
          License_Owner__r: { Name: "Sarah Johnson" },
        },
        {
          Id: "a0Y0002",
          billing_company__c: "Nova Labs",
          Totalextax__c: 21_000,
          Order_Type__c: "new",
          SubscriptionType__c: "starter",
          status__c: "processing",
          Owner: { Name: "Mike Chen" },
        },
      ];
    });

    const { getScorecardTopDealsPayload } = await import("./scorecards");

    const { payload } = await getScorecardTopDealsPayload(
      {
        customerChannel: "Direct Sales",
        salesChannel: "Assisted",
      },
      new Date("2026-03-16T12:00:00Z"),
    );

    expect(payload.asOfDate).toBe("2026-03-16");
    expect(payload.totalAmount).toBe(152_800);
    expect(payload.totalDeals).toBe(12);
    expect(payload.deals[0]).toMatchObject({
      company: "Acme Corp",
      owner: "Sarah Johnson",
      amount: 48_500,
      type: "Renewal",
      licenceType: "Enterprise",
      stage: "Completed",
    });
    expect(payload.deals[1]).toMatchObject({
      company: "Nova Labs",
      owner: "Mike Chen",
      type: "New",
      licenceType: "Starter",
      stage: "Processing",
    });
  });

  it("builds a live today summary from order and opportunity aggregates", async () => {
    querySalesforceMock.mockImplementation(async (query: string) => {
      if (
        query.includes("FROM Opportunity") &&
        query.includes("CreatedDate >= 2026-03-16T00:00:00Z") &&
        query.includes("CreatedDate <= 2026-03-16T23:59:59Z")
      ) {
        return [{ cnt: 3, total: 48_200 }];
      }

      if (
        query.includes("FROM Opportunity") &&
        query.includes("CreatedDate >= 2026-03-15T00:00:00Z") &&
        query.includes("CreatedDate <= 2026-03-15T23:59:59Z")
      ) {
        return [{ cnt: 2, total: 36_100 }];
      }

      if (
        query.includes("OrderEffectiveDate__c >= 2026-03-16T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-16T23:59:59Z") &&
        !query.includes("Order_Type__c =")
      ) {
        return [{ cnt: 7, total: 24_115 }];
      }

      if (
        query.includes("OrderEffectiveDate__c >= 2026-03-15T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-15T23:59:59Z") &&
        !query.includes("Order_Type__c =")
      ) {
        return [{ cnt: 6, total: 20_695 }];
      }

      if (query.includes("Order_Type__c = 'new'") && query.includes("2026-03-16T00:00:00Z")) {
        return [{ cnt: 4, total: 9_200 }];
      }

      if (query.includes("Order_Type__c = 'new'") && query.includes("2026-03-15T00:00:00Z")) {
        return [{ cnt: 3, total: 8_700 }];
      }

      if (query.includes("Order_Type__c = 'renewal'") && query.includes("2026-03-16T00:00:00Z")) {
        return [{ cnt: 7, total: 10_400 }];
      }

      if (query.includes("Order_Type__c = 'renewal'") && query.includes("2026-03-15T00:00:00Z")) {
        return [{ cnt: 4, total: 7_800 }];
      }

      if (query.includes("Order_Type__c = 'upgrade'") && query.includes("2026-03-16T00:00:00Z")) {
        return [{ cnt: 2, total: 4_515 }];
      }

      if (query.includes("Order_Type__c = 'upgrade'") && query.includes("2026-03-15T00:00:00Z")) {
        return [{ cnt: 2, total: 4_195 }];
      }

      if (query.includes("Order_Type__c = 'downgrade'")) {
        return [{ cnt: 0, total: 0 }];
      }

      return [];
    });

    const { getScorecardTodaySummaryPayload } = await import("./scorecards");

    const { payload } = await getScorecardTodaySummaryPayload(
      {
        customerChannel: "all",
        salesChannel: "all",
      },
      new Date("2026-03-16T12:00:00Z"),
    );

    expect(payload.asOfDate).toBe("2026-03-16");
    expect(payload.totalRevenue).toBe(24_115);
    expect(payload.revenueDiff).toBe(3_420);
    expect(payload.newLicences).toBe(4);
    expect(payload.newLicencesDiff).toBe(1);
    expect(payload.renewals).toBe(7);
    expect(payload.renewalsDiff).toBe(3);
    expect(payload.upgrades).toBe(2);
    expect(payload.upgradesDiff).toBe(0);
    expect(payload.avgDealSize).toBe(3_445);
    expect(payload.avgDealSizeDiff).toBe(-4);
    expect(payload.pipelineAdded).toBe(48_200);
    expect(payload.pipelineAddedDiff).toBe(12_100);
  });

  it("builds the live channel dashboard from Woo order and subscription aggregates", async () => {
    querySalesforceMock.mockImplementation(async (query: string) => {
      if (
        query.includes("COUNT_DISTINCT(Customer__c) customers") &&
        query.includes("OrderEffectiveDate__c >= 2026-03-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-16T23:59:59Z")
      ) {
        return [{ cnt: 12, customers: 9, total: 120_000 }];
      }

      if (
        query.includes("COUNT_DISTINCT(Customer__c) customers") &&
        query.includes("OrderEffectiveDate__c >= 2026-02-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-02-16T23:59:59Z")
      ) {
        return [{ cnt: 10, customers: 8, total: 100_000 }];
      }

      if (
        query.includes("COUNT_DISTINCT(Customer__c) customers") &&
        query.includes("OrderEffectiveDate__c >= 2026-01-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-16T23:59:59Z")
      ) {
        return [{ cnt: 30, customers: 21, total: 305_000 }];
      }

      if (
        query.includes("COUNT_DISTINCT(Customer__c) customers") &&
        query.includes("OrderEffectiveDate__c >= 2025-01-01T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2025-03-16T23:59:59Z")
      ) {
        return [{ cnt: 24, customers: 18, total: 240_000 }];
      }

      if (
        query.includes("FROM woo_Subscription__c") &&
        query.includes("Subscription_Start_Date__c >= 2026-03-01T00:00:00Z")
      ) {
        return [{ cnt: 4 }];
      }

      if (
        query.includes("FROM woo_Subscription__c") &&
        query.includes("Subscription_Start_Date__c >= 2026-02-01T00:00:00Z")
      ) {
        return [{ cnt: 3 }];
      }

      if (
        query.includes("FROM woo_Subscription__c") &&
        query.includes("Subscription_Start_Date__c >= 2026-01-01T00:00:00Z")
      ) {
        return [{ cnt: 9 }];
      }

      if (
        query.includes("FROM woo_Subscription__c") &&
        query.includes("Subscription_Start_Date__c >= 2025-01-01T00:00:00Z")
      ) {
        return [{ cnt: 7 }];
      }

      if (
        query.includes("SELECT payment_method__c,") &&
        query.includes("OrderEffectiveDate__c >= 2026-03-01T00:00:00Z")
      ) {
        return [
          { payment_method__c: "hs_stripe", cnt: 7, total: 80_000 },
          { payment_method__c: "cod", cnt: 3, total: 30_000 },
          { payment_method__c: "hs_paypal", cnt: 2, total: 10_000 },
        ];
      }

      if (
        query.includes("SELECT meta_type__c,") &&
        query.includes("meta_is_renewal__c,") &&
        query.includes("meta_is_upgrade__c,") &&
        query.includes("OrderEffectiveDate__c >= 2026-03-01T00:00:00Z")
      ) {
        return [
          { meta_type__c: "renewal", meta_is_renewal__c: false, meta_is_upgrade__c: false, cnt: 5, total: 55_000 },
          { meta_type__c: "", meta_is_renewal__c: false, meta_is_upgrade__c: false, cnt: 4, total: 40_000 },
          { meta_type__c: "", meta_is_renewal__c: false, meta_is_upgrade__c: true, cnt: 3, total: 25_000 },
        ];
      }

      if (
        query.includes("SELECT meta_SalesChannel__c,") &&
        query.includes("OrderEffectiveDate__c >= 2026-03-01T00:00:00Z")
      ) {
        return [
          { meta_SalesChannel__c: "Assisted", cnt: 8, total: 90_000 },
          { meta_SalesChannel__c: "Self-care", cnt: 4, total: 30_000 },
        ];
      }

      if (
        query.includes("SELECT LicenseType__c,") &&
        query.includes("OrderEffectiveDate__c >= 2026-01-01T00:00:00Z")
      ) {
        return [
          { LicenseType__c: "SaaS", cnt: 9, total: 120_000 },
          { LicenseType__c: "OEM License", cnt: 11, total: 95_000 },
          { LicenseType__c: "Internal", cnt: 5, total: 50_000 },
        ];
      }

      if (
        query.includes("SELECT shipping_country__c,") &&
        query.includes("OrderEffectiveDate__c >= 2026-01-01T00:00:00Z")
      ) {
        return [
          { shipping_country__c: "US", cnt: 12, total: 140_000 },
          { shipping_country__c: "DE", cnt: 7, total: 95_000 },
          { shipping_country__c: "NO", cnt: 4, total: 45_000 },
        ];
      }

      if (
        query.includes("SELECT status__c, COUNT(Id) cnt") &&
        query.includes("FROM woo_Subscription__c") &&
        !query.includes("Subscription_Start_Date__c")
      ) {
        return [
          { status__c: "active", cnt: 16 },
          { status__c: "pending-cancel", cnt: 3 },
          { status__c: "cancelled", cnt: 2 },
        ];
      }

      if (
        query.includes("SELECT CALENDAR_YEAR(OrderEffectiveDate__c) yr,") &&
        query.includes("DAY_IN_MONTH(OrderEffectiveDate__c) dy") &&
        query.includes("meta_type__c") &&
        query.includes("OrderEffectiveDate__c >= 2026-02-15T00:00:00Z") &&
        query.includes("OrderEffectiveDate__c <= 2026-03-16T23:59:59Z")
      ) {
        return [
          { yr: 2026, mo: 2, dy: 15, meta_type__c: "new", total: 10_000 },
          { yr: 2026, mo: 2, dy: 28, meta_type__c: "renewal", total: 30_000 },
          { yr: 2026, mo: 3, dy: 1, meta_type__c: "upgrade", total: 20_000 },
          { yr: 2026, mo: 3, dy: 16, meta_type__c: "downgrade", total: 5_000 },
        ];
      }

      if (
        query.includes("SELECT ValueSegment__c,") &&
        query.includes("OrderEffectiveDate__c >= 2026-03-01T00:00:00Z")
      ) {
        return [
          { ValueSegment__c: "4. Enterprise", cnt: 2, total: 70_000 },
          { ValueSegment__c: "3. High", cnt: 4, total: 30_000 },
          { ValueSegment__c: "1. Low", cnt: 6, total: 20_000 },
        ];
      }

      if (
        query.includes("SELECT ValueSegment__c,") &&
        query.includes("OrderEffectiveDate__c >= 2026-01-01T00:00:00Z")
      ) {
        return [
          { ValueSegment__c: "4. Enterprise", cnt: 6, total: 150_000 },
          { ValueSegment__c: "3. High", cnt: 9, total: 80_000 },
          { ValueSegment__c: "2. Medium", cnt: 8, total: 50_000 },
          { ValueSegment__c: "1. Low", cnt: 7, total: 25_000 },
        ];
      }

      return [];
    });

    const { resolveRevenueWindow } = await import("./schema");
    const { getScorecardChannelDashboardPayload } = await import("./scorecards");
    const now = new Date("2026-03-16T12:00:00Z");
    const intervalWindow = resolveRevenueWindow({ range: "30d" }, now);

    const { payload } = await getScorecardChannelDashboardPayload(
      {
        customerChannel: "Direct Sales",
        salesChannel: "all",
      },
      intervalWindow,
      now,
    );

    expect(payload.asOfDate).toBe("2026-03-16");
    expect(payload.customerChannel).toBe("Direct Sales");
    expect(payload.mtd).toMatchObject({
      revenue: 120_000,
      orders: 12,
      customers: 9,
      avgDealSize: 10_000,
      newSubscriptions: 4,
    });
    expect(payload.previousYtd.newSubscriptions).toBe(7);
    expect(payload.paymentMethodsMtd[0]).toMatchObject({
      key: "hs_stripe",
      label: "Stripe",
      revenue: 80_000,
      orders: 7,
    });
    expect(payload.salesChannelsMtd).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Assisted", revenue: 90_000 }),
        expect.objectContaining({ label: "Self-care", revenue: 30_000 }),
      ]),
    );
    expect(payload.subscriptionStatuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "active", count: 16 }),
        expect.objectContaining({ key: "pending-cancel", label: "Pending Cancel", count: 3 }),
      ]),
    );
    expect(payload.intervalDailyLabels).toHaveLength(30);
    expect(payload.intervalDailyLabels.at(0)).toBe("Feb 15");
    expect(payload.intervalDailyLabels.at(13)).toBe("Feb 28");
    expect(payload.intervalDailyLabels.at(14)).toBe("Mar 1");
    expect(payload.intervalDailyLabels.at(29)).toBe("Mar 16");
    expect(payload.intervalDailyOrderTypeRevenue.new.at(0)).toBe(10_000);
    expect(payload.intervalDailyOrderTypeRevenue.renewal.at(13)).toBe(30_000);
    expect(payload.intervalDailyOrderTypeRevenue.upgrade.at(14)).toBe(20_000);
    expect(payload.intervalDailyOrderTypeRevenue.downgrade.at(29)).toBe(5_000);
    expect(payload.topCountriesYtd[0]).toMatchObject({
      label: "United States",
      revenue: 140_000,
    });
    expect(payload.licenseTypesYtd[0]).toMatchObject({
      label: "SaaS",
      revenue: 120_000,
    });
    expect(payload.valueSegments).toContainEqual(expect.objectContaining({
      key: "4. Enterprise",
      label: "Enterprise",
      revenueMtd: 70_000,
      ordersMtd: 2,
      avgOrderValueYtd: 25_000,
    }));
  });
});
