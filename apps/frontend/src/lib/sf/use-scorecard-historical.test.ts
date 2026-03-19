import { renderHook, waitFor } from "@testing-library/react";

import type { SfHistoricalResponse } from "@contracts/sales";

import { useScorecardHistoricalMonthlyData } from "./use-scorecard-historical";

const basePayload: SfHistoricalResponse = {
  asOfDate: "2026-03-17",
  fromDate: "2022-03-01",
  toDate: "2026-03-17",
  months: ["Jan '26", "Feb '26", "Mar '26"],
  orderTypeRevenue: {
    new: [120, 140, 160],
    upgrade: [20, 25, 30],
    renewal: [80, 90, 110],
    downgrade: [5, 4, 3],
  },
};

describe("useScorecardHistoricalMonthlyData", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses hydrated data without fetching on first mount", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => basePayload,
    } as Response);

    const { result } = renderHook(() =>
      useScorecardHistoricalMonthlyData(
        {
          from: "2022-03-01",
          to: "2026-03-17",
        },
        {
          initialData: basePayload,
        },
      ),
    );

    expect(result.current.data).toEqual(basePayload);
    expect(result.current.loading).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches the dedicated historical endpoint for custom windows", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => basePayload,
    } as Response);

    const { result } = renderHook(() =>
      useScorecardHistoricalMonthlyData(
        {
          from: "2022-03-01",
          to: "2026-03-17",
        },
        {
          customerChannel: "Channel Partner Sales",
        },
      ),
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.data).toEqual(basePayload));

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/sf/historical?from=2022-03-01&to=2026-03-17&customerChannel=Channel+Partner+Sales",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
      }),
    );
    expect(result.current.loading).toBe(false);
  });
});
