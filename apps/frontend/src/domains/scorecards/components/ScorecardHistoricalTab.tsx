"use client";

import * as React from "react";
import type { DateRange } from "react-day-picker";

import {
  REVENUE_CUSTOMER_CHANNEL_LABELS,
  REVENUE_CUSTOMER_CHANNEL_VALUES,
  type RevenueCustomerChannel,
} from "@contracts/sales";

import { type ScorecardHistoricalState } from "@/lib/sf/use-scorecard-historical";
import {
  DashboardHighchart,
  type DashboardHighchartProps,
  chartColor,
  createBaseChartOptions,
} from "@/shared/charts/highcharts";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { DatePicker } from "@/shared/ui/date-picker";
import { Skeleton } from "@/shared/ui/skeleton";

type HistoricalOrderType = "new" | "renewal" | "upgrade" | "downgrade";

const ORDER_TYPE_META: Array<{
  key: HistoricalOrderType;
  label: string;
  color: string;
}> = [
  { key: "new", label: "New", color: chartColor(0) },
  { key: "renewal", label: "Renewal", color: chartColor(1) },
  { key: "upgrade", label: "Upgrade", color: chartColor(2) },
  { key: "downgrade", label: "Downgrade", color: chartColor(4) },
];

function toCurrencySeries(values: readonly number[]): number[] {
  return values.map((value) => value * 1_000);
}

function toCumulativeSeries(values: readonly number[]): number[] {
  let runningTotal = 0;

  return values.map((value) => {
    runningTotal += value;
    return runningTotal;
  });
}

function formatCurrency(value: number): string {
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }

  if (absoluteValue >= 1_000) {
    return `$${Math.round(value / 1_000)}K`;
  }

  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function formatDateLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function formatDateRangeLabel(range: DateRange): string {
  const from = range.from;
  const to = range.to ?? range.from;

  if (!from || !to) {
    return "Custom range";
  }

  return `${formatDateLabel(from)} - ${formatDateLabel(to)}`;
}

function toRgba(color: string, alpha: number): string {
  const normalized = color.replace("#", "");
  const hex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((token) => `${token}${token}`)
          .join("")
      : normalized;

  if (hex.length !== 6) {
    return color;
  }

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function createAreaGradient(color: string) {
  return {
    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
    stops: [
      [0, toRgba(color, 0.52)],
      [0.6, toRgba(color, 0.18)],
      [1, toRgba(color, 0.03)],
    ],
  } as const;
}

function sumSeriesMapValues(seriesMap: Record<string, readonly number[]>): number[] {
  const seriesList = Object.values(seriesMap);
  const maxLength = seriesList.reduce((max, series) => Math.max(max, series.length), 0);

  if (maxLength === 0) {
    return [];
  }

  return Array.from({ length: maxLength }, (_, index) =>
    seriesList.reduce((sum, series) => sum + (series[index] ?? 0), 0),
  );
}

function resolveCategoryLabel(
  value: unknown,
  categories: readonly string[],
): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" && Number.isInteger(value)) {
    return categories[value] ?? String(value);
  }

  return String(value);
}

function TogglePills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-md border border-border bg-muted p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded px-2.5 py-1 text-xs font-medium transition-colors",
            value === option.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function HistoricalChartLoading() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-44" />
      <Skeleton className="h-3 w-56" />
      <Skeleton className="h-[360px] w-full" />
    </div>
  );
}

