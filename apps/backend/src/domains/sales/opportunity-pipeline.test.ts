import { beforeEach, describe, expect, it, vi } from "vitest";

const { querySalesforceMock } = vi.hoisted(() => ({
  querySalesforceMock: vi.fn(),
}));

vi.mock("../../platform/salesforce/client", () => ({
  querySalesforce: querySalesforceMock,
}));

describe("opportunity pipeline service", () => {
  beforeEach(() => {
    vi.resetModules();
    querySalesforceMock.mockReset();
  });

  it("loads a live Salesforce opportunity payload with normalized pipeline fields", async () => {
    querySalesforceMock.mockImplementation(async (query: string) => {
      expect(query).toContain("FROM Opportunity");
      expect(query).toContain("Account.Name");
      expect(query).toContain("Owner.Name");
      expect(query).toContain("Stage_Status__c");
      expect(query).toContain("QuoteExpirationDate__c");
      expect(query).not.toContain("Days_since_open__c");
      expect(query).not.toContain("Time_Open__c");
      expect(query).toContain("CloseDate >= 2026-01-01");
      expect(query).toContain("CloseDate <= 2026-03-20");

      return [
        {
          Id: "006AAA0000001BC",
          Name: "Acme Expansion",
          Account: { Name: "Acme Corp" },
          OwnerId: "005AAA000001",
          Owner: { Name: "Sarah Johnson" },
          Amount: 125_000,
          Probability: 55,
          StageName: "Proposal / Price Review",
          Stage_Status__c: "Proposal",
          ForecastCategoryName: "Pipeline",
          CloseDate: "2026-04-10",
          QuoteExpirationDate__c: "2026-04-15",
          CreatedDate: "2026-01-05T09:14:00.000Z",
          Days_since_open__c: 74,
          Time_Open__c: null,
          FiscalQuarter: 2,
          IsClosed: false,
          IsWon: false,
          LastActivityDate: "2026-03-18",
          LossReason__c: null,
          WooOrderId__c: "593721",
        },
        {
          Id: "006AAA0000001CD",
          Name: "Northwind Renewal",
          Account: { Name: "Northwind" },
          OwnerId: "005AAA000002",
          Owner: { Name: "Mike Chen" },
          Amount: 220_000,
          Probability: 100,
          StageName: "Closed Won",
          Stage_Status__c: "Closed Won",
          ForecastCategoryName: "Closed",
          CloseDate: "2026-03-12",
          QuoteExpirationDate__c: null,
          CreatedDate: "2025-12-01T11:00:00.000Z",
          Days_since_open__c: 110,
          Time_Open__c: 101,
          FiscalQuarter: 1,
          IsClosed: true,
          IsWon: true,
          LastActivityDate: "2026-03-12",
          LossReason__c: null,
          WooOrderId__c: "774411",
        },
        {
          Id: "006AAA0000001DE",
          Name: "Fallback Company Deal",
          Account: null,
          OwnerId: "005AAA000003",
          Owner: null,
          Amount: 45_000,
          Probability: 80,
          StageName: "Contract Review",
          Stage_Status__c: "Negotiation",
          ForecastCategoryName: "Commit",
          CloseDate: "2026-02-20",
          QuoteExpirationDate__c: null,
          CreatedDate: "2026-01-10T00:00:00.000Z",
          Days_since_open__c: 69,
          Time_Open__c: 41,
          FiscalQuarter: 1,
          IsClosed: true,
          IsWon: false,
          LastActivityDate: null,
          LossReason__c: "No budget",
          WooOrderId__c: null,
          w_Probable_company_name_o__c: "Contoso",
        },
      ];
    });

    const { getOpportunityPipelinePayload } = await import("./opportunity-pipeline");

    const { payload, cacheHit } = await getOpportunityPipelinePayload(
      new Date("2026-03-20T12:00:00Z"),
    );

    expect(cacheHit).toBe(false);
    expect(payload.asOfDate).toBe("2026-03-20");
    expect(payload.deals).toHaveLength(3);
    expect(payload.deals[0]).toMatchObject({
      id: "006AAA0000001BC",
      dealName: "Acme Expansion",
      company: "Acme Corp",
      ownerId: "005AAA000001",
      ownerName: "Sarah Johnson",
      amount: 125_000,
      probability: 55,
      stageName: "Proposal / Price Review",
      stageBucket: "Proposal",
      expectedCloseDate: "2026-04-15",
      closeQuarter: "Q2 2026",
      daysOpen: 74,
      timeOpen: 74,
      isClosed: false,
      isWon: false,
      wooOrderId: "593721",
      lastActivityDate: "2026-03-18",
      lastActivityDays: 2,
    });
    expect(payload.deals[1]).toMatchObject({
      id: "006AAA0000001CD",
      company: "Northwind",
      ownerName: "Mike Chen",
      stageBucket: "Won",
      closeDate: "2026-03-12",
      expectedCloseDate: "2026-03-12",
      timeOpen: 101,
      isClosed: true,
      isWon: true,
      wooOrderId: "774411",
    });
    expect(payload.deals[2]).toMatchObject({
      id: "006AAA0000001DE",
      company: "Contoso",
      ownerName: "Unassigned",
      stageBucket: "Committed",
      lossReason: "No budget",
      wooOrderId: null,
      lastActivityDate: null,
      lastActivityDays: null,
    });
  });

  it("reuses the cached pipeline payload for the same as-of date", async () => {
    querySalesforceMock.mockResolvedValue([
      {
        Id: "006AAA0000001XY",
        Name: "Cache Test Deal",
        Account: { Name: "Cache Test" },
        OwnerId: "005AAA000099",
        Owner: { Name: "Cache Owner" },
        Amount: 10_000,
        Probability: 25,
        StageName: "Qualification",
        Stage_Status__c: "Scoping",
        ForecastCategoryName: "Pipeline",
        CloseDate: "2026-04-01",
        QuoteExpirationDate__c: null,
        CreatedDate: "2026-03-01T00:00:00.000Z",
        Days_since_open__c: 19,
        Time_Open__c: null,
        FiscalQuarter: 2,
        IsClosed: false,
        IsWon: false,
        LastActivityDate: "2026-03-19",
        LossReason__c: null,
        WooOrderId__c: null,
      },
    ]);

    const { getOpportunityPipelinePayload } = await import("./opportunity-pipeline");
    const now = new Date("2026-03-20T12:00:00Z");

    const first = await getOpportunityPipelinePayload(now);
    const second = await getOpportunityPipelinePayload(now);

    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(true);
    expect(querySalesforceMock).toHaveBeenCalledTimes(1);
    expect(second.payload.deals[0]?.company).toBe("Cache Test");
  });

  it("can load all-time closed pipeline history when requested", async () => {
    querySalesforceMock.mockImplementation(async (query: string) => {
      expect(query).toContain("FROM Opportunity");
      expect(query).not.toContain("CloseDate >=");
      expect(query).not.toContain("CloseDate <=");

      return [
        {
          Id: "006AAA0000001AT",
          Name: "All Time Won Deal",
          Account: { Name: "Archive Co" },
          OwnerId: "005AAA000777",
          Owner: { Name: "Archive Owner" },
          Amount: 18_000,
          Probability: 100,
          StageName: "Closed Won",
          ForecastCategoryName: "Closed",
          CloseDate: "2024-02-10",
          CreatedDate: "2023-11-01T00:00:00.000Z",
          FiscalQuarter: 1,
          IsClosed: true,
          IsWon: true,
          LastActivityDate: "2024-02-10",
        },
      ];
    });

    const { getOpportunityPipelinePayload } = await import("./opportunity-pipeline");

    const { payload } = await getOpportunityPipelinePayload(
      new Date("2026-03-20T12:00:00Z"),
      { closedRange: "all" },
    );

    expect(querySalesforceMock).toHaveBeenCalledTimes(1);
    expect(payload.deals[0]).toMatchObject({
      company: "Archive Co",
      ownerName: "Archive Owner",
      stageBucket: "Won",
      closeDate: "2024-02-10",
      expectedCloseDate: "2024-02-10",
    });
  });

  it("retries without unsupported custom Opportunity fields", async () => {
    querySalesforceMock
      .mockRejectedValueOnce(
        new Error(
          "Salesforce query failed with status 400: No such column 'LossReason__c' on entity 'Opportunity'.",
        ),
      )
      .mockResolvedValueOnce([
        {
          Id: "006AAA0000001ZZ",
          Name: "Retry Deal",
          Account: { Name: "Retry Co" },
          OwnerId: "005AAA000100",
          Owner: { Name: "Retry Owner" },
          Amount: 64_000,
          Probability: 45,
          StageName: "Proposal",
          ForecastCategoryName: "Pipeline",
          CloseDate: "2026-04-20",
          CreatedDate: "2026-03-01T00:00:00.000Z",
          FiscalQuarter: 2,
          IsClosed: false,
          IsWon: false,
          LastActivityDate: "2026-03-19",
        },
      ]);

    const { getOpportunityPipelinePayload } = await import("./opportunity-pipeline");

    const { payload } = await getOpportunityPipelinePayload(
      new Date("2026-03-20T12:00:00Z"),
    );

    expect(querySalesforceMock).toHaveBeenCalledTimes(2);
    expect(String(querySalesforceMock.mock.calls[0]?.[0] ?? "")).toContain("LossReason__c");
    expect(String(querySalesforceMock.mock.calls[1]?.[0] ?? "")).not.toContain("LossReason__c");
    expect(payload.deals[0]).toMatchObject({
      company: "Retry Co",
      ownerName: "Retry Owner",
      daysOpen: 19,
      timeOpen: 19,
    });
  });
});
