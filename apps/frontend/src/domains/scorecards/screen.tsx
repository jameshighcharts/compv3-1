"use client";

import * as React from "react";

import {
  IconCurrencyDollar,
  IconChartLine,
  IconArrowRight,
  IconUsers,
  IconMap,
  IconFlame,
  IconHistory,
} from "@tabler/icons-react";
import type { DateRange } from "react-day-picker";

import { useTheme } from "next-themes";
import { ScorecardArrTab } from "@/domains/scorecards/components/ScorecardArrTab";
import { ScorecardMapTab } from "@/domains/scorecards/components/ScorecardMapTab";
import { ScorecardHistoricalTab } from "@/domains/scorecards/components/ScorecardHistoricalTab";
import { ScorecardTopDealsTab } from "@/domains/scorecards/components/ScorecardTopDealsTab";
import { ScorecardChannelDashboardTab } from "@/domains/scorecards/components/ScorecardChannelDashboardTab";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Sheet, SheetContent } from "@/shared/ui/sheet";
import { WorldMap } from "@/domains/scorecards/components/WorldMap";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { DashboardHighchart, chartColor, createBaseChartOptions } from "@/shared/charts/highcharts";
import {
  useSalesforceRevenue,
  type SalesforceRevenueState,
} from "@/lib/sf/use-salesforce-revenue";
import { useScorecardArr } from "@/lib/sf/use-scorecard-arr";
import { useScorecardChannelDashboard } from "@/lib/sf/use-scorecard-channel-dashboard";
import { useScorecardMap } from "@/lib/sf/use-scorecard-map";
import { useScorecardTodaySummary } from "@/lib/sf/use-scorecard-today-summary";
import {
  useScorecardHistoricalMonthlyData,
} from "@/lib/sf/use-scorecard-historical";
import { useScorecardTopDeals } from "@/lib/sf/use-scorecard-top-deals";
import {
  buildSalesTargetBenchmarks,
  resolveSalesTargetSummary,
} from "@/domains/sales/data/sales-targets";
import {
  DEFAULT_REVENUE_CUSTOMER_CHANNEL,
  DEFAULT_REVENUE_RANGE,
  DEFAULT_REVENUE_SALES_CHANNEL,
  DEFAULT_SCORECARD_MAP_INTERVAL,
  REVENUE_CUSTOMER_CHANNEL_LABELS,
  REVENUE_RANGE_LABELS,
  REVENUE_RANGE_VALUES,
  REVENUE_SALES_CHANNEL_LABELS,
  REVENUE_SALES_CHANNEL_VALUES,
  type ScorecardMapInterval,
  type RevenueCustomerChannel,
  type RevenueRange,
  type RevenueSalesChannel,
  type SfRevenueResponse,
  type SfTodaySummaryResponse,
} from "@contracts/sales";

import {
  COUNTRIES,
  Country,
  DAILY_ACTUAL,
  mtdKpis,
  ytdKpis,
  ordersCustomersKpis,
  TARGET_BENCHMARKS,
  YTD_TARGET_BENCHMARKS,
  TargetBenchmark,
  TREND_BY_DAY_VALUES,
  TREND_BY_QUARTER_LABELS,
  TREND_BY_QUARTER_VALUES,
  TREND_BY_WEEK_LABELS,
  TREND_BY_WEEK_VALUES,
  DAILY_BUDGET_RATE,
  DAILY_ACTUAL_LAST_YEAR,
  DAILY_ORDERS_THIS_YEAR,
  DAILY_ORDERS_LAST_YEAR,
  type TodayStat,
  TODAY_STATS,
  ORDER_TYPE_DAILY_MTD,
  ORDER_TYPE_DAILY_YTD,
  ORDER_TYPE_REVENUE_MTD,
  ORDER_TYPE_REVENUE_YTD,
} from "./data/scorecards.data";

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtSignedCurrency(n: number): string {
  const value = fmtCurrency(Math.abs(n));

  if (n === 0) {
    return value;
  }

  return `${n > 0 ? "+" : "-"}${value}`;
}

function fmtSignedInteger(n: number): string {
  if (n === 0) {
    return "0";
  }

  return `${n > 0 ? "+" : ""}${n.toLocaleString("en-US")}`;
}

