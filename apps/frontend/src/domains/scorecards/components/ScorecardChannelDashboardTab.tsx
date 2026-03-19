"use client";

import * as React from "react";

import {
  REVENUE_RANGE_LABELS,
  type RevenueRange,
  type SfRevenueResponse,
  type SfScorecardChannelBreakdownItem,
  type SfScorecardChannelDashboardResponse,
  type SfScorecardChannelValueSegment,
} from "@contracts/sales";

import { DashboardHighchart, chartColor, createBaseChartOptions } from "@/shared/charts/highcharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import type { ScorecardChannelDashboardState } from "@/lib/sf/use-scorecard-channel-dashboard";

const FALLBACK_HEIGHT = "h-[260px]";
const ORDER_TYPE_KEYS = ["new", "renewal", "upgrade", "downgrade"] as const;
const ORDER_TYPE_LABELS: Record<(typeof ORDER_TYPE_KEYS)[number], string> = {
  new: "New",
  renewal: "Renewal",
  upgrade: "Upgrade",
  downgrade: "Downgrade",
};

function fmtCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }

  if (Math.abs(value) >= 1_000) {
    return `$${Math.round(value / 1_000)}K`;
  }

  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function fmtDelta(value: number, kind: "currency" | "number"): string {
  const prefix = value > 0 ? "+" : "";
  const absoluteValue = Math.abs(value);

  if (kind === "currency") {
    return `${prefix}${fmtCurrency(absoluteValue)}`;
  }

  return `${prefix}${Math.round(absoluteValue).toLocaleString("en-US")}`;
}

function buildPieOptions(
  items: readonly SfScorecardChannelBreakdownItem[],
  metric: "revenue" | "orders",
) {
  const formatter = metric === "revenue" ? fmtCurrency : (value: number) => value.toLocaleString("en-US");

  return createBaseChartOptions({
    chart: { type: "pie", animation: false, height: 240 },
    tooltip: {
      pointFormatter: function () {
        const pointValue = Number(this.y ?? 0);
        return `<b>${String(this.name)}</b>: ${formatter(pointValue)} (${this.percentage?.toFixed(1)}%)`;
      },
    },
    plotOptions: {
      pie: {
        innerSize: "68%",
        dataLabels: { enabled: false },
        showInLegend: true,
      },
    },
    series: [
      {
        type: "pie",
        name: metric === "revenue" ? "Revenue" : "Orders",
        data: items.map((item, index) => ({
          name: item.label,
          y: metric === "revenue" ? item.revenue : item.orders,
          color: chartColor(index),
        })),
      },
    ],
  });
}

function buildBarOptions(
  items: readonly SfScorecardChannelBreakdownItem[],
  metric: "revenue" | "orders",
) {
  const formatter = metric === "revenue" ? fmtCurrency : (value: number) => value.toLocaleString("en-US");

  return createBaseChartOptions({
    chart: { type: "bar", animation: false, height: 260 },
    xAxis: {
      categories: items.map((item) => item.label),
      labels: { style: { fontSize: "11px" } },
    },
    yAxis: {
      title: { text: "" },
      labels: {
        formatter: function () {
          return formatter(Number(this.value));
        },
      },
    },
    tooltip: {
      formatter: function () {
        return `<b>${String(this.x)}</b><br/>${formatter(Number(this.y))}`;
      },
    },
    legend: { enabled: false },
    plotOptions: {
      bar: {
        borderWidth: 0,
        borderRadius: 4,
      },
    },
    series: [
      {
        type: "bar",
        name: metric === "revenue" ? "Revenue" : "Orders",
        data: items.map((item, index) => ({
          y: metric === "revenue" ? item.revenue : item.orders,
          color: chartColor(index),
        })),
      },
    ],
  });
}

