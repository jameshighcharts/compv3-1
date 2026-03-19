import { renderHook, waitFor } from "@testing-library/react";

import type { RevenueRange, SfRevenueResponse } from "@contracts/sales";

import { useSalesforceRevenue } from "./use-salesforce-revenue";

const basePayload: SfRevenueResponse = {
  asOfDate: "2026-03-16",
  months: ["Feb '26", "Mar '26"],
  directRevenue: {
    Assisted: [1200, 1400],
  },
  channelPartnerRevenue: {
    Assisted: [800, 900],
  },
  orderTypeRevenue: {
    new: [100, 200],
    upgrade: [50, 75],
    renewal: [80, 120],
    downgrade: [10, 5],
  },
  orderTypeCount: {
    new: [2, 3],
    upgrade: [1, 1],
    renewal: [1, 2],
    downgrade: [0, 1],
  },
  rangeDailyLabels: ["Feb 16", "Feb 17", "Feb 18"],
  rangeDailyRevenue: [900, 1100, 1200],
  rangeDailyOrderTypeRevenue: {
    new: [500, 650, 700],
    upgrade: [200, 150, 180],
    renewal: [150, 200, 220],
    downgrade: [50, 100, 100],
  },
  thisMonthTotal: 2.3,
  prevMonthTotal: 2.1,
  ytdTotal: 5.9,
  prevYtdTotal: 5.4,
  todayTotal: 24115,
  prevDayTotal: 21980,
  currentMonthDailyRevenue: [1000, 1200, 1300],
  currentMonthDailyOrderTypeRevenue: {
    new: [500, 650, 700],
    upgrade: [200, 150, 180],
    renewal: [250, 300, 320],
    downgrade: [50, 100, 100],
  },
  priorYearMonthDailyRevenue: [900, 1000, 1100],
  currentMonthDailyOrders: [10, 11, 12],
  priorYearMonthDailyOrders: [8, 9, 10],
};

describe("useSalesforceRevenue", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses hydrated data without fetching on first mount", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => basePayload,
    } as Response);

    const { result } = renderHook(() =>
      useSalesforceRevenue("12m", {
        initialData: basePayload,
      }),
    );

    expect(result.current.data).toEqual(basePayload);
    expect(result.current.loading).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches again when the query changes after hydration", async () => {
    const refreshedPayload: SfRevenueResponse = {
      ...basePayload,
      asOfDate: "2026-03-17",
      todayTotal: 25500,
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => refreshedPayload,
    } as Response);
    const { result, rerender } = renderHook(
      ({ range }: { range: RevenueRange }) =>
        useSalesforceRevenue(range, {
          initialData: basePayload,
        }),
      {
        initialProps: { range: "12m" as RevenueRange },
      },
    );

    rerender({ range: "90d" });

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.data).toEqual(refreshedPayload));
    expect(result.current.loading).toBe(false);
  });

  it("supports custom from and to windows", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => basePayload,
    } as Response);

    const { result } = renderHook(() =>
      useSalesforceRevenue(
        {
          from: "2022-01-01",
          to: "2022-03-31",
        },
        {
          customerChannel: "all",
          salesChannel: "all",
        },
      ),
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.data).toEqual(basePayload));

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/sf/revenue?from=2022-01-01&to=2022-03-31&customerChannel=all&salesChannel=all",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
      }),
    );
    expect(result.current.loading).toBe(false);
  });
});