function HistoricalChartCard({
  title,
  subtitle,
  loading,
  error,
  hasData,
  emptyMessage,
  options,
}: {
  title: string;
  subtitle: string;
  loading: boolean;
  error: string | null;
  hasData: boolean;
  emptyMessage: string;
  options: DashboardHighchartProps["options"] | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-0 pt-4">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="p-0 pr-4 pb-4">
        <div className="h-[360px] p-4 pt-3">
          {!hasData && loading ? (
            <HistoricalChartLoading />
          ) : error && !hasData ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed px-4 text-sm text-muted-foreground">
              {error}
            </div>
          ) : options ? (
            <DashboardHighchart options={options} className={cn("h-full w-full", loading && "opacity-60")} />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed px-4 text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ScorecardHistoricalTab({
  customerChannel,
  onCustomerChannelChange,
  dateRange,
  onDateRangeChange,
  monthlyState,
}: {
  customerChannel: RevenueCustomerChannel;
  onCustomerChannelChange: (value: RevenueCustomerChannel) => void;
  dateRange: DateRange;
  onDateRangeChange: (value: DateRange | undefined) => void;
  monthlyState: ScorecardHistoricalState;
}) {
  const selectedDateRangeLabel = React.useMemo(
    () => formatDateRangeLabel(dateRange),
    [dateRange],
  );

  const monthlyTrendOrderTypeSeries = React.useMemo(
    () =>
      ORDER_TYPE_META.map(({ key, label, color }) => ({
        type: "areaspline" as const,
        name: label,
        color,
        fillColor: createAreaGradient(color),
        data: toCurrencySeries(monthlyState.data?.orderTypeRevenue[key] ?? []),
      })),
    [monthlyState.data],
  );

  const monthlyOrderTypeRevenueSeries = React.useMemo(
    () =>
      ORDER_TYPE_META.map(({ key, label, color }) => ({
        type: "column" as const,
        name: label,
        color,
        data: toCurrencySeries(monthlyState.data?.orderTypeRevenue[key] ?? []),
      })),
    [monthlyState.data],
  );

  const cumulativeOrderTypeRevenueSeries = React.useMemo(
    () =>
      ORDER_TYPE_META.map(({ key, label, color }) => ({
        type: "areaspline" as const,
        name: label,
        color,
        fillColor: createAreaGradient(color),
        data: toCumulativeSeries(toCurrencySeries(monthlyState.data?.orderTypeRevenue[key] ?? [])),
      })),
    [monthlyState.data],
  );

  const percentOrderTypeLineSeries = React.useMemo(
    () =>
      ORDER_TYPE_META.map(({ key, label, color }) => ({
        type: "areaspline" as const,
        name: label,
        color,
        fillColor: createAreaGradient(color),
        data: toCurrencySeries(monthlyState.data?.orderTypeRevenue[key] ?? []),
      })),
    [monthlyState.data],
  );

  const percentOrderTypeBarSeries = React.useMemo(
    () =>
      ORDER_TYPE_META.map(({ key, label, color }) => ({
        type: "column" as const,
        name: label,
        color,
        data: toCurrencySeries(monthlyState.data?.orderTypeRevenue[key] ?? []),
      })),
    [monthlyState.data],
  );

  const totalMonthlyRevenue = React.useMemo(() => {
    if (!monthlyState.data) {
      return [];
    }

    return toCurrencySeries(sumSeriesMapValues(monthlyState.data.orderTypeRevenue));
  }, [monthlyState.data]);

  const monthlyLabelStep = React.useMemo(
    () => Math.max(1, Math.ceil((monthlyState.data?.months.length ?? 0) / 16)),
    [monthlyState.data?.months.length],
  );

  const hasMonthlyTrendRevenue = React.useMemo(
    () => monthlyTrendOrderTypeSeries.some((series) => series.data.some((value) => (value as number) > 0)),
    [monthlyTrendOrderTypeSeries],
  );
  const hasMonthlyRevenue = React.useMemo(
    () => totalMonthlyRevenue.some((value) => value > 0),
    [totalMonthlyRevenue],
  );
  const hasMonthlyOrderTypeRevenue = React.useMemo(
    () => monthlyOrderTypeRevenueSeries.some((series) => series.data.some((value) => (value as number) > 0)),
    [monthlyOrderTypeRevenueSeries],
  );
  const hasCumulativeOrderTypeRevenue = React.useMemo(
    () => cumulativeOrderTypeRevenueSeries.some((series) => series.data.some((value) => (value as number) > 0)),
    [cumulativeOrderTypeRevenueSeries],
  );
  const hasPercentOrderTypeRevenue = React.useMemo(
    () => percentOrderTypeBarSeries.some((series) => series.data.some((value) => (value as number) > 0)),
    [percentOrderTypeBarSeries],
  );

  const monthlyTrendRevenueOptions = React.useMemo(() => {
    if (!monthlyState.data || !hasMonthlyTrendRevenue) {
      return null;
    }

    return createBaseChartOptions({
      chart: {
        type: "areaspline",
        marginBottom: 56,
      },
      title: { text: undefined },
      xAxis: {
        categories: monthlyState.data.months,
        tickLength: 0,
        lineWidth: 0,
        labels: {
          step: monthlyLabelStep,
          rotation: -35,
          style: { fontSize: "10px" },
        },
      },
      yAxis: {
        title: { text: undefined },
        labels: {
          formatter() {
            return formatCurrency(this.value as number);
          },
        },
        gridLineDashStyle: "Dash",
      },
      tooltip: {
        shared: true,
        formatter() {
          const points = this.points ?? [];
          const label = resolveCategoryLabel(this.x, monthlyState.data?.months ?? []);
          const lines = points.map(
            (point) =>
              `<span style="color:${String(point.color)}">\u25CF</span> ${point.series.name}: <b>${formatCurrency(Number(point.y ?? 0))}</b>`,
          );

          return `<b>${label}</b><br/>${lines.join("<br/>")}`;
        },
      },
      legend: {
        enabled: true,
        align: "left",
        verticalAlign: "top",
        itemStyle: { fontWeight: "500", fontSize: "12px" },
      },
      plotOptions: {
        series: {
          animation: false,
          marker: { enabled: false },
        },
        areaspline: {
          stacking: "normal",
          fillOpacity: 1,
          lineWidth: 2.25,
          threshold: null,
        },
      },
      series: monthlyTrendOrderTypeSeries,
    });
  }, [hasMonthlyTrendRevenue, monthlyLabelStep, monthlyState.data, monthlyTrendOrderTypeSeries]);

  const monthlyRevenueOptions = React.useMemo(() => {
    if (!monthlyState.data || !hasMonthlyRevenue) {
      return null;
    }

    return createBaseChartOptions({
      chart: {
        type: "column",
        marginBottom: 56,
      },
      title: { text: undefined },
      xAxis: {
        categories: monthlyState.data.months,
        tickLength: 0,
        lineWidth: 0,
        labels: {
          step: monthlyLabelStep,
          rotation: -35,
          style: { fontSize: "10px" },
        },
      },
      yAxis: {
        title: { text: undefined },
        labels: {
          formatter() {
            return formatCurrency(this.value as number);
          },
        },
        gridLineDashStyle: "Dash",
      },
      tooltip: {
        formatter() {
          const label = resolveCategoryLabel(this.x, monthlyState.data?.months ?? []);

          return `<b>${label}</b><br/><span style="color:${String(this.color)}">\u25CF</span> Revenue: <b>${formatCurrency(Number(this.y ?? 0))}</b>`;
        },
      },
      legend: {
        enabled: false,
      },
      plotOptions: {
        series: {
          animation: false,
        },
        column: {
          borderWidth: 0,
          borderRadius: 4,
          pointPadding: 0.04,
          groupPadding: 0.08,
        },
      },
      series: [
        {
          type: "column",
          name: "Revenue",
          data: totalMonthlyRevenue,
          color: chartColor(1),
        },
      ],
    });
  }, [hasMonthlyRevenue, monthlyLabelStep, monthlyState.data, totalMonthlyRevenue]);

  const cumulativeRevenueOptions = React.useMemo(() => {
    if (!monthlyState.data || !hasCumulativeOrderTypeRevenue) {
      return null;
    }

    return createBaseChartOptions({
      chart: {
        type: "areaspline",
        marginBottom: 56,
      },
      title: { text: undefined },
      xAxis: {
        categories: monthlyState.data.months,
        tickLength: 0,
        lineWidth: 0,
        labels: {
          step: monthlyLabelStep,
          rotation: -35,
          style: { fontSize: "10px" },
        },
      },
      yAxis: {
        title: { text: undefined },
        labels: {
          formatter() {
            return formatCurrency(this.value as number);
          },
        },
        gridLineDashStyle: "Dash",
      },
      tooltip: {
        shared: true,
        formatter() {
          const points = this.points ?? [];
          const label = resolveCategoryLabel(this.x, monthlyState.data?.months ?? []);
          const lines = points.map(
            (point) =>
              `<span style="color:${String(point.color)}">\u25CF</span> ${point.series.name}: <b>${formatCurrency(Number(point.y ?? 0))}</b>`,
          );

          return `<b>${label}</b><br/>${lines.join("<br/>")}`;
        },
      },
      legend: {
        enabled: true,
        align: "left",
        verticalAlign: "top",
        itemStyle: { fontWeight: "500", fontSize: "12px" },
      },
      plotOptions: {
        series: {
          animation: false,
          marker: { enabled: false },
        },
        areaspline: {
          stacking: "normal",
          lineWidth: 2.5,
          fillOpacity: 1,
        },
      },
      series: cumulativeOrderTypeRevenueSeries,
    });
  }, [cumulativeOrderTypeRevenueSeries, hasCumulativeOrderTypeRevenue, monthlyLabelStep, monthlyState.data]);

  const percentRevenueMixLineOptions = React.useMemo(() => {
    if (!monthlyState.data || !hasPercentOrderTypeRevenue) {
      return null;
    }

    return createBaseChartOptions({
      chart: {
        type: "areaspline",
        marginBottom: 56,
      },
      title: { text: undefined },
      xAxis: {
        categories: monthlyState.data.months,
        tickLength: 0,
        lineWidth: 0,
        labels: {
          step: monthlyLabelStep,
          rotation: -35,
          style: { fontSize: "10px" },
        },
      },
      yAxis: {
        min: 0,
        max: 100,
        title: { text: undefined },
        labels: {
          formatter() {
            return formatPercent(this.value as number);
          },
        },
        gridLineDashStyle: "Dash",
      },
      tooltip: {
        shared: true,
        formatter() {
          const points = this.points ?? [];
          const label = resolveCategoryLabel(this.x, monthlyState.data?.months ?? []);
          const lines = points.map(
            (point) =>
              `<span style="color:${String(point.color)}">\u25CF</span> ${point.series.name}: <b>${formatPercent(Number(point.percentage ?? 0))}</b> <span style="color:#64748b">(${formatCurrency(Number(point.y ?? 0))})</span>`,
          );

          return `<b>${label}</b><br/>${lines.join("<br/>")}`;
        },
      },
      legend: {
        enabled: true,
        align: "left",
        verticalAlign: "top",
        itemStyle: { fontWeight: "500", fontSize: "12px" },
      },
      plotOptions: {
        series: {
          animation: false,
          marker: { enabled: false },
        },
        areaspline: {
          stacking: "percent",
          lineWidth: 2.25,
          fillOpacity: 1,
        },
      },
      series: percentOrderTypeLineSeries,
    });
  }, [hasPercentOrderTypeRevenue, monthlyLabelStep, monthlyState.data, percentOrderTypeLineSeries]);

  const monthlyOrderTypeRevenueOptions = React.useMemo(() => {
    if (!monthlyState.data || !hasMonthlyOrderTypeRevenue) {
      return null;
    }

    return createBaseChartOptions({
      chart: {
        type: "column",
        marginBottom: 56,
      },
      title: { text: undefined },
      xAxis: {
        categories: monthlyState.data.months,
        tickLength: 0,
        lineWidth: 0,
        labels: {
          step: monthlyLabelStep,
          rotation: -35,
          style: { fontSize: "10px" },
        },
      },
      yAxis: {
        title: { text: undefined },
        labels: {
          formatter() {
            return formatCurrency(this.value as number);
          },
        },
        gridLineDashStyle: "Dash",
      },
      tooltip: {
        shared: true,
        formatter() {
          const points = this.points ?? [];
          const label = resolveCategoryLabel(this.x, monthlyState.data?.months ?? []);
          const lines = points.map(
            (point) =>
              `<span style="color:${String(point.color)}">\u25CF</span> ${point.series.name}: <b>${formatCurrency(Number(point.y ?? 0))}</b>`,
          );

          return `<b>${label}</b><br/>${lines.join("<br/>")}`;
        },
      },
      legend: {
        enabled: true,
        align: "left",
        verticalAlign: "top",
        itemStyle: { fontWeight: "500", fontSize: "12px" },
      },
      plotOptions: {
        series: {
          animation: false,
        },
        column: {
          stacking: "normal",
          borderWidth: 0,
          borderRadius: 3,
          pointPadding: 0.04,
          groupPadding: 0.08,
        },
      },
      series: monthlyOrderTypeRevenueSeries,
    });
  }, [hasMonthlyOrderTypeRevenue, monthlyLabelStep, monthlyOrderTypeRevenueSeries, monthlyState.data]);

  const percentRevenueMixBarOptions = React.useMemo(() => {
    if (!monthlyState.data || !hasPercentOrderTypeRevenue) {
      return null;
    }

    return createBaseChartOptions({
      chart: {
        type: "column",
        marginBottom: 56,
      },
      title: { text: undefined },
      xAxis: {
        categories: monthlyState.data.months,
        tickLength: 0,
        lineWidth: 0,
        labels: {
          step: monthlyLabelStep,
          rotation: -35,
          style: { fontSize: "10px" },
        },
      },
      yAxis: {
        min: 0,
        max: 100,
        title: { text: undefined },
        labels: {
          formatter() {
            return formatPercent(this.value as number);
          },
        },
        gridLineDashStyle: "Dash",
      },
      tooltip: {
        shared: true,
        formatter() {
          const points = this.points ?? [];
          const label = resolveCategoryLabel(this.x, monthlyState.data?.months ?? []);
          const lines = points.map(
            (point) =>
              `<span style="color:${String(point.color)}">\u25CF</span> ${point.series.name}: <b>${formatPercent(Number(point.percentage ?? 0))}</b> <span style="color:#64748b">(${formatCurrency(Number(point.y ?? 0))})</span>`,
          );

          return `<b>${label}</b><br/>${lines.join("<br/>")}`;
        },
      },
      legend: {
        enabled: true,
        align: "left",
        verticalAlign: "top",
        itemStyle: { fontWeight: "500", fontSize: "12px" },
      },
      plotOptions: {
        series: {
          animation: false,
        },
        column: {
          stacking: "percent",
          borderWidth: 0,
          borderRadius: 3,
          pointPadding: 0.04,
          groupPadding: 0.08,
        },
      },
      series: percentOrderTypeBarSeries,
    });
  }, [hasPercentOrderTypeRevenue, monthlyLabelStep, monthlyState.data, percentOrderTypeBarSeries]);

  const headerStatus = monthlyState.error
    ? monthlyState.error
    : monthlyState.loading && !monthlyState.data
      ? "Loading historical Salesforce data..."
      : monthlyState.loading
        ? `Refreshing long-range monthly revenue through ${monthlyState.data?.asOfDate ?? "today"}...`
        : `Historical Salesforce snapshot · ${REVENUE_CUSTOMER_CHANNEL_LABELS[customerChannel]}`;

  return (
    <div className="space-y-4">
      <Card className="gap-0 py-0">
        <CardHeader className="pb-3 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Historical Snapshot
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">{headerStatus}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <DatePicker
                value={dateRange}
                onChange={onDateRangeChange}
                placeholder="Pick historical range"
                className="min-w-[280px]"
              />
              <div className="rounded-full border border-[#9198F0]/25 bg-[#9198F0]/10 px-3 py-1 text-[11px] font-semibold text-[#6A73E0] dark:text-[#B7BCFF]">
                {selectedDateRangeLabel}
              </div>
              <TogglePills
                options={REVENUE_CUSTOMER_CHANNEL_VALUES.map((value) => ({
                  label: REVENUE_CUSTOMER_CHANNEL_LABELS[value],
                  value,
                }))}
                value={customerChannel}
                onChange={onCustomerChannelChange}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      <HistoricalChartCard
        title="Monthly Revenue by Order Type"
        subtitle={`Selected range · ${selectedDateRangeLabel} · monthly revenue stacked by order type`}
        loading={monthlyState.loading}
        error={monthlyState.error}
        hasData={Boolean(monthlyState.data) && hasMonthlyTrendRevenue}
        emptyMessage="No order-type revenue data available for the selected customer channel."
        options={monthlyTrendRevenueOptions}
      />

      <HistoricalChartCard
        title="Monthly Revenue"
        subtitle={`Selected range · ${selectedDateRangeLabel} · monthly revenue bar chart`}
        loading={monthlyState.loading}
        error={monthlyState.error}
        hasData={Boolean(monthlyState.data) && hasMonthlyRevenue}
        emptyMessage="No monthly revenue is available for the selected customer channel."
        options={monthlyRevenueOptions}
      />

      <HistoricalChartCard
        title="Cumulative Revenue by Order Type"
        subtitle={`Selected range · ${selectedDateRangeLabel} · cumulative monthly revenue by order type`}
        loading={monthlyState.loading}
        error={monthlyState.error}
        hasData={Boolean(monthlyState.data) && hasCumulativeOrderTypeRevenue}
        emptyMessage="No cumulative order-type revenue is available for the selected customer channel."
        options={cumulativeRevenueOptions}
      />

      <HistoricalChartCard
        title="100% Stacked Revenue Mix"
        subtitle={`Selected range · ${selectedDateRangeLabel} · normalized to monthly order-type mix`}
        loading={monthlyState.loading}
        error={monthlyState.error}
        hasData={Boolean(monthlyState.data) && hasPercentOrderTypeRevenue}
        emptyMessage="No normalized order-type revenue mix is available for the selected customer channel."
        options={percentRevenueMixLineOptions}
      />

      <HistoricalChartCard
        title="Full Interval Revenue by Order Type"
        subtitle={`Selected range · ${selectedDateRangeLabel} · monthly bars broken down by order type`}
        loading={monthlyState.loading}
        error={monthlyState.error}
        hasData={Boolean(monthlyState.data) && hasMonthlyOrderTypeRevenue}
        emptyMessage="No full-interval order-type revenue is available for the selected customer channel."
        options={monthlyOrderTypeRevenueOptions}
      />

      <HistoricalChartCard
        title="100% Stacked Revenue Mix Bars"
        subtitle={`Selected range · ${selectedDateRangeLabel} · normalized to monthly order-type mix`}
        loading={monthlyState.loading}
        error={monthlyState.error}
        hasData={Boolean(monthlyState.data) && hasPercentOrderTypeRevenue}
        emptyMessage="No normalized order-type revenue mix is available for the selected customer channel."
        options={percentRevenueMixBarOptions}
      />
    </div>
  );
}