function buildPercentStackedOrderTypeOptions(
  labels: readonly string[],
  revenueByOrderType: Record<string, readonly number[]>,
) {
  const labelStep = Math.max(1, Math.ceil(labels.length / 10));
  const rotation = labels.length > 24 ? -45 : labels.length > 14 ? -25 : 0;
  const series = ORDER_TYPE_KEYS
    .map((orderType, index) => ({
      type: "areaspline" as const,
      name: ORDER_TYPE_LABELS[orderType],
      data: [...(revenueByOrderType[orderType] ?? [])],
      color: chartColor(index),
    }))
    .filter((item) => item.data.some((value) => value > 0));

  return createBaseChartOptions({
    chart: { type: "areaspline", animation: false, height: 240 },
    xAxis: {
      categories: [...labels],
      tickLength: 0,
      labels: {
        step: labelStep,
        rotation,
        style: { fontSize: "10px" },
      },
    },
    yAxis: {
      min: 0,
      max: 100,
      title: { text: "" },
      labels: {
        formatter: function () {
          return `${Math.round(Number(this.value))}%`;
        },
      },
    },
    tooltip: {
      shared: true,
      formatter: function () {
        const points = this.points ?? [];
        const lines = points.map(
          (point) =>
            `<span style="color:${String(point.color)}">●</span> ${point.series.name}: <b>${Number(point.percentage ?? 0).toFixed(1)}%</b> <span style="color:#64748b">(${fmtCurrency(Number(point.y ?? 0))})</span>`,
        );
        return `<b>${String(this.x)}</b><br/>${lines.join("<br/>")}`;
      },
    },
    legend: {
      enabled: true,
      align: "left",
      verticalAlign: "top",
      itemStyle: { fontSize: "11px", fontWeight: "600" },
    },
    plotOptions: {
      series: {
        animation: false,
        marker: {
          enabled: false,
        },
      },
      areaspline: {
        stacking: "percent",
        lineWidth: 2,
        fillOpacity: 0.82,
      },
    },
    series,
  });
}

const SEGMENT_ORDER = ["low", "medium", "high", "enterprise"] as const;

const SEGMENT_RANGES: Record<string, string> = {
  low: "< $2K",
  medium: "$2K-$15K",
  high: "$15K-$50K",
  enterprise: "> $50K",
};

function DeltaPill({
  value,
  kind,
}: {
  value: number;
  kind: "currency" | "number";
}) {
  const positive = value >= 0;

  return (
    <span
      className={[
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
        positive
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-red-500/10 text-red-600 dark:text-red-400",
      ].join(" ")}
    >
      {positive ? "▲" : "▼"} {fmtDelta(value, kind)}
    </span>
  );
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-[7px] w-full max-w-[72px] rounded-full bg-muted/60">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color, opacity: 0.7 }}
      />
    </div>
  );
}

