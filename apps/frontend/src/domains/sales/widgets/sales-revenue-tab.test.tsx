import { render, screen } from "@testing-library/react";

import type { SfRevenueResponse } from "@contracts/sales";

import { DashboardSalesRevenueTab } from "./sales-revenue-tab";

const chartOptionsSpy = vi.fn();

vi.mock("@/shared/charts/highcharts", () => ({
  DashboardHighchart: ({ options }: { options: unknown }) => {
    chartOptionsSpy(options);
    return <div data-testid="chart" />;
  },
  chartColor: (index: number) => `color-${index}`,
  createBaseChartOptions: (options: unknown) => options,
  mergeSeriesColors: (series: unknown) => series,
}));

const basePayload: SfRevenueResponse = {
  asOfDate: "2026-03-16",
  months: ["Feb '26", "Mar '26"],
  directRevenue: {
    Assisted: [1200, 1400],
    "Self-care": [800, 900],
    "Assisted Self-service": [400, 500],
  },
  channelPartnerRevenue: {
    Assisted: [700, 900],
    "Self-care": [300, 350],
    "Assisted Self-service": [200, 225],
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
  thisMonthTotal: 0.7,
  prevMonthTotal: 0.9,
  ytdTotal: 5.9,
  prevYtdTotal: 5.4,
  todayTotal: 24_115,
  prevDayTotal: 21_980,
  currentMonthDailyRevenue: [1000, 1200, 1300],
  currentMonthDailyOrderTypeRevenue: {
    new: [500, 650, 700],
    upgrade: [200, 150, 180],
    renewal: [250, 300, 320],
    downgrade: [50, 100, 100],
  },
  priorYearMonthDailyRevenue: [200_000, 300_000, 171_000],
  currentMonthDailyOrders: [10, 11, 12],
  priorYearMonthDailyOrders: [8, 9, 10],
};

describe("DashboardSalesRevenueTab", () => {
  beforeEach(() => {
    chartOptionsSpy.mockClear();
    document.documentElement.className = "";
  });

  it("uses prior-year month-to-date revenue for the monthly sales gauge", () => {
    render(
      <DashboardSalesRevenueTab
        range="12m"
        onRangeChange={() => undefined}
        sfData={basePayload}
        loading={false}
        error={null}
      />,
    );

    const monthlyGaugeOptions = chartOptionsSpy.mock.calls
      .map(([options]) => options)
      .find(
        (options) =>
          typeof options === "object" &&
          options !== null &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (options as any).chart?.type === "gauge" &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (options as any).series?.[1]?.data?.[0] === basePayload.thisMonthTotal,
      );

    expect(monthlyGaugeOptions).toBeDefined();
    expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (monthlyGaugeOptions as any).series[0].data[0],
    ).toBeCloseTo(0.671, 3);
    expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (monthlyGaugeOptions as any).series[0].data[0],
    ).not.toBe(basePayload.prevMonthTotal);
    expect(screen.getByText("Prior Year")).toBeInTheDocument();
    expect(screen.getByText("Prior Year MTD: $671K")).toBeInTheDocument();
  });
});
