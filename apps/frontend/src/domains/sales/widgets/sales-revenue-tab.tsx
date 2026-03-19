"use client";

import * as React from "react";
import { IconArrowDownRight, IconArrowUpRight, IconInfoCircle } from "@tabler/icons-react";

import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { DashboardHighchart, chartColor, createBaseChartOptions, mergeSeriesColors } from "@/shared/charts/highcharts";
import {
  REVENUE_RANGE_LABELS,
  REVENUE_RANGE_VALUES,
  type RevenueRange,
  type SfRevenueResponse,
} from "@contracts/sales";

import { resolveSalesGaugeTargets } from "../data/sales-targets";

type GaugeTargets = {
  base: number;
  budget: number;
  high: number;
  max: number;
};

/** Returns true whenever the `html` element carries the `.dark` class. */
function useIsDark(): boolean {
  const [isDark, setIsDark] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

const REVENUE_RANGE_OPTIONS = REVENUE_RANGE_VALUES.map((value) => ({
  value,
  label: REVENUE_RANGE_LABELS[value],
}));

const buildBarOptions = (
  months: string[],
  series: Array<{ name: string; data: number[] }>,
  colors: string[],
) =>
  createBaseChartOptions({
    chart: { type: "column", height: 290, spacing: [8, 4, 8, 4] },
    xAxis: { categories: months, tickLength: 0, labels: { style: { fontSize: "12px" } } },
    yAxis: {
      title: { text: undefined },
      gridLineDashStyle: "Dash",
      labels: { style: { fontSize: "12px" } },
    },
    legend: { enabled: true, itemStyle: { fontSize: "12px", fontWeight: "500" }, margin: 6 },
    tooltip: { shared: true },
    plotOptions: {
      column: { borderWidth: 0, borderRadius: 2, pointPadding: 0.03, groupPadding: 0.06 },
      series: { animation: false },
    },
    series: mergeSeriesColors(
      series.map((entry) => ({
        type: "column" as const,
        name: entry.name,
        data: entry.data,
        stacking: "normal" as const,
      })),
      colors,
    ),
  });

const buildGaugeOptions = (
  value: number,
  previous: number,
  label: string,
  dialColor: string,
  dialColorPrev: string,
  trackColor: string,
  targets: GaugeTargets,
) => ({
  chart: {
    type: "gauge",
    height: null,
    backgroundColor: "transparent",
    style: { fontFamily: "inherit" },
    spacing: [0, 0, 0, 0],
    margin: [0, 0, 0, 0],
    reflow: true,
  },
  title: { text: undefined },
  subtitle: { text: undefined },
  credits: { enabled: false },
  accessibility: { enabled: false },
  exporting: { enabled: false },
  tooltip: { enabled: false },
  pane: {
    startAngle: -90,
    endAngle: 89.9,
    center: ["50%", "70%"],
    size: "110%",
    background: [{ backgroundColor: "transparent", borderWidth: 0 }],
  },
  yAxis: {
    min: 0,
    max: targets.max,
    minorTicks: false,
    lineWidth: 0,
    gridLineWidth: 0,
    tickPositions: [targets.base, targets.budget, targets.high, targets.max],
    tickLength: 20,
    tickWidth: 1.5,
    tickColor: "#ffffff",
    labels: {
      enabled: true,
      distance: 14,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: function (this: any) {
        const numeric = Number(this.value);
        const dollars = numeric * 1_000_000;

        if (targets.max < 1) {
          return `$${Math.round(dollars / 1_000)}K`;
        }

        const text = numeric >= 10
          ? String(Math.round(numeric))
          : numeric.toFixed(2).replace(/\.?0+$/, "");
        return `$${text}M`;
      },
      style: { fontSize: "14px", fontWeight: "600", color: "var(--foreground)", textOutline: "none" },
    },
    plotBands: [
      { from: 0, to: targets.base, color: trackColor, thickness: "11%" },
      { from: targets.base, to: targets.budget, color: "#F7A85E", thickness: "11%" },
      { from: targets.budget, to: targets.high, color: "#6DDFA0", thickness: "11%" },
      { from: targets.high, to: targets.max, color: "#9198F0", thickness: "11%" },
    ],
  },
  series: [
    {
      type: "gauge" as const,
      name: "Previous",
      data: [previous],
      dial: { radius: "78%", baseWidth: 3, baseLength: "0%", rearLength: "0%", backgroundColor: dialColorPrev, borderColor: dialColorPrev, borderWidth: 0 },
      pivot: { radius: 4, backgroundColor: dialColorPrev },
      dataLabels: { enabled: false },
    },
    {
      type: "gauge" as const,
      name: "Current",
      data: [value],
      dial: { radius: "82%", baseWidth: 5, baseLength: "0%", rearLength: "0%", backgroundColor: dialColor, borderColor: dialColor, borderWidth: 0 },
      pivot: { radius: 5, backgroundColor: dialColor },
      dataLabels: {
        enabled: true,
        y: 10,
        useHTML: true,
        borderWidth: 0,
        backgroundColor: "transparent",
        style: { textOutline: "none" },
        formatter: () =>
          `<div style="text-align:center"><span style="font-size:clamp(18px, 4vw, 28px);font-weight:700">${label}</span></div>`,
      },
    },
  ],
  responsive: {
    rules: [
      {
        condition: { maxWidth: 280 },
        chartOptions: {
          pane: { size: "95%" },
          yAxis: {
            tickLength: 14,
            labels: { distance: 10, style: { fontSize: "10px" } },
          },
        },
      },
      {
        condition: { minWidth: 281, maxWidth: 400 },
        chartOptions: {
          pane: { size: "100%" },
          yAxis: {
            tickLength: 17,
            labels: { distance: 12, style: { fontSize: "11px" } },
          },
        },
      },
    ],
  },
});

function pctChange(current: number, previous: number): { badge: string; positive: boolean } {
  if (!previous) return { badge: "—", positive: true };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { badge: `${pct > 0 ? "+" : ""}${pct}%`, positive: pct >= 0 };
}

function formatGaugeRevenue(valueInMillions: number): string {
  const dollars = valueInMillions * 1_000_000;
  const absDollars = Math.abs(dollars);

  if (absDollars >= 1_000_000) {
    return `$${(dollars / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (absDollars >= 1_000) {
    return `$${(dollars / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }

  return `$${Math.round(dollars)}`;
}

function formatRevenueThousands(valueInThousands: number): string {
  const dollars = valueInThousands * 1_000;
  const absDollars = Math.abs(dollars);

  if (absDollars >= 1_000_000) {
    return `$${(dollars / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (absDollars >= 1_000) {
    return `$${(dollars / 1_000).toFixed(0)}K`;
  }

  return `$${Math.round(dollars)}`;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function sumValues(series: number[]): number {
  return series.reduce((sum, value) => sum + value, 0);
}

function getLatestValue(series: number[]): number {
  return series.at(-1) ?? 0;
}

function getPreviousValue(series: number[]): number {
  return series.length > 1 ? series[series.length - 2] ?? 0 : 0;
}

function sumLatestSeriesValue(seriesMap: Record<string, number[]>): number {
  return Object.values(seriesMap).reduce((sum, series) => sum + getLatestValue(series), 0);
}

function sumPreviousSeriesValue(seriesMap: Record<string, number[]>): number {
  return Object.values(seriesMap).reduce((sum, series) => sum + getPreviousValue(series), 0);
}

type DashboardSalesRevenueTabProps = {
  range: RevenueRange;
  onRangeChange: (range: RevenueRange) => void;
  sfData: SfRevenueResponse | null;
  loading: boolean;
  error: string | null;
};

export function DashboardSalesRevenueTab({
  range,
  onRangeChange,
  sfData,
  loading,
  error,
}: DashboardSalesRevenueTabProps) {
  const isDark = useIsDark();
  const dialColor     = isDark ? "#e2e8f0" : "#334155";
  const dialColorPrev = isDark ? "rgba(226,232,240,0.35)" : "rgba(51,65,85,0.3)";
  const trackColor    = isDark ? "#1e2d45" : "#e2e8f0";

  // --- Chart series built from real data ---
  const months = React.useMemo(
    () => sfData?.months ?? [],
    [sfData],
  );

  const directSeries = sfData ? [
    { name: "Assisted",              data: sfData.directRevenue["Assisted"] ?? [] },
    { name: "Self-care",             data: sfData.directRevenue["Self-care"] ?? [] },
    { name: "Assisted Self-service", data: sfData.directRevenue["Assisted Self-service"] ?? [] },
  ] : [];

  const partnerSeries = sfData ? [
    { name: "Assisted",              data: sfData.channelPartnerRevenue["Assisted"] ?? [] },
    { name: "Self-care",             data: sfData.channelPartnerRevenue["Self-care"] ?? [] },
    { name: "Assisted Self-service", data: sfData.channelPartnerRevenue["Assisted Self-service"] ?? [] },
  ] : [];

  const totalRevSeries = sfData ? [
    { name: "Renewal",   data: sfData.orderTypeRevenue["renewal"] ?? [] },
    { name: "New",       data: sfData.orderTypeRevenue["new"] ?? [] },
    { name: "Upgrade",   data: sfData.orderTypeRevenue["upgrade"] ?? [] },
    { name: "Downgrade", data: sfData.orderTypeRevenue["downgrade"] ?? [] },
  ] : [];

  const licenseCountSeries = sfData ? [
    { name: "Renewal",   data: sfData.orderTypeCount["renewal"] ?? [] },
    { name: "New",       data: sfData.orderTypeCount["new"] ?? [] },
    { name: "Upgrade",   data: sfData.orderTypeCount["upgrade"] ?? [] },
    { name: "Downgrade", data: sfData.orderTypeCount["downgrade"] ?? [] },
  ] : [];

  // --- Gauge data ---
  const thisMonth = sfData?.thisMonthTotal ?? 0;
  const prevMonth = sfData?.prevMonthTotal ?? 0;
  const priorYearMonthToDate = React.useMemo(
    () => sumValues(sfData?.priorYearMonthDailyRevenue ?? []) / 1_000_000,
    [sfData?.priorYearMonthDailyRevenue],
  );
  const ytd = sfData?.ytdTotal ?? 0;
  const prevYtd = sfData?.prevYtdTotal ?? 0;
  const latestNewOrders = sfData ? getLatestValue(sfData.orderTypeCount.new ?? []) : 0;
  const previousNewOrders = sfData ? getPreviousValue(sfData.orderTypeCount.new ?? []) : 0;
  const latestChannelRevenue = sfData ? sumLatestSeriesValue(sfData.channelPartnerRevenue) : 0;
  const previousChannelRevenue = sfData ? sumPreviousSeriesValue(sfData.channelPartnerRevenue) : 0;

  const gaugeTargets = React.useMemo(
    () => resolveSalesGaugeTargets(months),
    [months],
  );

  const monthGaugeTarget = gaugeTargets.month.budget / 1_000_000;
  const ytdGaugeTarget = gaugeTargets.ytd.budget / 1_000_000;

  const directBadge = sfData && directSeries[0]?.data.length >= 2
    ? pctChange(directSeries[0].data.at(-1)!, directSeries[0].data.at(-2)!)
    : { badge: "—", positive: true };

  const partnerBadge = sfData && partnerSeries[0]?.data.length >= 2
    ? pctChange(partnerSeries[0].data.at(-1)!, partnerSeries[0].data.at(-2)!)
    : { badge: "—", positive: true };

  const totalRevBadge = pctChange(thisMonth, prevMonth);
  const ytdBadge = pctChange(ytd, prevYtd);
  const newOrdersBadge = pctChange(latestNewOrders, previousNewOrders);
  const channelRevenueBadge = pctChange(latestChannelRevenue, previousChannelRevenue);
  const licBadge = sfData && licenseCountSeries[0]?.data.length >= 2
    ? pctChange(licenseCountSeries[0].data.at(-1)!, licenseCountSeries[0].data.at(-2)!)
    : { badge: "—", positive: true };

  const salesRevenueKpiCards = [
    {
      title: "Sales This Month",
      value: formatGaugeRevenue(thisMonth),
      badge: totalRevBadge.badge,
      positive: totalRevBadge.positive,
      change: "vs previous month",
      color: chartColor(0),
    },
    {
      title: "Sales Year to Date",
      value: formatGaugeRevenue(ytd),
      badge: ytdBadge.badge,
      positive: ytdBadge.positive,
      change: "vs prior YTD",
      color: chartColor(1),
    },
    {
      title: "New Orders",
      value: formatCount(latestNewOrders),
      badge: newOrdersBadge.badge,
      positive: newOrdersBadge.positive,
      change: "vs previous month",
      color: chartColor(2),
    },
    {
      title: "Channel Revenue",
      value: formatRevenueThousands(latestChannelRevenue),
      badge: channelRevenueBadge.badge,
      positive: channelRevenueBadge.positive,
      change: "vs previous month",
      color: chartColor(3),
    },
  ];

  // --- Memoised chart options ---
  const licenseOwnerOpts = React.useMemo(
    () => buildBarOptions(months, licenseCountSeries, [chartColor(0), chartColor(2), chartColor(1), chartColor(3)]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sfData, months],
  );

  const directRevenueOpts = React.useMemo(
    () => buildBarOptions(months, directSeries, [chartColor(0), chartColor(2), chartColor(1)]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sfData, months],
  );

  const totalRevenueOpts = React.useMemo(
    () => buildBarOptions(months, totalRevSeries, [chartColor(0), chartColor(2), chartColor(1), chartColor(3)]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sfData, months],
  );

  const channelPartnerOpts = React.useMemo(
    () => buildBarOptions(months, partnerSeries, [chartColor(0), chartColor(2), chartColor(1)]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sfData, months],
  );

  const srGauge0Opts = React.useMemo(
    () =>
      buildGaugeOptions(
        thisMonth,
        priorYearMonthToDate,
        formatGaugeRevenue(thisMonth),
        dialColor,
        dialColorPrev,
        trackColor,
        {
          base: gaugeTargets.month.base / 1_000_000,
          budget: gaugeTargets.month.budget / 1_000_000,
          high: gaugeTargets.month.high / 1_000_000,
          max: gaugeTargets.month.max / 1_000_000,
        },
      ),
    [thisMonth, priorYearMonthToDate, dialColor, dialColorPrev, trackColor, gaugeTargets],
  );

  const srGauge1Opts = React.useMemo(
    () =>
      buildGaugeOptions(
        ytd,
        prevYtd,
        formatGaugeRevenue(ytd),
        dialColor,
        dialColorPrev,
        trackColor,
        {
          base: gaugeTargets.ytd.base / 1_000_000,
          budget: gaugeTargets.ytd.budget / 1_000_000,
          high: gaugeTargets.ytd.high / 1_000_000,
          max: gaugeTargets.ytd.max / 1_000_000,
        },
      ),
    [ytd, prevYtd, dialColor, dialColorPrev, trackColor, gaugeTargets],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Interval</span>
        {REVENUE_RANGE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="xs"
            variant={range === option.value ? "default" : "outline"}
            onClick={() => onRangeChange(option.value)}
            aria-pressed={range === option.value}
            disabled={loading && range === option.value}
          >
            {option.label}
          </Button>
        ))}
        <span className="ml-2 text-xs text-muted-foreground">
          {loading ? "Updating..." : "Live Salesforce data"}
        </span>
      </div>

      {error ? (
        <div className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {salesRevenueKpiCards.map((kpi) => (
          <Card key={kpi.title} className="w-full gap-0 py-0">
            <CardContent className="flex items-center justify-between gap-3 px-5 py-5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: kpi.color }} />
                  <span className="truncate text-sm font-medium text-muted-foreground">{kpi.title}</span>
                </div>
                <div className="mt-2 text-2xl font-bold">{kpi.value}</div>
                <div className="mt-1 flex items-center gap-1">
                  <span className={`inline-flex items-center gap-0.5 text-sm font-medium ${kpi.positive ? "text-emerald-500" : "text-red-500"}`}>
                    {kpi.positive ? <IconArrowUpRight className="size-3.5" /> : <IconArrowDownRight className="size-3.5" />}
                    {kpi.badge}
                  </span>
                  <span className="text-sm text-muted-foreground">{kpi.change}</span>
                </div>
              </div>
              <IconInfoCircle className="size-4 shrink-0 text-muted-foreground" aria-label={`More info about ${kpi.title}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 transition-opacity duration-300 ${loading ? "opacity-40 pointer-events-none" : "opacity-100"}`}>

        {/* Gauge: Sales This Month */}
        <div className="flex flex-1 flex-col rounded-2xl border bg-card px-5 pb-3 pt-4 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Sales This Month</p>
          <DashboardHighchart options={srGauge0Opts} className="h-[250px] w-full" />
          <div className="mt-0.5 flex justify-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-4 rounded-full bg-slate-500" />Current
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-4 rounded-full bg-slate-400 opacity-40" />Prior Year
            </span>
          </div>
          <p className="mt-1 text-center text-[13px] font-medium text-foreground">
            {monthGaugeTarget > 0 ? `${Math.round((thisMonth / monthGaugeTarget) * 100)}% of target reached` : "—"}
          </p>
          <p className="mt-0.5 text-center text-[13px] text-muted-foreground">
            Prior Year MTD: {formatGaugeRevenue(priorYearMonthToDate)}
          </p>
          <p className="mt-0.5 text-center text-[13px] text-muted-foreground">Target: {formatGaugeRevenue(monthGaugeTarget)}</p>
        </div>

        {/* License Owners */}
        <Card className="gap-0 py-0">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-0">
            <CardTitle className="text-base font-semibold">License Owners</CardTitle>
            <span className={`text-sm font-bold ${licBadge.positive ? "text-emerald-500" : "text-red-500"}`}>{licBadge.badge}</span>
          </CardHeader>
          <CardContent className="p-2">
            <DashboardHighchart options={licenseOwnerOpts} className="h-[290px] w-full" />
          </CardContent>
        </Card>

        {/* Direct Revenue */}
        <Card className="gap-0 py-0">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-0">
            <CardTitle className="text-base font-semibold">Direct Revenue</CardTitle>
            <span className={`text-sm font-bold ${directBadge.positive ? "text-emerald-500" : "text-red-500"}`}>{directBadge.badge}</span>
          </CardHeader>
          <CardContent className="p-2">
            <DashboardHighchart options={directRevenueOpts} className="h-[290px] w-full" />
          </CardContent>
        </Card>

        {/* Gauge: Sales Year to Date */}
        <div className="flex flex-1 flex-col rounded-2xl border bg-card px-5 pb-3 pt-4 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Sales Year to Date</p>
          <DashboardHighchart options={srGauge1Opts} className="h-[250px] w-full" />
          <div className="mt-0.5 flex justify-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-4 rounded-full bg-slate-500" />Current
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-4 rounded-full bg-slate-400 opacity-40" />Previous
            </span>
          </div>
          <p className="mt-1 text-center text-[13px] font-medium text-foreground">
            {ytdGaugeTarget > 0 ? `${Math.round((ytd / ytdGaugeTarget) * 100)}% of target reached` : "—"}
          </p>
          <p className="mt-0.5 text-center text-[13px] text-muted-foreground">
            Previous YTD: {formatGaugeRevenue(prevYtd)}
          </p>
          <p className="mt-0.5 text-center text-[13px] text-muted-foreground">Target: {formatGaugeRevenue(ytdGaugeTarget)}</p>
        </div>

        {/* Total Revenue */}
        <Card className="gap-0 py-0">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-0">
            <CardTitle className="text-base font-semibold">Total Revenue</CardTitle>
            <span className={`text-sm font-bold ${totalRevBadge.positive ? "text-emerald-500" : "text-red-500"}`}>{totalRevBadge.badge}</span>
          </CardHeader>
          <CardContent className="p-2">
            <DashboardHighchart options={totalRevenueOpts} className="h-[290px] w-full" />
          </CardContent>
        </Card>

        {/* Channel Partner Revenue */}
        <Card className="gap-0 py-0">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-0">
            <CardTitle className="text-base font-semibold">Channel Partner Revenue</CardTitle>
            <span className={`text-sm font-bold ${partnerBadge.positive ? "text-emerald-500" : "text-red-500"}`}>{partnerBadge.badge}</span>
          </CardHeader>
          <CardContent className="p-2">
            <DashboardHighchart options={channelPartnerOpts} className="h-[290px] w-full" />
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