function DualMetricCard({
  title,
  mtdValue,
  ytdValue,
  mtdDelta,
  ytdDelta,
  kind,
}: {
  title: string;
  mtdValue: number;
  ytdValue: number;
  mtdDelta: number;
  ytdDelta: number;
  kind: "currency" | "number";
}) {
  const formatter = kind === "currency"
    ? (value: number) => fmtCurrency(value)
    : (value: number) => Math.round(value).toLocaleString("en-US");

  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8087E8]/75">MTD</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{formatter(mtdValue)}</p>
            <div className="mt-2 flex items-center gap-2">
              <DeltaPill value={mtdDelta} kind={kind} />
              <span className="text-[10px] text-muted-foreground">vs prior MTD</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-600/75 dark:text-[#A3EDBA]/75">YTD</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{formatter(ytdValue)}</p>
            <div className="mt-2 flex items-center gap-2">
              <DeltaPill value={ytdDelta} kind={kind} />
              <span className="text-[10px] text-muted-foreground">vs prior YTD</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  subtitle,
  hasData,
  children,
}: {
  title: string;
  subtitle: string;
  hasData: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="pb-0 pt-4">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="p-0 pr-4 pb-4">
        {hasData ? (
          children
        ) : (
          <div className={`${FALLBACK_HEIGHT} flex items-center justify-center px-4 text-sm text-muted-foreground`}>
            No live data for this slice yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="px-5 py-10 text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}

function buildSubscriptionStatusSummary(data: SfScorecardChannelDashboardResponse | null) {
  const summary = {
    active: 0,
    pendingCancel: 0,
    cancelled: 0,
    total: 0,
  };

  if (!data) {
    return summary;
  }

  for (const item of data.subscriptionStatuses) {
    summary.total += item.count;

    if (item.key === "active") {
      summary.active += item.count;
    } else if (item.key === "pending-cancel") {
      summary.pendingCancel += item.count;
    } else if (item.key === "cancelled") {
      summary.cancelled += item.count;
    }
  }

  return summary;
}

function scaleSeriesMap(
  seriesMap: Record<string, readonly number[]>,
  factor: number,
): Record<string, number[]> {
  return Object.fromEntries(
    Object.entries(seriesMap).map(([key, values]) => [
      key,
      values.map((value) => value * factor),
    ]),
  );
}

function SegmentBreakdownCard({
  segments,
  range,
}: {
  segments: readonly SfScorecardChannelValueSegment[];
  range: RevenueRange;
}) {
  const useMtd = range === "30d" || range === "90d";
  const periodLabel = REVENUE_RANGE_LABELS[range];

  const sorted = [...segments]
    .filter((row) => row.key !== "unspecified")
    .sort((a, b) => {
      const order = SEGMENT_ORDER as readonly string[];
      return order.indexOf(a.key) - order.indexOf(b.key);
    });

  const totalRevenue = sorted.reduce((sum, r) => sum + (useMtd ? r.revenueMtd : r.revenueYtd), 0);
  const totalOrders = sorted.reduce((sum, r) => sum + (useMtd ? r.ordersMtd : r.ordersYtd), 0);
  const totalAvg = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const rows = sorted.map((row, index) => {
    const revenue = useMtd ? row.revenueMtd : row.revenueYtd;
    const orders = useMtd ? row.ordersMtd : row.ordersYtd;
    const avg = useMtd ? row.avgOrderValueMtd : row.avgOrderValueYtd;
    const revPct = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
    const ordPct = totalOrders > 0 ? (orders / totalOrders) * 100 : 0;
    return { ...row, revenue, orders, avg, revPct, ordPct, color: chartColor(index) };
  });

  const maxRevPct = Math.max(...rows.map((r) => r.revPct), 1);
  const maxOrdPct = Math.max(...rows.map((r) => r.ordPct), 1);

  const headCls = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="pb-0 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Segment Breakdown
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Colour-coded badges and visual order/revenue bars by value segment
            </p>
          </div>
          <Badge variant="outline" className="text-[10px]">{periodLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-2 pt-3">
        <Table>
          <TableHeader>
            <TableRow className="border-b hover:bg-transparent">
              <TableHead className={`w-[110px] pl-5 ${headCls}`}>Segment</TableHead>
              <TableHead className={headCls}>Range</TableHead>
              <TableHead className={headCls}>Revenue</TableHead>
              <TableHead className={`w-[160px] ${headCls}`}>Rev %</TableHead>
              <TableHead className={headCls}>Orders</TableHead>
              <TableHead className={`w-[160px] ${headCls}`}>Ord %</TableHead>
              <TableHead className={`pr-5 ${headCls}`}>Avg Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key} className="border-b border-border/40 hover:bg-muted/30">
                <TableCell className="py-3 pl-5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="text-sm font-medium text-foreground">{row.label}</span>
                  </div>
                </TableCell>
                <TableCell className="py-3 text-xs text-muted-foreground">
                  {SEGMENT_RANGES[row.key] ?? "—"}
                </TableCell>
                <TableCell className="py-3 text-sm font-semibold tabular-nums">
                  {fmtCurrency(row.revenue)}
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center gap-2.5">
                    <MiniBar pct={(row.revPct / maxRevPct) * 100} color={row.color} />
                    <span className="text-xs tabular-nums text-muted-foreground">{row.revPct.toFixed(1)}%</span>
                  </div>
                </TableCell>
                <TableCell className="py-3 text-sm font-semibold tabular-nums">
                  {row.orders.toLocaleString("en-US")}
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center gap-2.5">
                    <MiniBar pct={(row.ordPct / maxOrdPct) * 100} color={row.color} />
                    <span className="text-xs tabular-nums text-muted-foreground">{row.ordPct.toFixed(1)}%</span>
                  </div>
                </TableCell>
                <TableCell className="py-3 pr-5 text-sm font-semibold tabular-nums">
                  {fmtCurrency(row.avg)}
                </TableCell>
              </TableRow>
            ))}

            {/* Grand Total */}
            <TableRow className="border-t-2 border-border bg-muted/20 hover:bg-muted/30">
              <TableCell className="py-3 pl-5">
                <span className="text-sm font-bold text-foreground">Grand Total</span>
              </TableCell>
              <TableCell />
              <TableCell className="py-3 text-sm font-bold tabular-nums">
                {fmtCurrency(totalRevenue)}
              </TableCell>
              <TableCell className="py-3">
                <span className="text-xs font-bold tabular-nums text-muted-foreground">100%</span>
              </TableCell>
              <TableCell className="py-3 text-sm font-bold tabular-nums">
                {totalOrders.toLocaleString("en-US")}
              </TableCell>
              <TableCell className="py-3">
                <span className="text-xs font-bold tabular-nums text-muted-foreground">100%</span>
              </TableCell>
              <TableCell className="py-3 pr-5 text-sm font-bold tabular-nums">
                {fmtCurrency(totalAvg)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function ScorecardChannelDashboardTab({
  state,
  revenueData = null,
  range = "12m",
  hideCards = false,
}: {
  state: ScorecardChannelDashboardState;
  revenueData?: SfRevenueResponse | null;
  range?: RevenueRange;
  hideCards?: boolean;
}) {
  const data = state.data;
  const useDailyOrderTypeMix = range === "30d";
  const subscriptionSummary = React.useMemo(
    () => buildSubscriptionStatusSummary(data),
    [data],
  );

  const paymentMixOptions = React.useMemo(
    () => buildPieOptions(data?.paymentMethodsMtd ?? [], "revenue"),
    [data?.paymentMethodsMtd],
  );
  const orderTypeOptions = React.useMemo(
    () => buildBarOptions(data?.orderTypesMtd ?? [], "revenue"),
    [data?.orderTypesMtd],
  );
  const salesChannelOptions = React.useMemo(
    () => buildPieOptions(data?.salesChannelsMtd ?? [], "revenue"),
    [data?.salesChannelsMtd],
  );
  const licenseTypeOptions = React.useMemo(
    () => buildBarOptions(data?.licenseTypesYtd ?? [], "revenue"),
    [data?.licenseTypesYtd],
  );
  const countryOptions = React.useMemo(
    () => buildBarOptions(data?.topCountriesYtd ?? [], "revenue"),
    [data?.topCountriesYtd],
  );
  const orderTypeMixLabels = React.useMemo(
    () => (useDailyOrderTypeMix ? (data?.intervalDailyLabels ?? []) : (revenueData?.months ?? [])),
    [data?.intervalDailyLabels, revenueData?.months, useDailyOrderTypeMix],
  );
  const orderTypeMixRevenue = React.useMemo(
    () =>
      useDailyOrderTypeMix
        ? (data?.intervalDailyOrderTypeRevenue ?? {})
        : scaleSeriesMap(revenueData?.orderTypeRevenue ?? {}, 1_000),
    [data?.intervalDailyOrderTypeRevenue, revenueData?.orderTypeRevenue, useDailyOrderTypeMix],
  );
  const orderTypeMixOptions = React.useMemo(
    () =>
      buildPercentStackedOrderTypeOptions(
        orderTypeMixLabels,
        orderTypeMixRevenue,
      ),
    [orderTypeMixLabels, orderTypeMixRevenue],
  );
  const hasOrderTypeMix = React.useMemo(
    () =>
      orderTypeMixLabels.length > 0 &&
      Object.values(orderTypeMixRevenue).some((series) =>
        series.some((value) => value > 0),
      ),
    [orderTypeMixLabels, orderTypeMixRevenue],
  );

  if (!data && state.loading) {
    return <EmptyState message="Loading live Woo order and subscription data..." />;
  }

  if (!data && state.error) {
    return <EmptyState message={state.error} />;
  }

  if (!data) {
    return <EmptyState message="No live Woo data is available for this channel yet." />;
  }

  return (
    <div className="space-y-6">
      {!hideCards && (
        <>
          <Card className="gap-0 py-0">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Live Woo Dashboard
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Orders from `woo_Order__c` and subscription health from `woo_Subscription__c`
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">As of {data.asOfDate}</Badge>
                <Badge variant="outline">{data.salesChannel === "all" ? "All sales channels" : data.salesChannel}</Badge>
                {state.loading ? <Badge variant="outline">Refreshing</Badge> : null}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
            <DualMetricCard
              title="Revenue"
              mtdValue={data.mtd.revenue}
              ytdValue={data.ytd.revenue}
              mtdDelta={data.mtd.revenue - data.previousMtd.revenue}
              ytdDelta={data.ytd.revenue - data.previousYtd.revenue}
              kind="currency"
            />
            <DualMetricCard
              title="Orders"
              mtdValue={data.mtd.orders}
              ytdValue={data.ytd.orders}
              mtdDelta={data.mtd.orders - data.previousMtd.orders}
              ytdDelta={data.ytd.orders - data.previousYtd.orders}
              kind="number"
            />
            <DualMetricCard
              title="Customers"
              mtdValue={data.mtd.customers}
              ytdValue={data.ytd.customers}
              mtdDelta={data.mtd.customers - data.previousMtd.customers}
              ytdDelta={data.ytd.customers - data.previousYtd.customers}
              kind="number"
            />
            <DualMetricCard
              title="New Subscriptions"
              mtdValue={data.mtd.newSubscriptions}
              ytdValue={data.ytd.newSubscriptions}
              mtdDelta={data.mtd.newSubscriptions - data.previousMtd.newSubscriptions}
              ytdDelta={data.ytd.newSubscriptions - data.previousYtd.newSubscriptions}
              kind="number"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
        <Card className="gap-0 py-0">
          <CardHeader className="pb-0 pt-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Average Deal Size
            </CardTitle>
            <p className="text-xs text-muted-foreground">Confirmed from live Woo order revenue</p>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/30 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8087E8]/75">MTD</p>
              <p className="mt-1 text-2xl font-bold">{fmtCurrency(data.mtd.avgDealSize)}</p>
              <div className="mt-2 flex items-center gap-2">
                <DeltaPill value={data.mtd.avgDealSize - data.previousMtd.avgDealSize} kind="currency" />
                <span className="text-[10px] text-muted-foreground">vs prior MTD</span>
              </div>
            </div>
            <div className="rounded-xl border bg-muted/30 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-600/75 dark:text-[#A3EDBA]/75">YTD</p>
              <p className="mt-1 text-2xl font-bold">{fmtCurrency(data.ytd.avgDealSize)}</p>
              <div className="mt-2 flex items-center gap-2">
                <DeltaPill value={data.ytd.avgDealSize - data.previousYtd.avgDealSize} kind="currency" />
                <span className="text-[10px] text-muted-foreground">vs prior YTD</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="pb-0 pt-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Subscription Health
            </CardTitle>
            <p className="text-xs text-muted-foreground">Current status mix from live Woo subscriptions</p>
          </CardHeader>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-3">
            <div className="rounded-xl border bg-muted/30 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Active</p>
              <p className="mt-1 text-2xl font-bold">{subscriptionSummary.active.toLocaleString("en-US")}</p>
            </div>
            <div className="rounded-xl border bg-muted/30 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pending Cancel</p>
              <p className="mt-1 text-2xl font-bold">{subscriptionSummary.pendingCancel.toLocaleString("en-US")}</p>
            </div>
            <div className="rounded-xl border bg-muted/30 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Cancelled</p>
              <p className="mt-1 text-2xl font-bold">{subscriptionSummary.cancelled.toLocaleString("en-US")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="pb-0 pt-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Coverage
            </CardTitle>
            <p className="text-xs text-muted-foreground">Distinct customer footprint for the selected channel</p>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-muted/30 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">MTD Customers</p>
                <p className="mt-1 text-2xl font-bold">{data.mtd.customers.toLocaleString("en-US")}</p>
              </div>
              <div className="rounded-xl border bg-muted/30 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tracked Subscriptions</p>
                <p className="mt-1 text-2xl font-bold">{subscriptionSummary.total.toLocaleString("en-US")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
        </>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          title="Payment Mix"
          subtitle="MTD revenue by Woo payment method"
          hasData={data.paymentMethodsMtd.length > 0}
        >
          <div className={FALLBACK_HEIGHT}>
            <DashboardHighchart options={paymentMixOptions} />
          </div>
        </ChartCard>
        <ChartCard
          title="Order Type Mix"
          subtitle="MTD revenue by order type"
          hasData={data.orderTypesMtd.length > 0}
        >
          <div className={FALLBACK_HEIGHT}>
            <DashboardHighchart options={orderTypeOptions} />
          </div>
        </ChartCard>
        <ChartCard
          title="Sales Channel Mix"
          subtitle="MTD revenue split inside the selected customer channel"
          hasData={data.salesChannelsMtd.length > 0}
        >
          <div className={FALLBACK_HEIGHT}>
            <DashboardHighchart options={salesChannelOptions} />
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          title={useDailyOrderTypeMix ? "Daily Revenue by Order Type" : "Monthly Revenue by Order Type"}
          subtitle={`${REVENUE_RANGE_LABELS[range]} interval · normalized to a 100% ${useDailyOrderTypeMix ? "daily" : "monthly"} revenue mix`}
          hasData={hasOrderTypeMix}
        >
          <div className={FALLBACK_HEIGHT}>
            <DashboardHighchart options={orderTypeMixOptions} />
          </div>
        </ChartCard>
        <ChartCard
          title="License Mix"
          subtitle="YTD revenue by license type"
          hasData={data.licenseTypesYtd.length > 0}
        >
          <div className={FALLBACK_HEIGHT}>
            <DashboardHighchart options={licenseTypeOptions} />
          </div>
        </ChartCard>
        <ChartCard
          title="Top End-user Countries"
          subtitle="YTD revenue by shipping country"
          hasData={data.topCountriesYtd.length > 0}
        >
          <div className={FALLBACK_HEIGHT}>
            <DashboardHighchart options={countryOptions} />
          </div>
        </ChartCard>
      </div>

      <SegmentBreakdownCard segments={data.valueSegments} range={range} />
    </div>
  );
}
