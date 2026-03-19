import { beforeEach, describe, expect, it, vi } from "vitest";

const { querySalesforceMock } = vi.hoisted(() => ({
  querySalesforceMock: vi.fn(),
}));

vi.mock("../../platform/salesforce/client", () => ({
  querySalesforce: querySalesforceMock,
}));

describe("scorecard ARR payload", () => {
  beforeEach(() => {
    vi.resetModules();
    querySalesforceMock.mockReset();
  });

  it("builds ARR stock, flow, renewal, and concentration metrics from subscriptions, orders, and order lines", async () => {
    querySalesforceMock
      .mockResolvedValueOnce([
        {
          Id: "sub-a",
          status__c: "active",
          CurrencyIsoCode: "USD",
          Subscription_Start_Date__c: "2025-01-10T00:00:00.000+0000",
          Subscription_End_Date__c: null,
          Cancelled_Date__c: null,
          shipping_company__c: "Acme Corp",
          billing_company__c: "Acme Corp",
          Customer__c: "cust-a",
          Customer__r: { Name: "Acme Corp" },
          Order__c: "ord-a-new",
        },
        {
          Id: "sub-b",
          status__c: "pending-cancel",
          CurrencyIsoCode: "USD",
          Subscription_Start_Date__c: "2025-03-25T00:00:00.000+0000",
          Subscription_End_Date__c: "2026-03-25T00:00:00.000+0000",
          Cancelled_Date__c: "2026-02-28T00:00:00.000+0000",
          shipping_company__c: "Beta Corp",
          billing_company__c: "Beta Corp",
          Customer__c: "cust-b",
          Customer__r: { Name: "Beta Corp" },
          Order__c: "ord-b-new",
        },
        {
          Id: "sub-c",
          status__c: "cancelled",
          CurrencyIsoCode: "USD",
          Subscription_Start_Date__c: "2024-02-12T00:00:00.000+0000",
          Subscription_End_Date__c: "2026-02-12T00:00:00.000+0000",
          Cancelled_Date__c: "2026-01-14T00:00:00.000+0000",
          shipping_company__c: "Gamma LLC",
          billing_company__c: "Gamma LLC",
          Customer__c: "cust-c",
          Customer__r: { Name: "Gamma LLC" },
          Order__c: "ord-c-new",
        },
        {
          Id: "sub-d",
          status__c: "active",
          CurrencyIsoCode: "USD",
          Subscription_Start_Date__c: "2025-02-20T00:00:00.000+0000",
          Subscription_End_Date__c: null,
          Cancelled_Date__c: null,
          shipping_company__c: "Delta Inc",
          billing_company__c: "Delta Inc",
          Customer__c: "cust-d",
          Customer__r: { Name: "Delta Inc" },
          Order__c: "ord-d-new",
        },
        {
          Id: "sub-f",
          status__c: "active",
          CurrencyIsoCode: "USD",
          Subscription_Start_Date__c: "2026-02-05T00:00:00.000+0000",
          Subscription_End_Date__c: null,
          Cancelled_Date__c: null,
          shipping_company__c: "Fresh Labs",
          billing_company__c: "Fresh Labs",
          Customer__c: "cust-f",
          Customer__r: { Name: "Fresh Labs" },
          Order__c: "ord-f-new",
        },
      ])
      .mockResolvedValueOnce([
        {
          Id: "ord-a-new",
          Subscription__c: "sub-a",
          License_Owner_Account__c: "acct-a",
          License_Owner_Account__r: { Name: "Acme Corp" },
          Order_Type__c: "new",
          OrderEffectiveDate__c: "2025-01-10T00:00:00.000+0000",
          OrderisComplete__c: "yes",
          Totalextax__c: 1000,
          meta_industry__c: "Technology",
          Support_Type__c: "",
          SubscriptionType__c: "Annual",
        },
        {
          Id: "ord-a-renew",
          Subscription__c: "sub-a",
          License_Owner_Account__c: "acct-a",
          License_Owner_Account__r: { Name: "Acme Corp" },
          Order_Type__c: "renewal",
          OrderEffectiveDate__c: "2026-01-10T00:00:00.000+0000",
          OrderisComplete__c: "yes",
          Totalextax__c: 1200,
          meta_industry__c: "Technology",
          Support_Type__c: "",
          SubscriptionType__c: "Annual",
        },
        {
          Id: "ord-a-up",
          Subscription__c: "sub-a",
          License_Owner_Account__c: "acct-a",
          License_Owner_Account__r: { Name: "Acme Corp" },
          Order_Type__c: "upgrade",
          OrderEffectiveDate__c: "2026-02-15T00:00:00.000+0000",
          OrderisComplete__c: "yes",
          Totalextax__c: 300,
          meta_industry__c: "Technology",
          Support_Type__c: "",
          SubscriptionType__c: "Annual",
        },
        {
          Id: "ord-b-new",
          Subscription__c: "sub-b",
          License_Owner_Account__c: "acct-b",
          License_Owner_Account__r: { Name: "Beta Corp" },
          Order_Type__c: "new",
          OrderEffectiveDate__c: "2025-03-25T00:00:00.000+0000",
          OrderisComplete__c: "yes",
          Totalextax__c: 900,
          meta_industry__c: "Finance",
          Support_Type__c: "",
          SubscriptionType__c: "Annual",
        },
        {
          Id: "ord-c-new",
          Subscription__c: "sub-c",
          License_Owner_Account__c: "acct-c",
          License_Owner_Account__r: { Name: "Gamma LLC" },
          Order_Type__c: "new",
          OrderEffectiveDate__c: "2024-02-12T00:00:00.000+0000",
          OrderisComplete__c: "yes",
          Totalextax__c: 1500,
          meta_industry__c: "Manufacturing",
          Support_Type__c: "Advantage",
          SubscriptionType__c: "Perpetual",
        },
        {
          Id: "ord-c-renew",
          Subscription__c: "sub-c",
          License_Owner_Account__c: "acct-c",
          License_Owner_Account__r: { Name: "Gamma LLC" },
          Order_Type__c: "renewal",
          OrderEffectiveDate__c: "2025-02-12T00:00:00.000+0000",
          OrderisComplete__c: "yes",
          Totalextax__c: 300,
          meta_industry__c: "Manufacturing",
          Support_Type__c: "Advantage",
          SubscriptionType__c: "Perpetual",
        },
        {
          Id: "ord-d-new",
          Subscription__c: "sub-d",
          License_Owner_Account__c: "acct-d",
          License_Owner_Account__r: { Name: "Delta Inc" },
          Order_Type__c: "new",
          OrderEffectiveDate__c: "2025-02-20T00:00:00.000+0000",
          OrderisComplete__c: "yes",
          Totalextax__c: 500,
          meta_industry__c: "Healthcare",
          Support_Type__c: "",
          SubscriptionType__c: "Annual",
        },
        {
          Id: "ord-d-renew",
          Subscription__c: "sub-d",
          License_Owner_Account__c: "acct-d",
          License_Owner_Account__r: { Name: "Delta Inc" },
          Order_Type__c: "renewal",
          OrderEffectiveDate__c: "2026-02-18T00:00:00.000+0000",
          OrderisComplete__c: "yes",
          Totalextax__c: 600,
          meta_industry__c: "Healthcare",
          Support_Type__c: "",
          SubscriptionType__c: "Annual",
        },
        {
          Id: "ord-f-new",
          Subscription__c: "sub-f",
          License_Owner_Account__c: "acct-f",
          License_Owner_Account__r: { Name: "Fresh Labs" },
          Order_Type__c: "new",
          OrderEffectiveDate__c: "2026-02-05T00:00:00.000+0000",
          OrderisComplete__c: "yes",
          Totalextax__c: 700,
          meta_industry__c: "Technology",
          Support_Type__c: "",
          SubscriptionType__c: "Annual",
        },
        {
          Id: "ord-one-time",
          Subscription__c: "",
          License_Owner_Account__c: "",
          License_Owner_Account__r: { Name: "" },
          Order_Type__c: "new",
          OrderEffectiveDate__c: "2026-02-10T00:00:00.000+0000",
          OrderisComplete__c: "yes",
          Totalextax__c: 400,
          meta_industry__c: "Other",
          Support_Type__c: "",
          SubscriptionType__c: "",
        },
      ])
      .mockResolvedValueOnce([
        { Id: "line-a-new", Order__c: "ord-a-new", name__c: "SaaS - Annual - Highcharts", total__c: 1000, total_tax__c: 0, SubscriptionType__c: "Annual", LicenseType__c: "SaaS" },
        { Id: "line-a-renew", Order__c: "ord-a-renew", name__c: "SaaS - Annual - Highcharts", total__c: 1200, total_tax__c: 0, SubscriptionType__c: "Annual", LicenseType__c: "SaaS" },
        { Id: "line-a-up", Order__c: "ord-a-up", name__c: "Additional seats", total__c: 300, total_tax__c: 0, SubscriptionType__c: "Annual", LicenseType__c: "SaaS" },
        { Id: "line-b-new", Order__c: "ord-b-new", name__c: "SaaS - Annual - Highcharts", total__c: 900, total_tax__c: 0, SubscriptionType__c: "Annual", LicenseType__c: "SaaS" },
        { Id: "line-c-new", Order__c: "ord-c-new", name__c: "Highcharts Advantage", total__c: 1500, total_tax__c: 0, SubscriptionType__c: "Perpetual", LicenseType__c: "SaaS" },
        { Id: "line-c-renew", Order__c: "ord-c-renew", name__c: "Highcharts Advantage Subscription", total__c: 300, total_tax__c: 0, SubscriptionType__c: "Perpetual", LicenseType__c: "SaaS" },
        { Id: "line-d-new", Order__c: "ord-d-new", name__c: "SaaS - Annual - Highcharts", total__c: 500, total_tax__c: 0, SubscriptionType__c: "Annual", LicenseType__c: "SaaS" },
        { Id: "line-d-renew", Order__c: "ord-d-renew", name__c: "SaaS - Annual - Highcharts", total__c: 600, total_tax__c: 0, SubscriptionType__c: "Annual", LicenseType__c: "SaaS" },
        { Id: "line-f-new", Order__c: "ord-f-new", name__c: "SaaS - Annual - Highcharts", total__c: 700, total_tax__c: 0, SubscriptionType__c: "Annual", LicenseType__c: "SaaS" },
      ]);

    const { getScorecardArrPayload } = await import("./scorecard-arr");

    const { payload, cacheHit } = await getScorecardArrPayload(new Date("2026-03-19T12:00:00Z"));

    expect(cacheHit).toBe(false);
    expect(payload.asOfDate).toBe("2026-03-19");
    expect(payload.latestFullMonthLabel).toBe("Feb 2026");
    expect(payload.currentSnapshot).toEqual({
      totalArr: 3700,
      activeSubscriptions: 4,
      activeCustomers: 4,
      activeArr: 3700,
      arrPerCustomer: 925,
      pendingCancelSubscriptions: 1,
      pendingCancelArr: 900,
      renewalRatePct: 66.7,
      topCustomerSharePct: 40.5,
      top5CustomerSharePct: 100,
      topIndustrySharePct: 59.5,
    });
    expect(payload.latestMonth).toMatchObject({
      newSubscriptions: 1,
      endedSubscriptions: 1,
      netSubscriptions: 0,
      newArr: 700,
      endedArr: 300,
      netArr: 400,
      totalRevenue: 2000,
      recurringRevenue: 900,
      recurringRevenuePct: 45,
      renewalRatePct: 50,
      arrChurnPct: 10.3,
      customerChurnPct: 25,
      retentionPct: 75,
      netRevenueRetentionPct: 103.4,
    });
    expect(payload.trailingTwelveMonths).toMatchObject({
      totalArrGrowthPct: 105.6,
      organicArrGrowthPct: 16.7,
      newSalesArrGrowthPct: 6.7,
      recurringRevenuePct: 51.2,
      netRevenueRetentionPct: 116.7,
      renewalRatePct: 66.7,
      arrChurnPct: 16.7,
      customerChurnPct: 33.3,
      retentionPct: 66.7,
      averageSalesPrice: 800,
      ltvProxy: 2778,
      newSalesArr: 1600,
      newLogos: 2,
      recurringRevenue: 2100,
      totalRevenue: 4100,
    });
    expect(payload.bridges.totalArr).toEqual({
      openingArr: 1800,
      newSalesArr: 1600,
      expansionArr: 600,
      contractionArr: 0,
      churnArr: 300,
      closingArr: 3700,
    });
    expect(payload.bridges.organicArr).toEqual({
      openingArr: 1800,
      newSalesArr: 0,
      expansionArr: 600,
      contractionArr: 0,
      churnArr: 300,
      closingArr: 2100,
    });
    expect(payload.monthlyFlow.at(-1)).toMatchObject({
      monthLabel: "Feb 2026",
      totalArr: 3700,
      newSubscriptions: 1,
      endedSubscriptions: 1,
      newArr: 700,
      endedArr: 300,
      recurringRevenuePct: 45,
      renewalRatePct: 50,
      netRevenueRetentionPct: 103.4,
      topCustomerSharePct: 40.5,
      topIndustrySharePct: 59.5,
    });
    expect(payload.statusSnapshot[0]).toMatchObject({
      status: "active",
      subscriptions: 3,
      arr: 2800,
      arrSharePct: 75.7,
    });
    expect(payload.runway[0]).toEqual({
      monthStart: "2026-03-01",
      monthLabel: "Mar 2026",
      endingSubscriptions: 1,
      endingArr: 900,
      pendingCancelSubscriptions: 1,
      pendingCancelArr: 900,
    });
    expect(payload.concentration.customers.top1Pct).toBe(40.5);
    expect(payload.concentration.customers.items[0]).toMatchObject({
      label: "Acme Corp",
      arr: 1500,
      sharePct: 40.5,
    });
    expect(payload.concentration.industries.items[0]).toMatchObject({
      label: "Technology",
      arr: 2200,
      sharePct: 59.5,
    });
    expect(payload.terminalDateCoverage).toEqual({
      statusCount: 2,
      datedCount: 2,
      missingCount: 0,
      coveragePct: 100,
    });
    expect(payload.caveats).toHaveLength(5);
  });
});