function parseDateOnlyUtc(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

const HISTORICAL_RANGE_START = new Date(2022, 2, 1);

function formatDateOnlyLocal(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function buildDefaultHistoricalDateRange(): DateRange {
  return {
    from: HISTORICAL_RANGE_START,
    to: new Date(),
  };
}

function sumValues(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

function toCumulativeSeries(values: readonly number[]): number[] {
  const out: number[] = [];
  let runningTotal = 0;

  for (const value of values) {
    runningTotal += value;
    out.push(runningTotal);
  }

  return out;
}

function sumMonthlySeriesForYear(
  months: readonly string[],
  values: readonly number[],
  year: number,
): number {
  const yearSuffix = `'${String(year).slice(2)}`;

  return values.reduce(
    (sum, value, index) => sum + (months[index]?.endsWith(yearSuffix) ? value : 0),
    0,
  );
}

type ScorecardTab =
  | "main"
  | "arr"
  | "direct"
  | "channel-partner"
  | "historical"
  | "map"
  | "top-deals";

function fmtPct(n: number, showPlus = true): string {
  return `${showPlus && n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function fmtWholeCurrency(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function buildMonthDayLabels(monthShort: string, totalDays: number): string[] {
  return Array.from({ length: totalDays }, (_, i) => `${monthShort} ${i + 1}`);
}

function padSeriesToLength(values: readonly number[], totalLength: number): (number | null)[] {
  if (values.length >= totalLength) {
    return [...values];
  }

  return [...values, ...Array.from({ length: totalLength - values.length }, () => null)];
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

function fmtRevenueThousands(n: number): string {
  return fmtCurrency(n * 1_000);
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function TogglePills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            value === opt.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Coloured rule + title used to open each logical section */
function SectionHeader({ label, accent = "#8087E8" }: { label: string; accent?: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="h-px flex-1 bg-border" />
      <span
        className="rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide whitespace-nowrap"
        style={{
          color: accent,
          borderColor: `${accent}55`,
          backgroundColor: `${accent}18`,
        }}
      >
        ● {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

/** Period badge pill shown in panel headers */
function PeriodBadge({ label, variant }: { label: string; variant: "mtd" | "ytd" }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        variant === "mtd"
          ? "border-[#8087E8]/30 bg-[#8087E8]/10 text-[#8087E8]"
          : "border-[#A3EDBA]/40 bg-[#A3EDBA]/10 text-emerald-600 dark:text-[#A3EDBA]",
      )}
    >
      {label}
    </span>
  );
}

const REVENUE_RANGE_OPTIONS = REVENUE_RANGE_VALUES.map((value) => ({
  label: REVENUE_RANGE_LABELS[value],
  value,
}));

const SALES_CHANNEL_OPTIONS = REVENUE_SALES_CHANNEL_VALUES.map((value) => ({
  label: REVENUE_SALES_CHANNEL_LABELS[value],
  value,
}));

const ORDER_TYPE_LABELS = {
  new: "New",
  upgrade: "Upgrade",
  renewal: "Renewal",
  downgrade: "Downgrade",
} as const;

// ─── Target Scorecards ────────────────────────────────────────────────────────

const SCORECARD_ACCENTS = ["#F7A85E", "#6DDFA0", "#9198F0"] as const;

function scorecardStatus(pctOnTrack: number) {
  const diff = Math.round(Math.abs(100 - pctOnTrack));
  if (pctOnTrack >= 105) return { type: "ahead" as const, diff };
  if (pctOnTrack >= 92) return { type: "ontrack" as const, diff };
  return { type: "behind" as const, diff };
}

function ScorecardStatusBadge({ status }: { status: ReturnType<typeof scorecardStatus> }) {
  if (status.type === "ahead")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        ▲ +{status.diff}% ahead
      </span>
    );
  if (status.type === "ontrack")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        ✓ On track
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
      ⚠ -{status.diff}% behind pace
    </span>
  );
}

function LeaderboardRow({
  rank,
  benchmark,
  accent,
  emphasized = false,
  todayRevenue = 0,
}: {
  rank: number;
  benchmark: TargetBenchmark;
  accent: string;
  emphasized?: boolean;
  todayRevenue?: number;
}) {
  const status = scorecardStatus(benchmark.pctOnTrack);
  const totalFillPct = Math.min(100, benchmark.pctReached);
  const todayContribPct = benchmark.amount > 0 ? Math.min(totalFillPct, (todayRevenue / benchmark.amount) * 100) : 0;
  const priorFillPct = Math.max(0, totalFillPct - todayContribPct);

  return (
    <div
      className={cn(
        "flex items-center rounded-xl border bg-card px-6 py-5 shadow-sm",
        emphasized && "ring-1 ring-inset",
      )}
      style={{
        borderLeftWidth: 4,
        borderLeftColor: accent,
        ...(emphasized ? { ringColor: `${accent}35` } : {}),
        ...(emphasized ? { boxShadow: `0 0 0 1px ${accent}25, 0 1px 3px 0 rgba(0,0,0,0.06)` } : {}),
      }}
    >
      {/* Rank */}
      <span className="text-xl font-extrabold text-muted-foreground/50 w-8 shrink-0">{rank}</span>

      {/* Target info + progress bar */}
      <div className="flex flex-col gap-1.5 flex-1 mr-6">
        <p className="text-base font-bold leading-tight">{benchmark.name}</p>
        <p className="text-sm text-muted-foreground">{fmtCurrency(benchmark.amount)} target</p>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          {/* Prior MTD revenue */}
          <div
            className="absolute left-0 top-0 h-full transition-all duration-700"
            style={{ width: `${priorFillPct}%`, backgroundColor: accent }}
          />
          {/* Today's contribution — brighter segment appended after prior fill */}
          {todayContribPct > 0 && (
            <div
              className="absolute top-0 h-full transition-all duration-700"
              style={{
                left: `${priorFillPct}%`,
                width: `${todayContribPct}%`,
                backgroundColor: accent,
                opacity: 0.45,
              }}
            />
          )}
        </div>
        {todayContribPct > 0 && (
          <p className="text-[10px] text-muted-foreground">
            Today: <span className="font-bold text-foreground">{fmtCurrency(Math.round(todayRevenue))}</span> added
          </p>
        )}
      </div>

      {/* % Hit */}
      <div className="w-[100px] text-right shrink-0">
        <p className="text-3xl font-extrabold tracking-tight">
          {benchmark.pctReached.toFixed(1)}%
        </p>
      </div>

      {/* Gap Remaining */}
      <div className="w-[110px] text-right shrink-0">
        <p className="text-base font-semibold text-muted-foreground">
          –{fmtCurrency(benchmark.revenueLeft)}
        </p>
      </div>

      {/* Pace badge */}
      <div className="w-[130px] flex justify-end shrink-0">
        <ScorecardStatusBadge status={status} />
      </div>
    </div>
  );
}

function SalesLeaderboard({
  period,
  onPeriodChange,
  benchmarks,
  statusMessage,
  todayRevenue = 0,
}: {
  period: "mtd" | "ytd";
  onPeriodChange: (v: "mtd" | "ytd") => void;
  benchmarks: TargetBenchmark[];
  statusMessage: string;
  todayRevenue?: number;
}) {
  return (
    <div className="space-y-3">
      {/* Column headers */}
      <div className="flex items-center px-6 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="w-8 shrink-0">#</span>
        <span className="flex-1">Target</span>
        <span className="w-[100px] text-right shrink-0">% Hit</span>
        <span className="w-[110px] text-right shrink-0">Gap Remaining</span>
        <span className="w-[130px] text-right shrink-0">Pace</span>
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {benchmarks.map((b, i) => (
          <LeaderboardRow
            key={b.name}
            rank={i + 1}
            benchmark={b}
            accent={SCORECARD_ACCENTS[i]}
            emphasized={i === 1}
            todayRevenue={period === "mtd" ? todayRevenue : 0}
          />
        ))}
      </div>

      {/* Toggle + status below rows, centered */}
      <div className="flex flex-col items-center gap-1.5 pt-1">
        <TogglePills
          options={[
            { label: "MTD", value: "mtd" as const },
            { label: "YTD", value: "ytd" as const },
          ]}
          value={period}
          onChange={onPeriodChange}
        />
        <span className="text-[10px] text-muted-foreground">{statusMessage}</span>
      </div>
    </div>
  );
}

/** Compact stat inside a period panel */
function MiniStat({
  label,
  value,
  sub,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/60 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {sub !== undefined && (
        <p className={cn("text-[11px] font-medium", positive === true ? "text-emerald-500" : positive === false ? "text-red-500" : "text-muted-foreground")}>
          {sub}
        </p>
      )}
    </div>
  );
}

function resolveChannelRevenueSeriesMap(
  customerChannel: RevenueCustomerChannel,
  data: SfRevenueResponse | null,
): Record<string, number[]> {
  if (!data) {
    return {};
  }

  if (customerChannel === "Direct Sales") {
    return data.directRevenue;
  }

  if (customerChannel === "Channel Partner Sales") {
    return data.channelPartnerRevenue;
  }

  return {};
}

function buildVisibleMonthsLabel(months: readonly string[]): string {
  if (months.length === 0) {
    return "No visible months";
  }

  if (months.length === 1) {
    return months[0] ?? "Visible month";
  }

  return `${months[0]} - ${months[months.length - 1]}`;
}

function resolveFilteredRangeMetrics(
  customerChannel: RevenueCustomerChannel,
  data: SfRevenueResponse | null,
) {
  const months = data?.months ?? [];
  const monthlyRevenue = sumSeriesMapValues(
    resolveChannelRevenueSeriesMap(customerChannel, data),
  );
  const monthlyOrders = sumSeriesMapValues(data?.orderTypeCount ?? {});
  const rangeRevenue = sumValues(monthlyRevenue);
  const rangeOrders = sumValues(monthlyOrders);
  const latestRevenue = monthlyRevenue.at(-1) ?? 0;
  const previousRevenue = monthlyRevenue.at(-2) ?? 0;
  const latestOrders = monthlyOrders.at(-1) ?? 0;
  const previousOrders = monthlyOrders.at(-2) ?? 0;
  const hasPreviousVisibleMonth = months.length > 1;

  return {
    months,
    monthlyRevenue,
    monthlyOrders,
    rangeRevenue,
    rangeOrders,
    avgOrderValue: rangeOrders > 0 ? Math.round((rangeRevenue * 1_000) / rangeOrders) : 0,
    latestRevenue,
    previousRevenue,
    latestOrders,
    previousOrders,
    latestMonthLabel: months.at(-1) ?? "Latest visible month",
    previousMonthLabel: months.at(-2) ?? "No prior visible month",
    visibleMonthsLabel: buildVisibleMonthsLabel(months),
    hasPreviousVisibleMonth,
  };
}

function SalesforceChannelFilterCard({
  customerChannel,
  range,
  onRangeChange,
  salesChannel,
  onSalesChannelChange,
  state,
}: {
  customerChannel: RevenueCustomerChannel;
  range: RevenueRange;
  onRangeChange: (value: RevenueRange) => void;
  salesChannel: RevenueSalesChannel;
  onSalesChannelChange: (value: RevenueSalesChannel) => void;
  state: SalesforceRevenueState;
}) {
  const isInitialLoad = state.loading && !state.data && !state.error;
  const metrics = React.useMemo(
    () => resolveFilteredRangeMetrics(customerChannel, state.data),
    [customerChannel, state.data],
  );
  const statusText = state.error
    ? state.error
    : isInitialLoad
      ? "Loading live Woo order data..."
      : state.loading
      ? "Refreshing live Woo order data..."
      : "Live Woo order data";

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="pb-3 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#8087E8]/30 bg-[#8087E8]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#8087E8]">
            {REVENUE_CUSTOMER_CHANNEL_LABELS[customerChannel]}
          </span>
          <span className="text-xs text-muted-foreground">{statusText}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4 pt-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] rounded-lg border border-dashed bg-muted/40 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Customer Channel
            </p>
            <p className="text-sm font-semibold">
              {REVENUE_CUSTOMER_CHANNEL_LABELS[customerChannel]}
            </p>
          </div>
          <TogglePills
            options={REVENUE_RANGE_OPTIONS}
            value={range}
            onChange={onRangeChange}
          />
          <Select
            value={salesChannel}
            onValueChange={(value) => onSalesChannelChange(value as RevenueSalesChannel)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Sales channel" />
            </SelectTrigger>
            <SelectContent>
              {SALES_CHANNEL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MiniStat
            label={`${REVENUE_RANGE_LABELS[range]} Revenue`}
            value={isInitialLoad ? "—" : fmtRevenueThousands(metrics.rangeRevenue)}
            sub={metrics.visibleMonthsLabel}
          />
          <MiniStat
            label={`${REVENUE_RANGE_LABELS[range]} Orders`}
            value={isInitialLoad ? "—" : metrics.rangeOrders.toLocaleString("en-US")}
            sub={REVENUE_SALES_CHANNEL_LABELS[salesChannel]}
          />
          <MiniStat
            label="Avg Order Value"
            value={isInitialLoad ? "—" : fmtCurrency(metrics.avgOrderValue)}
            sub={`${REVENUE_RANGE_LABELS[range]} range`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SalesforceFilteredPerformanceCard({
  customerChannel,
  range,
  salesChannel,
  state,
}: {
  customerChannel: RevenueCustomerChannel;
  range: RevenueRange;
  salesChannel: RevenueSalesChannel;
  state: SalesforceRevenueState;
}) {
  const metrics = React.useMemo(
    () => resolveFilteredRangeMetrics(customerChannel, state.data),
    [customerChannel, state.data],
  );
  const months = metrics.months;
  const monthlyRevenue = metrics.monthlyRevenue;
  const isInitialLoad = state.loading && !state.data && !state.error;
  const rangeDailyLabels = state.data?.rangeDailyLabels ?? [];
  const useDailyCharts = range === "30d" && rangeDailyLabels.length > 0;
  const chartCategories = useDailyCharts ? rangeDailyLabels : months;
  const chartRevenue = React.useMemo(
    () => (useDailyCharts ? (state.data?.rangeDailyRevenue ?? []) : monthlyRevenue),
    [monthlyRevenue, state.data?.rangeDailyRevenue, useDailyCharts],
  );
  const formatRevenueValue = React.useCallback(
    (value: number) => (useDailyCharts ? fmtCurrency(value) : fmtRevenueThousands(value)),
    [useDailyCharts],
  );
  const orderTypeRevenueSeries = React.useMemo(
    () =>
      Object.entries(
        useDailyCharts
          ? (state.data?.rangeDailyOrderTypeRevenue ?? {})
          : (state.data?.orderTypeRevenue ?? {}),
      )
        .filter(([, values]) => values.length > 0)
        .map(([orderType, values], index) => ({
          type: "column" as const,
          name: ORDER_TYPE_LABELS[orderType as keyof typeof ORDER_TYPE_LABELS] ?? orderType,
          data: values,
          color: chartColor(index),
        })),
    [state.data, useDailyCharts],
  );
  const hasData =
    chartCategories.length > 0 &&
    (chartRevenue.some((value) => value > 0) ||
      orderTypeRevenueSeries.some((series) => series.data.some((value) => value > 0)));
  const statusText = state.error
    ? state.error
    : isInitialLoad
      ? "Loading filtered Woo order data..."
      : state.loading
      ? "Refreshing filtered Woo order data..."
      : "Live filtered Woo order data";

  const monthlyRevenueOptions = React.useMemo(
    () =>
      createBaseChartOptions({
        chart: { type: "areaspline", animation: false, height: 260 },
        xAxis: {
          categories: chartCategories,
          tickLength: 0,
          tickInterval: useDailyCharts ? 1 : undefined,
          labels: {
            style: {
              fontSize: useDailyCharts ? "10px" : "11px",
            },
          },
        },
        yAxis: {
          title: { text: "" },
          labels: {
            formatter: function () {
              return formatRevenueValue(Number(this.value));
            },
          },
        },
        tooltip: {
          formatter: function () {
            return `<b>${String(this.x)}</b><br/>Revenue: <b>${formatRevenueValue(Number(this.y))}</b>`;
          },
        },
        legend: { enabled: false },
        plotOptions: {
          areaspline: { fillOpacity: 0.08, lineWidth: 2.5, marker: { radius: 3 } },
        },
        series: [
          {
            type: "areaspline",
            name: "Revenue",
            data: chartRevenue,
            color: chartColor(0),
          },
        ],
      }),
    [chartCategories, chartRevenue, formatRevenueValue, useDailyCharts],
  );

  const orderTypeRevenueOptions = React.useMemo(
    () =>
      createBaseChartOptions({
        chart: { type: "column", animation: false, height: 260 },
        xAxis: {
          categories: chartCategories,
          tickLength: 0,
          tickInterval: useDailyCharts ? 1 : undefined,
          labels: {
            style: {
              fontSize: useDailyCharts ? "10px" : "11px",
            },
          },
        },
        yAxis: {
          title: { text: "" },
          labels: {
            formatter: function () {
              return formatRevenueValue(Number(this.value));
            },
          },
        },
        tooltip: {
          shared: true,
          formatter: function () {
            const points = (this.points ?? []).filter((point) => point.y !== null && point.y !== undefined);
            const lines = points.map(
              (point) =>
                `<span style="color:${String(point.color)}">●</span> ${point.series.name}: <b>${formatRevenueValue(Number(point.y))}</b>`,
            );
            return `<b>${String(this.x)}</b><br/>${lines.join("<br/>")}`;
          },
        },
        legend: {
          enabled: true,
          align: "right",
          verticalAlign: "top",
          itemStyle: { fontSize: "11px", fontWeight: "600" },
        },
        plotOptions: {
          column: {
            stacking: "normal",
            borderWidth: 0,
            borderRadius: 3,
            pointPadding: useDailyCharts ? 0.02 : 0.08,
            groupPadding: useDailyCharts ? 0.04 : 0.1,
          },
        },
        series: orderTypeRevenueSeries,
      }),
    [chartCategories, formatRevenueValue, orderTypeRevenueSeries, useDailyCharts],
  );

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="pb-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Filtered Woo Order Performance
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {REVENUE_RANGE_LABELS[range]} · {REVENUE_SALES_CHANNEL_LABELS[salesChannel]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{statusText}</p>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4 pt-0">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat
            label="Latest Month Revenue"
            value={isInitialLoad ? "—" : fmtRevenueThousands(metrics.latestRevenue)}
            sub={metrics.latestMonthLabel}
          />
          <MiniStat
            label="Previous Month Revenue"
            value={
              isInitialLoad
                ? "—"
                : metrics.hasPreviousVisibleMonth
                  ? fmtRevenueThousands(metrics.previousRevenue)
                  : "—"
            }
            sub={metrics.previousMonthLabel}
          />
          <MiniStat
            label="Latest Month Orders"
            value={isInitialLoad ? "—" : Math.round(metrics.latestOrders).toLocaleString("en-US")}
            sub={metrics.latestMonthLabel}
          />
          <MiniStat
            label="Previous Month Orders"
            value={
              isInitialLoad
                ? "—"
                : metrics.hasPreviousVisibleMonth
                  ? Math.round(metrics.previousOrders).toLocaleString("en-US")
                  : "—"
            }
            sub={metrics.previousMonthLabel}
          />
        </div>

        {isInitialLoad ? (
          <div className="rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
            Loading Woo order charts for the selected filters...
          </div>
        ) : hasData ? (
          <div
            className={cn(
              "grid gap-4 xl:grid-cols-2 transition-opacity duration-300",
              state.loading ? "opacity-60" : "opacity-100",
            )}
          >
            <Card className="gap-0 py-0">
              <CardHeader className="pb-0 pt-4">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {useDailyCharts ? "Revenue by Day" : "Revenue by Month"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pr-4 pb-4">
                <div className="h-[260px]">
                  <DashboardHighchart options={monthlyRevenueOptions} />
                </div>
              </CardContent>
            </Card>

            <Card className="gap-0 py-0">
              <CardHeader className="pb-0 pt-4">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {useDailyCharts ? "Daily Revenue by Order Type" : "Revenue by Order Type"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pr-4 pb-4">
                <div className="h-[260px]">
                  <DashboardHighchart options={orderTypeRevenueOptions} />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
            No Woo order data is available for the selected filters yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Period panels (the big side-by-side MTD / YTD blocks) ───────────────────

function PeriodPanel({
  variant,
  kpis,
  date,
  revenueSub,
  ordersValue,
  ordersSub,
}: {
  variant: "mtd" | "ytd";
  kpis: typeof mtdKpis;
  date: string;
  revenueSub: string;
  ordersValue: number;
  ordersSub: string;
}) {
  const isMtd = variant === "mtd";
  const accentColor = isMtd ? "#8087E8" : "#A3EDBA";
  const label = isMtd ? "Month to Date" : "Year to Date";

  return (
    <div
      className="rounded-xl border bg-card shadow-sm"
      style={{ borderTopWidth: 3, borderTopColor: accentColor }}
    >
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <PeriodBadge label={isMtd ? "MTD" : "YTD"} variant={variant} />
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{date}</span>
          <span className={cn("text-xs font-bold", kpis.yoyPct >= 0 ? "text-emerald-500" : "text-red-500")}>
            {fmtPct(kpis.yoyPct)} YoY
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 px-3 pb-4">
        <MiniStat label="Revenue" value={fmtCurrency(kpis.revenueMtd)} sub={revenueSub} />
        <MiniStat label="Orders" value={ordersValue.toString()} sub={ordersSub} positive />
        <MiniStat label="Avg Order Value" value={fmtCurrency(kpis.avgOrderValue)} sub="Per transaction" />
        <MiniStat label="Monthly Forecast" value={fmtCurrency(kpis.forecastMonthly)} sub="Projected month-end" />
      </div>
    </div>
  );
}

// ─── Geo Overview Dashboard (Map tab) ─────────────────────────────────────────

const GEO_KPI_CARDS = [
  {
    label:    "Active Users",
    value:    "2,450",
    change:   "+18.2%",
    positive: true,
    sub:      "Growing steadily",
    detail:   "Active users in the last 30 days",
  },
  {
    label:    "New Subscriptions",
    value:    "2,145",
    change:   "+6.4%",
    positive: true,
    sub:      "Slightly up",
    detail:   "New signups this week",
  },
  {
    label:    "Churn Rate",
    value:    "2.1%",
    change:   "-1.2%",
    positive: true,
    sub:      "Improving",
    detail:   "Churn rate compared to last month",
  },
  {
    label:    "Revenue",
    value:    "$12,450",
    change:   "+50.6%",
    positive: true,
    sub:      "Above target",
    detail:   "Total revenue this month",
  },
];

const GEO_CONTINENTS  = ["North America", "Europe", "Asia", "Oceania", "Other"];
const GEO_PREV_YEAR   = [8400, 5900, 6200, 1800, 1100];
const GEO_CURR_YEAR   = [9100, 6500, 7800, 2100, 1400];

const GEO_PROJECTS = [
  { name: "E-commerce Platform",  framework: "Next 4", status: "Production",  deploy: "2 hours ago"   },
  { name: "Developer Portfolio",  framework: "Next 3", status: "Production",  deploy: "1 day ago"     },
  { name: "SaaS Dashboard",       framework: "Next 3", status: "Staging",     deploy: "6 hours ago"   },
  { name: "Internal Admin Tool",  framework: "Next 4", status: "Development", deploy: "Just now"      },
  { name: "Legacy Blog",          framework: "Next 4", status: "Archived",    deploy: "6 months ago"  },
];

const STATUS_COLORS: Record<string, string> = {
  Production:   "#00e5a0",
  Staging:      "#f59e0b",
  Development:  "#6366f1",
  Archived:     "#6b7280",
};

type EntityStatus = "active" | "absent" | "at-risk" | "new";

interface KpiEntity {
  title: string;
  tags: string[];
  status: EntityStatus;
}

interface KpiDetailData {
  status: string;
  statusColor: string;
  statusBg: string;
  count: number;
  rate: string;
  entities: KpiEntity[];
}

const KPI_DETAIL_DATA: Record<string, KpiDetailData> = {
  "Active Users": {
    status: "Active",
    statusColor: "#059669",
    statusBg: "#d1fae5",
    count: 2450,
    rate: "18.2% growth rate",
    entities: [
      { title: "Enterprise accounts — North America",        tags: ["enterprise", "direct", "north america"],     status: "active"  },
      { title: "SMB segment — Western Europe",               tags: ["smb", "channel partner", "europe"],          status: "active"  },
      { title: "Mid-market — APAC region",                   tags: ["mid-market", "direct", "apac"],              status: "active"  },
      { title: "Startup cohort — Silicon Valley",            tags: ["startup", "new", "direct"],                  status: "new"     },
      { title: "Enterprise accounts — UK & Ireland",         tags: ["enterprise", "direct", "europe"],            status: "active"  },
      { title: "Developer community users",                  tags: ["developer", "freemium", "general"],          status: "active"  },
      { title: "Agency accounts — EMEA",                     tags: ["agency", "channel partner", "emea"],         status: "active"  },
      { title: "E-commerce segment",                         tags: ["e-commerce", "smb", "direct"],               status: "new"     },
      { title: "SaaS companies — Series A+",                 tags: ["saas", "enterprise", "direct"],              status: "active"  },
      { title: "Consulting firms — APAC",                    tags: ["consulting", "channel partner", "apac"],     status: "active"  },
      { title: "Fintech vertical",                           tags: ["fintech", "enterprise", "regulated"],        status: "active"  },
      { title: "Healthcare providers",                       tags: ["healthcare", "enterprise", "regulated"],     status: "absent"  },
    ],
  },
  "New Subscriptions": {
    status: "New",
    statusColor: "#2563eb",
    statusBg: "#dbeafe",
    count: 2145,
    rate: "+6.4% vs last week",
    entities: [
      { title: "Direct online signups — homepage",           tags: ["new", "direct", "organic"],                  status: "new"     },
      { title: "Channel partner referrals — US",             tags: ["new", "channel partner", "us"],              status: "new"     },
      { title: "Trial-to-paid conversions",                  tags: ["upgrade", "trial", "direct"],                status: "active"  },
      { title: "Inbound leads — Google Ads",                 tags: ["new", "paid", "inbound"],                    status: "new"     },
      { title: "Event-sourced signups — Q1 conference",      tags: ["new", "event", "enterprise"],                status: "new"     },
      { title: "Partner marketplace — AWS",                  tags: ["new", "marketplace", "aws"],                 status: "new"     },
      { title: "Outbound SDR-sourced deals",                 tags: ["new", "outbound", "direct"],                 status: "new"     },
      { title: "Webinar registrant conversions",             tags: ["new", "content", "inbound"],                 status: "active"  },
      { title: "Referral program activations",               tags: ["new", "referral", "viral"],                  status: "new"     },
      { title: "Free tier → Pro upgrades",                   tags: ["upgrade", "product-led", "self-serve"],      status: "active"  },
      { title: "Enterprise pilots going live",               tags: ["new", "enterprise", "direct"],               status: "absent"  },
    ],
  },
  "Churn Rate": {
    status: "At Risk",
    statusColor: "#dc2626",
    statusBg: "#fee2e2",
    count: 51,
    rate: "2.1% monthly churn",
    entities: [
      { title: "SMB accounts — price sensitivity",           tags: ["smb", "downgrade", "price"],                 status: "at-risk" },
      { title: "Annual renewals due — Q1",                   tags: ["renewal", "enterprise", "at-risk"],          status: "at-risk" },
      { title: "Low-engagement freemium users",              tags: ["freemium", "low-usage", "smb"],              status: "absent"  },
      { title: "Single-seat accounts — no expansion",        tags: ["smb", "no-expansion", "direct"],             status: "at-risk" },
      { title: "Competitive displacement — EMEA",            tags: ["enterprise", "competitive", "emea"],         status: "at-risk" },
      { title: "Support escalations unresolved",             tags: ["smb", "support", "at-risk"],                 status: "absent"  },
      { title: "Billing failures — card expired",            tags: ["smb", "billing", "involuntary"],             status: "at-risk" },
      { title: "Onboarding incomplete — cohort Feb",         tags: ["new", "onboarding", "smb"],                  status: "absent"  },
      { title: "Contract end — channel partner accounts",    tags: ["channel partner", "renewal", "mid-market"],  status: "at-risk" },
    ],
  },
  "Revenue": {
    status: "Above Target",
    statusColor: "#059669",
    statusBg: "#d1fae5",
    count: 12450,
    rate: "+50.6% vs target",
    entities: [
      { title: "Acme Corp — enterprise renewal",             tags: ["renewal", "enterprise", "direct"],           status: "active"  },
      { title: "GlobalTech — platform expansion",            tags: ["upgrade", "enterprise", "direct"],           status: "active"  },
      { title: "Meridian Partners — new logo",               tags: ["new", "mid-market", "channel partner"],      status: "new"     },
      { title: "Vertex Solutions — Q1 close",                tags: ["new", "enterprise", "outbound"],             status: "active"  },
      { title: "NovaBridge — multi-year deal",               tags: ["new", "enterprise", "direct"],               status: "active"  },
      { title: "Sunstone Retail — SMB bundle",               tags: ["new", "smb", "channel partner"],             status: "new"     },
      { title: "DataCore Systems — upgrade",                 tags: ["upgrade", "mid-market", "direct"],           status: "active"  },
      { title: "Pinnacle Group — renewal at-risk",           tags: ["renewal", "enterprise", "at-risk"],          status: "at-risk" },
      { title: "CloudNine — expansion seats",                tags: ["upgrade", "smb", "self-serve"],              status: "active"  },
      { title: "Sterling Financial — new pilot",             tags: ["new", "enterprise", "fintech"],              status: "new"     },
      { title: "Harbour Digital — lapsed account",           tags: ["renewal", "smb", "lapsed"],                  status: "absent"  },
      { title: "Apex Media — channel close",                 tags: ["new", "mid-market", "channel partner"],      status: "active"  },
    ],
  },
};

const ENTITY_STATUS_STYLE: Record<EntityStatus, { bg: string; color: string }> = {
  active:   { bg: "#d1fae5", color: "#059669" },
  new:      { bg: "#dbeafe", color: "#2563eb" },
  "at-risk":{ bg: "#fee2e2", color: "#dc2626" },
  absent:   { bg: "#fee2e2", color: "#dc2626" },
};

const STACKED_AREA_PLOT_OPTIONS = {
  areaspline: {
    stacking: "normal" as const,
    fillOpacity: 0.25,
    lineWidth: 2,
    marker: { radius: 0 },
  },
};

export function GeoOverviewDashboard() {
  const { resolvedTheme } = useTheme() as { resolvedTheme: string | undefined };
  const dark = resolvedTheme === "dark";

  // Theme-aware semantic tokens
  const t = dark
    ? {
        pageBg:     "var(--background)",
        cardBg:     "var(--card)",
        border:     "var(--border)",
        fg:         "var(--foreground)",
        muted:      "var(--muted-foreground)",
        accent:     "#00e5a0",
        accentDim:  "#1e3a32",
        chartBg:    "#0e1829",
        gridLine:   "#1e2d45",
        tooltipBg:  "#131f33",
        tooltipBdr: "#1e2d45",
        tooltipFg:  "#f1f5f9",
        badgeBg:    "var(--muted)",
        badgeBdr:   "var(--border)",
        badgeFg:    "var(--muted-foreground)",
        rowBdr:     "var(--border)",
      }
    : {
        pageBg:     "var(--background)",
        cardBg:     "var(--card)",
        border:     "var(--border)",
        fg:         "var(--foreground)",
        muted:      "var(--muted-foreground)",
        accent:     "#059669",
        accentDim:  "#d1fae5",
        chartBg:    "#ffffff",
        gridLine:   "#e2e8f0",
        tooltipBg:  "#ffffff",
        tooltipBdr: "#e2e8f0",
        tooltipFg:  "#0f172a",
        badgeBg:    "var(--muted)",
        badgeBdr:   "var(--border)",
        badgeFg:    "var(--muted-foreground)",
        rowBdr:     "var(--border)",
      };

  const revenueChartOptions = React.useMemo((): Highcharts.Options => createBaseChartOptions({
    chart: {
      type: "bar",
      backgroundColor: t.chartBg,
      spacing: [16, 16, 16, 8],
    },
    title: { text: undefined },
    // xAxis = categories axis → rendered on the LEFT (continents)
    xAxis: {
      categories: GEO_CONTINENTS,
      labels: {
        style: { color: t.fg, fontSize: "12px", fontWeight: "500" },
        align: "right",
      },
      lineColor: "transparent",
      tickColor: "transparent",
    },
    // yAxis = value axis → rendered at the BOTTOM
    yAxis: {
      title: { text: undefined },
      labels: {
        style: { color: t.muted, fontSize: "10px" },
        formatter() {
          const v = this.value as number;
          return v === 0 ? "$0" : `$${(v / 1000).toFixed(0)}K`;
        },
      },
      gridLineColor: t.gridLine,
      gridLineDashStyle: "Dash",
    },
    legend: {
      enabled: true,
      align: "left",
      verticalAlign: "top",
      itemStyle: { color: t.muted, fontSize: "11px", fontWeight: "400" },
      itemHoverStyle: { color: t.fg },
      symbolRadius: 10,
      symbolHeight: 10,
      symbolWidth: 10,
    },
    tooltip: {
      backgroundColor: t.tooltipBg,
      borderColor: t.tooltipBdr,
      borderRadius: 8,
      style: { color: t.tooltipFg, fontSize: "12px" },
      shared: true,
      formatter() {
        const pts = this.points ?? [];
        const rows = pts.map((p) => `<span style="color:${p.color}">●</span> ${p.series.name}: <b>$${(p.y as number).toLocaleString()}</b>`).join("<br/>");
        return `<b>${this.x}</b><br/>${rows}`;
      },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        groupPadding: 0.15,
        pointPadding: 0.05,
      },
    },
    series: [
      { type: "bar", name: "2025", data: GEO_PREV_YEAR, color: dark ? "#2a3a5c" : "#c8d4e4" },
      { type: "bar", name: "2026", data: GEO_CURR_YEAR, color: t.accent },
    ],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [dark]);

  const [activeKpi, setActiveKpi] = React.useState<string | null>(null);
  const activeDetail = activeKpi ? KPI_DETAIL_DATA[activeKpi] : null;

  const card: React.CSSProperties = {
    background: t.cardBg,
    border: `1px solid ${t.border}`,
    borderRadius: 10,
  };

  return (
    <div style={{ background: t.pageBg, padding: "20px 0" }}>

      {/* KPI detail sheet */}
      <Sheet open={!!activeKpi} onOpenChange={(open) => !open && setActiveKpi(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col gap-0"
          style={{ background: t.cardBg, borderLeft: `1px solid ${t.border}` }}
        >
          {activeDetail && (
            <>
              {/* Sheet header */}
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: `1px solid ${t.border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    background: activeDetail.statusBg,
                    color: activeDetail.statusColor,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: 5,
                  }}
                >
                  {activeDetail.status}
                </span>
                <span style={{ color: t.fg, fontWeight: 600, fontSize: 14 }}>
                  {activeDetail.count.toLocaleString()} entities
                </span>
                <span style={{ color: t.muted, fontSize: 12, marginLeft: 2 }}>
                  · {activeDetail.rate}
                </span>
              </div>

              {/* Entity list */}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {activeDetail.entities.map((entity, i) => {
                  const es = ENTITY_STATUS_STYLE[entity.status];
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "13px 20px",
                        borderBottom: i < activeDetail.entities.length - 1 ? `1px solid ${t.border}` : "none",
                        cursor: "pointer",
                        transition: "background 0.1s",
                      }}
                      className="hover:bg-muted/40"
                    >
                      {/* Status icon */}
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 7,
                          background: es.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ color: es.color, fontSize: 14, fontWeight: 700, lineHeight: 1 }}>—</span>
                      </div>

                      {/* Title + tags */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            color: t.fg,
                            fontSize: 13,
                            fontWeight: 500,
                            margin: 0,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {entity.title}
                        </p>
                        <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
                          {entity.tags.map((tag) => (
                            <span
                              key={tag}
                              style={{
                                background: t.badgeBg,
                                border: `1px solid ${t.badgeBdr}`,
                                borderRadius: 4,
                                padding: "1px 7px",
                                fontSize: 11,
                                color: t.muted,
                                fontWeight: 500,
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Arrow */}
                      <span style={{ color: t.muted, fontSize: 16, flexShrink: 0 }}>→</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {GEO_KPI_CARDS.map((kpi) => (
          <div
            key={kpi.label}
            onClick={() => setActiveKpi(kpi.label)}
            style={{
              ...card,
              padding: "16px 18px",
              cursor: "pointer",
              transition: "box-shadow 0.15s, transform 0.1s",
            }}
            className="hover:shadow-md hover:-translate-y-0.5"
          >
            <p style={{ color: t.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
              {kpi.label}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <p style={{ color: t.fg, fontSize: 26, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                {kpi.value}
              </p>
              <span style={{ color: kpi.positive ? t.accent : "#f87171", fontSize: 11, fontWeight: 600 }}>
                {kpi.positive ? "↑" : "↓"} {kpi.change}
              </span>
            </div>
            <p style={{ color: t.accent, fontSize: 11, margin: "4px 0 0", fontWeight: 500 }}>
              {kpi.sub} ↗
            </p>
            <p style={{ color: t.muted, fontSize: 11, margin: "2px 0 0" }}>
              {kpi.detail}
            </p>
          </div>
        ))}
      </div>

      {/* Map + Revenue chart row — tall enough for the map to shine */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mb-5" style={{ height: 440 }}>
        {/* Map — 3/5 */}
        <div className="lg:col-span-3" style={{ minHeight: 340 }}>
          <WorldMap />
        </div>

        {/* Revenue Summary — 2/5 */}
        <div
          className="lg:col-span-2"
          style={{ ...card, padding: "16px 18px", display: "flex", flexDirection: "column" }}
        >
          <div className="mb-2">
            <p style={{ color: t.fg, fontWeight: 600, fontSize: 14, margin: 0 }}>Revenue Summary</p>
            <p style={{ color: t.muted, fontSize: 12, margin: 0, marginTop: 2 }}>Monthly comparison</p>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <DashboardHighchart options={revenueChartOptions} />
          </div>
        </div>
      </div>

      {/* Projects table */}
      <div style={{ ...card, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${t.border}` }}>
              {["Project Name", "Framework", "Status", "Last Deployment"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 16px",
                    textAlign: "left",
                    color: t.muted,
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GEO_PROJECTS.map((p, i) => (
              <tr
                key={p.name}
                style={{ borderBottom: i < GEO_PROJECTS.length - 1 ? `1px solid ${t.rowBdr}` : "none" }}
              >
                <td style={{ padding: "11px 16px", color: t.fg, fontSize: 13, fontWeight: 500 }}>
                  {p.name}
                </td>
                <td style={{ padding: "11px 16px" }}>
                  <span
                    style={{
                      background: t.badgeBg,
                      border: `1px solid ${t.badgeBdr}`,
                      borderRadius: 4,
                      padding: "2px 7px",
                      color: t.badgeFg,
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    {p.framework}
                  </span>
                </td>
                <td style={{ padding: "11px 16px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: STATUS_COLORS[p.status] ?? t.muted, fontSize: 12, fontWeight: 500 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLORS[p.status] ?? t.muted, display: "inline-block" }} />
                    {p.status}
                  </span>
                </td>
                <td style={{ padding: "11px 16px", color: t.muted, fontSize: 12 }}>
                  {p.deploy}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function DailyScorecardsView({
  initialRevenueData = null,
  initialTodaySummaryData = null,
}: {
  initialRevenueData?: SfRevenueResponse | null;
  initialTodaySummaryData?: SfTodaySummaryResponse | null;
}) {
  const [activeTab, setActiveTab] = React.useState<ScorecardTab>("main");
  const [country, setCountry] = React.useState<Country>("All Countries");
  const [period, setPeriod] = React.useState<"mtd" | "ytd">("mtd");
  const [trendGranularity, setTrendGranularity] = React.useState<"day" | "week" | "quarter">("day");
  const [showLastYear, setShowLastYear] = React.useState(false);
  const [ordersPeriod, setOrdersPeriod] = React.useState<"mtd" | "ytd">("mtd");
  const [directRange, setDirectRange] = React.useState<RevenueRange>(DEFAULT_REVENUE_RANGE);
  const [partnerRange, setPartnerRange] = React.useState<RevenueRange>(DEFAULT_REVENUE_RANGE);
  const [directSalesChannel, setDirectSalesChannel] = React.useState<RevenueSalesChannel>(DEFAULT_REVENUE_SALES_CHANNEL);
  const [partnerSalesChannel, setPartnerSalesChannel] = React.useState<RevenueSalesChannel>(DEFAULT_REVENUE_SALES_CHANNEL);
  const [mapInterval, setMapInterval] = React.useState<ScorecardMapInterval>(DEFAULT_SCORECARD_MAP_INTERVAL);
  const [mapCustomerChannel, setMapCustomerChannel] = React.useState<RevenueCustomerChannel>(DEFAULT_REVENUE_CUSTOMER_CHANNEL);
  const [mapSalesChannel, setMapSalesChannel] = React.useState<RevenueSalesChannel>(DEFAULT_REVENUE_SALES_CHANNEL);
  const [historicalCustomerChannel, setHistoricalCustomerChannel] = React.useState<RevenueCustomerChannel>(DEFAULT_REVENUE_CUSTOMER_CHANNEL);
  const [historicalDateRange, setHistoricalDateRange] = React.useState<DateRange>(() => buildDefaultHistoricalDateRange());
  const [dealsCustomerChannel, setDealsCustomerChannel] = React.useState<RevenueCustomerChannel>(DEFAULT_REVENUE_CUSTOMER_CHANNEL);
  const [dealsSalesChannel, setDealsSalesChannel] = React.useState<RevenueSalesChannel>(DEFAULT_REVENUE_SALES_CHANNEL);
  const { data: sfData, loading: sfLoading, error: sfError } = useSalesforceRevenue("12m", {
    customerChannel: "all",
    initialData: initialRevenueData,
  });
  const todaySummaryState = useScorecardTodaySummary({
    initialData: initialTodaySummaryData,
  });
  const arrState = useScorecardArr({
    enabled: activeTab === "arr",
  });
  const directRevenueState = useSalesforceRevenue(directRange, {
    customerChannel: "Direct Sales",
    salesChannel: directSalesChannel,
    enabled: activeTab === "direct",
  });
  const directChannelDashboardState = useScorecardChannelDashboard({
    customerChannel: "Direct Sales",
    range: directRange,
    salesChannel: directSalesChannel,
    enabled: activeTab === "direct",
  });
  const partnerRevenueState = useSalesforceRevenue(partnerRange, {
    customerChannel: "Channel Partner Sales",
    salesChannel: partnerSalesChannel,
    enabled: activeTab === "channel-partner",
  });
  const partnerChannelDashboardState = useScorecardChannelDashboard({
    customerChannel: "Channel Partner Sales",
    range: partnerRange,
    salesChannel: partnerSalesChannel,
    enabled: activeTab === "channel-partner",
  });
  const mapState = useScorecardMap({
    interval: mapInterval,
    customerChannel: mapCustomerChannel,
    salesChannel: mapSalesChannel,
    enabled: activeTab === "map",
  });
  const historicalWindow = React.useMemo(
    () => ({
      from: formatDateOnlyLocal(historicalDateRange.from ?? HISTORICAL_RANGE_START),
      to: formatDateOnlyLocal(historicalDateRange.to ?? historicalDateRange.from ?? new Date()),
    }),
    [historicalDateRange],
  );
  const historicalMonthlyState = useScorecardHistoricalMonthlyData({
    from: historicalWindow.from,
    to: historicalWindow.to,
  }, {
    customerChannel: historicalCustomerChannel,
    enabled: activeTab === "historical",
  });
  const topDealsState = useScorecardTopDeals({
    customerChannel: dealsCustomerChannel,
    salesChannel: dealsSalesChannel,
    enabled: activeTab === "top-deals",
  });

  const sfMonths = React.useMemo(
    () => sfData?.months ?? [],
    [sfData],
  );
  const scorecardAsOfDate = React.useMemo(
    () => parseDateOnlyUtc(sfData?.asOfDate ?? new Date().toISOString().slice(0, 10)),
    [sfData?.asOfDate],
  );
  const currentYear = scorecardAsOfDate.getUTCFullYear();
  const previousYear = currentYear - 1;
  const currentMonthIndex = scorecardAsOfDate.getUTCMonth();
  const currentMonthShort = scorecardAsOfDate.toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  const fullMonthDayCount = new Date(Date.UTC(currentYear, currentMonthIndex + 1, 0)).getUTCDate();
  const fallbackMtdDayCount = Math.min(
    scorecardAsOfDate.getUTCDate(),
    DAILY_ACTUAL.length,
    DAILY_ACTUAL_LAST_YEAR.length,
    DAILY_ORDERS_THIS_YEAR.length,
    DAILY_ORDERS_LAST_YEAR.length,
  );
  const liveCurrentMonthDailyRevenue = React.useMemo(
    () => sfData?.currentMonthDailyRevenue ?? [],
    [sfData?.currentMonthDailyRevenue],
  );
  const livePriorYearMonthDailyRevenue = React.useMemo(
    () => sfData?.priorYearMonthDailyRevenue ?? [],
    [sfData?.priorYearMonthDailyRevenue],
  );
  const liveCurrentMonthDailyOrders = React.useMemo(
    () => sfData?.currentMonthDailyOrders ?? [],
    [sfData?.currentMonthDailyOrders],
  );
  const livePriorYearMonthDailyOrders = React.useMemo(
    () => sfData?.priorYearMonthDailyOrders ?? [],
    [sfData?.priorYearMonthDailyOrders],
  );
  const actualRevenueCumulative = React.useMemo(
    () =>
      liveCurrentMonthDailyRevenue.length > 0
        ? toCumulativeSeries(liveCurrentMonthDailyRevenue)
        : DAILY_ACTUAL.slice(0, fallbackMtdDayCount),
    [fallbackMtdDayCount, liveCurrentMonthDailyRevenue],
  );
  const lastYearRevenueCumulative = React.useMemo(
    () =>
      livePriorYearMonthDailyRevenue.length > 0
        ? toCumulativeSeries(livePriorYearMonthDailyRevenue)
        : DAILY_ACTUAL_LAST_YEAR.slice(0, fallbackMtdDayCount),
    [fallbackMtdDayCount, livePriorYearMonthDailyRevenue],
  );
  const currentOrdersCumulative = React.useMemo(
    () =>
      liveCurrentMonthDailyOrders.length > 0
        ? toCumulativeSeries(liveCurrentMonthDailyOrders)
        : DAILY_ORDERS_THIS_YEAR.slice(0, fallbackMtdDayCount),
    [fallbackMtdDayCount, liveCurrentMonthDailyOrders],
  );
  const priorOrdersCumulative = React.useMemo(
    () =>
      livePriorYearMonthDailyOrders.length > 0
        ? toCumulativeSeries(livePriorYearMonthDailyOrders)
        : DAILY_ORDERS_LAST_YEAR.slice(0, fallbackMtdDayCount),
    [fallbackMtdDayCount, livePriorYearMonthDailyOrders],
  );
  const liveMonthlyOrderTotals = React.useMemo(
    () => sumSeriesMapValues(sfData?.orderTypeCount ?? {}),
    [sfData?.orderTypeCount],
  );
  const mtdRevenueValue = React.useMemo(
    () =>
      liveCurrentMonthDailyRevenue.length > 0
        ? sumValues(liveCurrentMonthDailyRevenue)
        : (actualRevenueCumulative.at(-1) ?? mtdKpis.revenueMtd),
    [actualRevenueCumulative, liveCurrentMonthDailyRevenue],
  );
  const mtdOrdersValue = React.useMemo(
    () =>
      liveCurrentMonthDailyOrders.length > 0
        ? sumValues(liveCurrentMonthDailyOrders)
        : (currentOrdersCumulative.at(-1) ?? ordersCustomersKpis.ordersMtd),
    [currentOrdersCumulative, liveCurrentMonthDailyOrders],
  );
  const ytdRevenueValue = React.useMemo(
    () => (sfData ? Math.round(sfData.ytdTotal * 1_000_000) : ytdKpis.revenueYtd),
    [sfData],
  );
  const ytdOrdersValue = React.useMemo(
    () =>
      sfData
        ? sumMonthlySeriesForYear(sfMonths, liveMonthlyOrderTotals, currentYear)
        : ordersCustomersKpis.ordersYtd,
    [currentYear, liveMonthlyOrderTotals, sfData, sfMonths],
  );
  const mtdAvgOrderValue = mtdOrdersValue > 0 ? mtdRevenueValue / mtdOrdersValue : mtdKpis.avgOrderValue;
  const ytdAvgOrderValue = ytdOrdersValue > 0 ? ytdRevenueValue / ytdOrdersValue : ytdKpis.avgOrderValue;
  const liveMtdPanelKpis = React.useMemo(
    () => ({
      ...mtdKpis,
      revenueMtd: mtdRevenueValue,
      avgOrderValue: mtdAvgOrderValue,
      forecastMonthly:
        actualRevenueCumulative.length > 0
          ? Math.round((mtdRevenueValue / actualRevenueCumulative.length) * fullMonthDayCount)
          : mtdKpis.forecastMonthly,
    }),
    [actualRevenueCumulative.length, fullMonthDayCount, mtdAvgOrderValue, mtdRevenueValue],
  );
  const liveYtdPanelKpis = React.useMemo(
    () => ({
      ...ytdKpis,
      revenueMtd: ytdRevenueValue,
      revenueYtd: ytdRevenueValue,
      avgOrderValue: ytdAvgOrderValue,
    }),
    [ytdAvgOrderValue, ytdRevenueValue],
  );
  const targetSummary = React.useMemo(
    () => resolveSalesTargetSummary(sfMonths),
    [sfMonths],
  );

  const mtdBenchmarks = React.useMemo<TargetBenchmark[]>(
    () => {
      if (!sfData) {
        return TARGET_BENCHMARKS;
      }

      return buildSalesTargetBenchmarks(
        mtdRevenueValue,
        targetSummary.month.total,
        targetSummary.month.toDate,
      );
    },
    [mtdRevenueValue, sfData, targetSummary],
  );

  const ytdBenchmarks = React.useMemo<TargetBenchmark[]>(
    () => {
      if (!sfData) {
        return YTD_TARGET_BENCHMARKS;
      }

      return buildSalesTargetBenchmarks(
        ytdRevenueValue,
        targetSummary.ytd.total,
        targetSummary.ytd.toDate,
      );
    },
    [sfData, targetSummary, ytdRevenueValue],
  );

  const leaderboardBenchmarks = period === "mtd" ? mtdBenchmarks : ytdBenchmarks;
  const leaderboardStatusMessage = sfError
    ? "Using fallback targets"
    : sfLoading
      ? "Updating from Salesforce..."
      : "Gauge targets synced from Salesforce";
  const todaySnapshotStats = React.useMemo<TodayStat[]>(
    () => {
      const todaySummary = todaySummaryState.data;

      if (!todaySummary) {
        return TODAY_STATS;
      }

      return TODAY_STATS.map((stat) => {
        if (stat.label === "Today's Revenue") {
          return {
            ...stat,
            value: fmtCurrency(Math.round(todaySummary.totalRevenue)),
            diff: fmtSignedCurrency(Math.round(todaySummary.revenueDiff)),
            positive: todaySummary.revenueDiff >= 0,
          };
        }

        if (stat.label === "New Licences") {
          return {
            ...stat,
            value: todaySummary.newLicences.toLocaleString("en-US"),
            diff: fmtSignedInteger(todaySummary.newLicencesDiff),
            positive: todaySummary.newLicencesDiff >= 0,
          };
        }

        if (stat.label === "Renewals") {
          return {
            ...stat,
            value: todaySummary.renewals.toLocaleString("en-US"),
            diff: fmtSignedInteger(todaySummary.renewalsDiff),
            positive: todaySummary.renewalsDiff >= 0,
          };
        }

        if (stat.label === "Upgrades") {
          return {
            ...stat,
            value: todaySummary.upgrades.toLocaleString("en-US"),
            diff: fmtSignedInteger(todaySummary.upgradesDiff),
            positive: todaySummary.upgradesDiff >= 0,
          };
        }

        if (stat.label === "Avg Deal Size") {
          return {
            ...stat,
            value: fmtCurrency(Math.round(todaySummary.avgDealSize)),
            diff: fmtSignedCurrency(Math.round(todaySummary.avgDealSizeDiff)),
            positive: todaySummary.avgDealSizeDiff >= 0,
          };
        }

        if (stat.label === "Pipeline Added") {
          return {
            ...stat,
            value: fmtCurrency(Math.round(todaySummary.pipelineAdded)),
            diff: fmtSignedCurrency(Math.round(todaySummary.pipelineAddedDiff)),
            positive: todaySummary.pipelineAddedDiff >= 0,
          };
        }

        return stat;
      });
    },
    [todaySummaryState.data],
  );
  const mtdDayCount = actualRevenueCumulative.length;
  const dailyLabels = React.useMemo(
    () => buildMonthDayLabels(currentMonthShort, fullMonthDayCount),
    [currentMonthShort, fullMonthDayCount],
  );
  const mtdDateLabel = `${currentMonthShort} 1-${mtdDayCount}, ${currentYear}`;
  const mtdDateLabelCompact = `${currentMonthShort} 1-${mtdDayCount}`;
  const ytdDateLabel = `Jan 1-${currentMonthShort} ${mtdDayCount}, ${currentYear}`;
  const actualRevenueSeries = React.useMemo(
    () => padSeriesToLength(actualRevenueCumulative, fullMonthDayCount),
    [actualRevenueCumulative, fullMonthDayCount],
  );
  const lastYearRevenueSeries = React.useMemo(
    () => padSeriesToLength(lastYearRevenueCumulative, fullMonthDayCount),
    [fullMonthDayCount, lastYearRevenueCumulative],
  );
  const fullMonthBudgetPaceSeries = React.useMemo(
    () => Array.from({ length: fullMonthDayCount }, (_, i) => Math.round(DAILY_BUDGET_RATE * (i + 1))),
    [fullMonthDayCount],
  );
  const currentOrdersSeries = React.useMemo(
    () => padSeriesToLength(currentOrdersCumulative, fullMonthDayCount),
    [currentOrdersCumulative, fullMonthDayCount],
  );
  const priorOrdersSeries = React.useMemo(
    () => padSeriesToLength(priorOrdersCumulative, fullMonthDayCount),
    [fullMonthDayCount, priorOrdersCumulative],
  );

  // ── Daily Revenue: Budget vs Actual (cumulative) ───────────────────────

  const dailyBudgetVsActualOptions = React.useMemo(
    () =>
      createBaseChartOptions({
        chart: { type: "areaspline", animation: false, height: 320 },
        xAxis: { categories: dailyLabels, tickInterval: 4 },
        yAxis: {
          title: { text: "" },
          labels: {
            formatter: function () {
              return fmtCurrency(Number(this.value));
            },
          },
        },
        tooltip: {
          shared: true,
          formatter: function () {
            const pts = this.points ?? [];
            const lines = pts.map(
              (p) =>
                `<span style="color:${String(p.color)}">●</span> ${p.series.name}: <b>${fmtCurrency(Number(p.y))}</b>`,
            );
            return `<b>${String(this.x)}</b><br/>${lines.join("<br/>")}`;
          },
        },
        legend: {
          enabled: true,
          align: "right",
          verticalAlign: "top",
          itemStyle: { fontSize: "11px", fontWeight: "600" },
        },
        plotOptions: {
          areaspline: { fillOpacity: 0.08, lineWidth: 2.5, marker: { radius: 3 } },
        },
        series: [
          {
            type: "areaspline",
            name: "Actual Revenue",
            data: actualRevenueSeries,
            color: chartColor(1),
          },
          ...(showLastYear
            ? [
                {
                  type: "areaspline" as const,
                  name: "Last Year",
                  data: lastYearRevenueSeries,
                  color: "#F7A85E",
                  dashStyle: "ShortDash" as const,
                  fillOpacity: 0,
                },
              ]
            : []),
          {
            type: "areaspline",
            name: "Budget Pace",
            data: fullMonthBudgetPaceSeries,
            color: "#94a3b8",
            dashStyle: "ShortDash",
            fillOpacity: 0,
          },
        ],
      }),
    [actualRevenueSeries, dailyLabels, fullMonthBudgetPaceSeries, lastYearRevenueSeries, showLastYear],
  );

  // ── Cumulative Orders: This Year vs Last Year ─────────────────────────

  const cumulativeOrdersOptions = React.useMemo(
    () =>
      createBaseChartOptions({
        chart: { type: "areaspline", animation: false, height: 320 },
        xAxis: { categories: dailyLabels, tickInterval: 4 },
        yAxis: {
          title: { text: "" },
          labels: {
            formatter: function () {
              return String(this.value);
            },
          },
        },
        tooltip: {
          shared: true,
          formatter: function () {
            const pts = this.points ?? [];
            const lines = pts.map(
              (p) =>
                `<span style="color:${String(p.color)}">●</span> ${p.series.name}: <b>${Number(p.y)} orders</b>`,
            );
            return `<b>${String(this.x)}</b><br/>${lines.join("<br/>")}`;
          },
        },
        legend: {
          enabled: true,
          align: "right",
          verticalAlign: "top",
          itemStyle: { fontSize: "11px", fontWeight: "600" },
        },
        plotOptions: {
          areaspline: { fillOpacity: 0.08, lineWidth: 2.5, marker: { radius: 3 } },
        },
        series: [
          {
            type: "areaspline",
            name: `Orders ${currentYear}`,
            data: currentOrdersSeries,
            color: chartColor(0),
          },
          {
            type: "areaspline",
            name: `Orders ${previousYear}`,
            data: priorOrdersSeries,
            color: "#94a3b8",
            dashStyle: "ShortDash",
            fillOpacity: 0,
          },
        ],
      }),
    [currentOrdersSeries, currentYear, dailyLabels, previousYear, priorOrdersSeries],
  );

  // ── Orders by Type: stacked area (revenue + orders) ─────────────────────

  const orderTypeCumulativeData = ordersPeriod === "mtd" ? ORDER_TYPE_DAILY_MTD : ORDER_TYPE_DAILY_YTD;
  const orderTypeRevenueData = ordersPeriod === "mtd" ? ORDER_TYPE_REVENUE_MTD : ORDER_TYPE_REVENUE_YTD;

  const orderTypeOrdersOptions = React.useMemo(
    () =>
      createBaseChartOptions({
        chart: { type: "areaspline", animation: false, height: 320 },
        xAxis: { categories: dailyLabels, tickInterval: 4 },
        yAxis: {
          title: { text: "" },
          labels: { formatter: function () { return String(this.value); } },
        },
        tooltip: {
          shared: true,
          formatter: function () {
            const pts = this.points ?? [];
            const lines = pts.map(
              (p) => `<span style="color:${String(p.color)}">●</span> ${p.series.name}: <b>${Number(p.y)} orders</b>`,
            );
            return `<b>${String(this.x)}</b><br/>${lines.join("<br/>")}`;
          },
        },
        legend: { enabled: true, align: "right", verticalAlign: "top", itemStyle: { fontSize: "11px", fontWeight: "600" } },
        plotOptions: STACKED_AREA_PLOT_OPTIONS,
        series: [
          { type: "areaspline", name: "New", data: [...orderTypeCumulativeData.new], color: chartColor(0) },
          { type: "areaspline", name: "Renewal", data: [...orderTypeCumulativeData.renewal], color: chartColor(1) },
          { type: "areaspline", name: "Upgrade", data: [...orderTypeCumulativeData.upgrade], color: chartColor(2) },
          { type: "areaspline", name: "Downgrade", data: [...orderTypeCumulativeData.downgrade], color: chartColor(4) },
        ],
      }),
    [dailyLabels, orderTypeCumulativeData],
  );

  const orderTypeRevenueOptions = React.useMemo(
    () =>
      createBaseChartOptions({
        chart: { type: "areaspline", animation: false, height: 320 },
        xAxis: { categories: dailyLabels, tickInterval: 4 },
        yAxis: {
          title: { text: "" },
          labels: { formatter: function () { return fmtCurrency(Number(this.value) * 1000); } },
        },
        tooltip: {
          shared: true,
          formatter: function () {
            const pts = this.points ?? [];
            const lines = pts.map(
              (p) => `<span style="color:${String(p.color)}">●</span> ${p.series.name}: <b>${fmtCurrency(Number(p.y) * 1000)}</b>`,
            );
            return `<b>${String(this.x)}</b><br/>${lines.join("<br/>")}`;
          },
        },
        legend: { enabled: true, align: "right", verticalAlign: "top", itemStyle: { fontSize: "11px", fontWeight: "600" } },
        plotOptions: STACKED_AREA_PLOT_OPTIONS,
        series: [
          { type: "areaspline", name: "New", data: [...orderTypeRevenueData.new], color: chartColor(0) },
          { type: "areaspline", name: "Renewal", data: [...orderTypeRevenueData.renewal], color: chartColor(1) },
          { type: "areaspline", name: "Upgrade", data: [...orderTypeRevenueData.upgrade], color: chartColor(2) },
          { type: "areaspline", name: "Downgrade", data: [...orderTypeRevenueData.downgrade], color: chartColor(4) },
        ],
      }),
    [dailyLabels, orderTypeRevenueData],
  );

  // ── Revenue Trend (toggleable granularity) ──────────────────────────────

  const trendDayValues = React.useMemo(
    () =>
      liveCurrentMonthDailyRevenue.length > 0
        ? liveCurrentMonthDailyRevenue
        : TREND_BY_DAY_VALUES.slice(0, fallbackMtdDayCount),
    [fallbackMtdDayCount, liveCurrentMonthDailyRevenue],
  );

  const trendOptions = React.useMemo(() => {
    const labels =
      trendGranularity === "day" ? dailyLabels
      : trendGranularity === "week" ? TREND_BY_WEEK_LABELS
      : TREND_BY_QUARTER_LABELS;
    const values =
      trendGranularity === "day" ? trendDayValues
      : trendGranularity === "week" ? TREND_BY_WEEK_VALUES
      : TREND_BY_QUARTER_VALUES;

    return createBaseChartOptions({
      chart: { type: "line", animation: false, height: 240 },
      xAxis: { categories: labels },
      yAxis: {
        labels: {
          formatter: function () {
            return fmtCurrency(Number(this.value));
          },
        },
      },
      tooltip: {
        formatter: function () {
          return `<b>${String(this.x)}</b><br/>${fmtCurrency(Number(this.y))}`;
        },
      },
      legend: { enabled: false },
      plotOptions: {
        line: { marker: { enabled: true, radius: 4 }, color: chartColor(0) },
      },
      series: [{ type: "line", name: "Revenue", data: values, color: chartColor(0) }],
    });
  }, [dailyLabels, trendDayValues, trendGranularity]);


  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 p-4 md:p-6">

      {/* ── 1. Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Scorecards</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Revenue performance, orders, customers, and pipeline health
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={country} onValueChange={(v) => setCountry(v as Country)}>
            <SelectTrigger className="w-[160px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Tab Navigation ──────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ScorecardTab)} className="space-y-6">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="main">
            <IconCurrencyDollar className="mr-1.5 size-4" />
            Targets
          </TabsTrigger>
          <TabsTrigger value="top-deals">
            <IconFlame className="mr-1.5 size-4" />
            Top Deals
          </TabsTrigger>
          <TabsTrigger value="arr">
            <IconChartLine className="mr-1.5 size-4" />
            ARR
          </TabsTrigger>
          <TabsTrigger value="direct">
            <IconArrowRight className="mr-1.5 size-4" />
            Direct
          </TabsTrigger>
          <TabsTrigger value="channel-partner">
            <IconUsers className="mr-1.5 size-4" />
            Channel Partner
          </TabsTrigger>
          <TabsTrigger value="map">
            <IconMap className="mr-1.5 size-4" />
            Map
          </TabsTrigger>
          <TabsTrigger value="historical">
            <IconHistory className="mr-1.5 size-4" />
            Historical
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════════════════════════
            MAIN TAB
           ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="main" className="space-y-8">
          {/* MTD & YTD Summary */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border bg-card px-6 py-5 shadow-sm" style={{ borderTopWidth: 3, borderTopColor: "#8087E8" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8087E8]/70">Month to Date</p>
              <div className="mt-3 flex items-end gap-8">
                <div>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-3xl font-extrabold tracking-tight">{fmtCurrency(mtdRevenueValue)}</p>
                </div>
                <div className="mb-1">
                  <p className="text-xs text-muted-foreground">Orders</p>
                  <p className="text-2xl font-bold tracking-tight">{mtdOrdersValue}</p>
                </div>
                <div className="mb-1">
                  <p className="text-xs text-muted-foreground">Avg Order</p>
                  <p className="text-2xl font-bold tracking-tight">{fmtCurrency(mtdAvgOrderValue)}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {ordersCustomersKpis.ordersYoy} orders YoY · {fmtPct(mtdKpis.yoyPct)} revenue YoY
              </p>
            </div>
            <div className="rounded-2xl border bg-card px-6 py-5 shadow-sm" style={{ borderTopWidth: 3, borderTopColor: "#A3EDBA" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 dark:text-[#A3EDBA]/70">Year to Date</p>
              <div className="mt-3 flex items-end gap-8">
                <div>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-3xl font-extrabold tracking-tight">{fmtCurrency(ytdRevenueValue)}</p>
                </div>
                <div className="mb-1">
                  <p className="text-xs text-muted-foreground">Orders</p>
                  <p className="text-2xl font-bold tracking-tight">{ytdOrdersValue}</p>
                </div>
                <div className="mb-1">
                  <p className="text-xs text-muted-foreground">Avg Order</p>
                  <p className="text-2xl font-bold tracking-tight">{fmtCurrency(ytdAvgOrderValue)}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {ordersCustomersKpis.customersYoy} customers YoY · {fmtPct(ytdKpis.yoyPct)} revenue YoY
              </p>
            </div>
          </div>

          {/* Today's Snapshot */}
          <div className="rounded-2xl border bg-card p-1.5 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-border">
              {todaySnapshotStats.map((stat) => (
                <div key={stat.label} className="px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {stat.label}
                  </p>
                  <p className="mt-1.5 text-2xl font-bold tracking-tight">{stat.value}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                        stat.positive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-red-500/10 text-red-600 dark:text-red-400",
                      )}
                    >
                      {stat.positive ? "▲" : "▼"} {stat.diff}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">vs yesterday</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Daily pace bar */}
            {(() => {
              const todayRev = todaySummaryState.data?.totalRevenue ?? 0;
              const pct = Math.min(100, (todayRev / DAILY_BUDGET_RATE) * 100);
              return (
                <div className="border-t border-border px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? "#10b981" : pct >= 60 ? "#10b981" : "#FB7185" }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    Today{" "}
                    <span className="font-bold text-foreground text-sm">{fmtCurrency(Math.round(todayRev))}</span>
                    {" "}/ {fmtCurrency(Math.round(DAILY_BUDGET_RATE))} daily ({Math.round(pct)}%)
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Sales Leaderboard */}
          <SalesLeaderboard
            period={period}
            onPeriodChange={setPeriod}
            benchmarks={leaderboardBenchmarks}
            statusMessage={leaderboardStatusMessage}
            todayRevenue={todaySummaryState.data?.totalRevenue ?? 0}
          />

          {/* Daily Revenue & Orders */}
          <SectionHeader label="Daily Revenue & Orders" accent="#6DDFA0" />
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Budget vs Actual */}
            <Card>
              <CardHeader className="pb-0 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Revenue: Budget vs Actual
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowLastYear((v) => !v)}
                      className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground transition-colors"
                    >
                      <span className="relative inline-flex">
                        {/* Track */}
                        <span
                          className={cn(
                            "block h-5 w-9 rounded-full transition-colors duration-200",
                            showLastYear ? "bg-[#F7A85E]" : "bg-slate-200 dark:bg-slate-700",
                          )}
                        />
                        {/* Thumb */}
                        <span
                          className={cn(
                            "absolute top-0.5 left-0.5 block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                            showLastYear && "translate-x-4",
                          )}
                        />
                      </span>
                      <span className={cn(showLastYear ? "text-[#F7A85E]" : "text-muted-foreground")}>
                        Last Year
                      </span>
                    </button>
                    <PeriodBadge label="MTD" variant="mtd" />
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {mtdDateLabel} · Pace {fmtWholeCurrency(DAILY_BUDGET_RATE)}/day from $14M / 252 workdays
                </p>
              </CardHeader>
              <CardContent className="p-0 pr-4 pb-4">
                <div className="h-[320px]">
                  <DashboardHighchart options={dailyBudgetVsActualOptions} />
                </div>
              </CardContent>
            </Card>

            {/* Cumulative Orders */}
            <Card>
              <CardHeader className="pb-0 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Cumulative Orders
                  </CardTitle>
                  <PeriodBadge label="MTD" variant="mtd" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {mtdDateLabelCompact} · <span className="font-medium" style={{ color: chartColor(0) }}>{currentYear}</span>
                  {" vs "}
                  <span className="font-medium text-slate-500">{previousYear}</span>
                </p>
              </CardHeader>
              <CardContent className="p-0 pr-4 pb-4">
                <div className="h-[320px]">
                  <DashboardHighchart options={cumulativeOrdersOptions} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Orders by Type */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Orders by Type</h3>
              <TogglePills
                options={[
                  { label: "MTD", value: "mtd" as const },
                  { label: "YTD", value: "ytd" as const },
                ]}
                value={ordersPeriod}
                onChange={setOrdersPeriod}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Revenue by order type - stacked area */}
              <Card>
                <CardHeader className="pb-0 pt-4">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Revenue by Order Type
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ordersPeriod === "mtd" ? mtdDateLabelCompact : ytdDateLabel} · Cumulative stacked
                  </p>
                </CardHeader>
                <CardContent className="p-0 pr-4 pb-4">
                  <div className="h-[320px]">
                    <DashboardHighchart options={orderTypeRevenueOptions} />
                  </div>
                </CardContent>
              </Card>

              {/* Orders by order type - stacked area */}
              <Card>
                <CardHeader className="pb-0 pt-4">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Orders by Order Type
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ordersPeriod === "mtd" ? mtdDateLabelCompact : ytdDateLabel} · Cumulative stacked
                  </p>
                </CardHeader>
                <CardContent className="p-0 pr-4 pb-4">
                  <div className="h-[320px]">
                    <DashboardHighchart options={orderTypeOrdersOptions} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Period Panels */}
          <SectionHeader
            label={period === "mtd" ? "Month to Date" : "Year to Date"}
            accent={period === "mtd" ? "#8087E8" : "#6DDFA0"}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {period === "mtd" ? (
              <>
                <PeriodPanel
                  variant="mtd"
                  kpis={liveMtdPanelKpis}
                  date={mtdDateLabel}
                  revenueSub={mtdDateLabel}
                  ordersValue={mtdOrdersValue}
                  ordersSub={ordersCustomersKpis.ordersYoy}
                />
                <PeriodPanel
                  variant="ytd"
                  kpis={liveYtdPanelKpis}
                  date={ytdDateLabel}
                  revenueSub={ytdDateLabel}
                  ordersValue={ytdOrdersValue}
                  ordersSub={ordersCustomersKpis.ordersYoy}
                />
              </>
            ) : (
              <>
                <PeriodPanel
                  variant="ytd"
                  kpis={liveYtdPanelKpis}
                  date={ytdDateLabel}
                  revenueSub={ytdDateLabel}
                  ordersValue={ytdOrdersValue}
                  ordersSub={ordersCustomersKpis.ordersYoy}
                />
                <PeriodPanel
                  variant="mtd"
                  kpis={liveMtdPanelKpis}
                  date={mtdDateLabel}
                  revenueSub={mtdDateLabel}
                  ordersValue={mtdOrdersValue}
                  ordersSub={ordersCustomersKpis.ordersYoy}
                />
              </>
            )}
          </div>

          {/* Revenue Trend */}
          <SectionHeader label="Revenue Trend" />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-0 pt-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Daily / Weekly / Quarterly</CardTitle>
              <TogglePills
                options={[
                  { label: "By Day", value: "day" },
                  { label: "By Week", value: "week" },
                  { label: "By Quarter", value: "quarter" },
                ]}
                value={trendGranularity}
                onChange={setTrendGranularity}
              />
            </CardHeader>
            <CardContent className="p-0 pr-4 pb-4">
              <div className="h-[240px]">
                <DashboardHighchart options={trendOptions} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════
            ARR TAB
           ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="arr" className="space-y-8">
          <ScorecardArrTab state={arrState} />
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════
            DIRECT TAB
           ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="direct" className="space-y-8">
          <SalesforceChannelFilterCard
            customerChannel="Direct Sales"
            range={directRange}
            onRangeChange={setDirectRange}
            salesChannel={directSalesChannel}
            onSalesChannelChange={setDirectSalesChannel}
            state={directRevenueState}
          />
          <SalesforceFilteredPerformanceCard
            customerChannel="Direct Sales"
            range={directRange}
            salesChannel={directSalesChannel}
            state={directRevenueState}
          />
          <ScorecardChannelDashboardTab
            state={directChannelDashboardState}
            revenueData={directRevenueState.data}
            range={directRange}
            hideCards
          />
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════
            CHANNEL PARTNER TAB
           ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="channel-partner" className="space-y-8">
          <SalesforceChannelFilterCard
            customerChannel="Channel Partner Sales"
            range={partnerRange}
            onRangeChange={setPartnerRange}
            salesChannel={partnerSalesChannel}
            onSalesChannelChange={setPartnerSalesChannel}
            state={partnerRevenueState}
          />
          <SalesforceFilteredPerformanceCard
            customerChannel="Channel Partner Sales"
            range={partnerRange}
            salesChannel={partnerSalesChannel}
            state={partnerRevenueState}
          />
          <ScorecardChannelDashboardTab
            state={partnerChannelDashboardState}
            revenueData={partnerRevenueState.data}
            range={partnerRange}
            hideCards
          />
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════
            HISTORICAL TAB
           ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="historical" className="space-y-5">
          <ScorecardHistoricalTab
            customerChannel={historicalCustomerChannel}
            onCustomerChannelChange={setHistoricalCustomerChannel}
            dateRange={historicalDateRange}
            onDateRangeChange={(nextRange) => {
              setHistoricalDateRange(nextRange ?? buildDefaultHistoricalDateRange());
            }}
            monthlyState={historicalMonthlyState}
          />
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════
            MAP TAB
           ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="map" className="space-y-0">
          <ScorecardMapTab
            interval={mapInterval}
            onIntervalChange={setMapInterval}
            customerChannel={mapCustomerChannel}
            salesChannel={mapSalesChannel}
            onCustomerChannelChange={setMapCustomerChannel}
            onSalesChannelChange={setMapSalesChannel}
            state={mapState}
          />
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════
            TOP DEALS TAB
           ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="top-deals" className="space-y-5">
          <ScorecardTopDealsTab
            customerChannel={dealsCustomerChannel}
            salesChannel={dealsSalesChannel}
            onCustomerChannelChange={setDealsCustomerChannel}
            onSalesChannelChange={setDealsSalesChannel}
            state={topDealsState}
          />
        </TabsContent>
      </Tabs>

    </div>
  );
}
