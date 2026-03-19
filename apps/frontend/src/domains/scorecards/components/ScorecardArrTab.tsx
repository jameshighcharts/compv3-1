"use client";

import * as React from "react";

import { type SfScorecardArrStatusSnapshot } from "@contracts/sales";

import { type ScorecardArrState } from "@/lib/sf/use-scorecard-arr";
import {
  DashboardHighchart,
  chartColor,
  createBaseChartOptions,
} from "@/shared/charts/highcharts";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

function formatDateLabel(dateOnly: string): string {
  return new Date(`${dateOnly}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function humanizeStatus(status: string): string {
  return status
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCompactCurrency(value: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatFullCurrency(value: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSignedCompactCurrency(value: number, currencyCode: string): string {
  const abs = formatCompactCurrency(Math.abs(value), currencyCode);

  if (value === 0) {
    return abs;
  }

  return `${value > 0 ? "+" : "-"}${abs}`;
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function statusAccent(status: string): { bg: string; text: string; rail: string } {
  if (status === "active") {
    return { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", rail: "#10b981" };
  }

  if (status === "pending-cancel") {
    return { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", rail: "#f59e0b" };
  }

  if (status === "pending" || status === "on-hold") {
    return { bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", rail: "#0ea5e9" };
  }

  return { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", rail: "#f43f5e" };
}

function ArrLoadingCard() {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="space-y-3 p-5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function ArrKpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-5" style={{ borderTop: `3px solid ${accent}` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/75">
          {label}
        </p>
        <p className="mt-2 text-3xl font-extrabold tracking-tight">{value}</p>
        <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function StatusSnapshotRow({
  row,
  totalSubscriptions,
  currencyCode,
}: {
  row: SfScorecardArrStatusSnapshot;
  totalSubscriptions: number;
  currencyCode: string;
}) {
  const accent = statusAccent(row.status);
  const subscriptionSharePct =
    totalSubscriptions > 0 ? Math.round((row.subscriptions / totalSubscriptions) * 1000) / 10 : 0;

  return (
    <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", accent.bg, accent.text)}>
            {humanizeStatus(row.status)}
          </span>
          <span className="text-xs text-muted-foreground">
            {row.subscriptions.toLocaleString("en-US")} subs
          </span>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">{formatCompactCurrency(row.arr, currencyCode)}</p>
          <p className="text-[11px] text-muted-foreground">{row.arrSharePct.toFixed(1)}% of ARR</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, Math.max(row.arrSharePct, 2))}%`, backgroundColor: accent.rail }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {subscriptionSharePct.toFixed(1)}% of subscriptions
        </p>
      </div>
    </div>
  );
}

export function ScorecardArrTab({
  state,
}: {
  state: ScorecardArrState;
}) {
  const data = state.data;
  const loadingWithoutData = state.loading && !data && !state.error;
  const currencyCode = data?.currencyCode ?? "USD";
  const months = React.useMemo(
    () => data?.monthlyFlow.map((row) => row.monthLabel) ?? [],
    [data],
  );
  const runwaySummary = React.useMemo(() => {
    if (!data) {
      return {
        nextQuarterEndingArr: 0,
        nextQuarterEndingSubscriptions: 0,
        nextQuarterPendingCancelArr: 0,
        nextQuarterPendingCancelSubscriptions: 0,
      };
    }

    const nextQuarter = data.runway.slice(0, 3);

    return nextQuarter.reduce(
      (sum, row) => ({
        nextQuarterEndingArr: sum.nextQuarterEndingArr + row.endingArr,
        nextQuarterEndingSubscriptions: sum.nextQuarterEndingSubscriptions + row.endingSubscriptions,
        nextQuarterPendingCancelArr: sum.nextQuarterPendingCancelArr + row.pendingCancelArr,
        nextQuarterPendingCancelSubscriptions:
          sum.nextQuarterPendingCancelSubscriptions + row.pendingCancelSubscriptions,
      }),
      {
        nextQuarterEndingArr: 0,
        nextQuarterEndingSubscriptions: 0,
        nextQuarterPendingCancelArr: 0,
        nextQuarterPendingCancelSubscriptions: 0,
      },
    );
  }, [data]);
  const totalSubscriptions = React.useMemo(
    () => data?.statusSnapshot.reduce((sum, row) => sum + row.subscriptions, 0) ?? 0,
    [data],
  );

  const arrFlowOptions = React.useMemo(() => {
    if (!data) {
      return null;
    }

    return createBaseChartOptions({
      chart: { type: "column", animation: false, height: 320 },
      xAxis: { categories: months, tickLength: 0 },
      yAxis: {
        title: { text: undefined },
        labels: {
          formatter() {
            return formatCompactCurrency(Number(this.value), currencyCode);
          },
        },
      },
      tooltip: {
        shared: true,
        formatter() {
          const points = this.points ?? [];
          const lines = points.map((point) => {
            const value = Number(point.y);
            const displayValue =
              point.series.name === "Churn ARR"
                ? formatCompactCurrency(Math.abs(value), currencyCode)
                : formatCompactCurrency(value, currencyCode);

            return `<span style="color:${String(point.color)}">●</span> ${point.series.name}: <b>${displayValue}</b>`;
          });

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
          borderWidth: 0,
          borderRadius: 3,
          pointPadding: 0.08,
          groupPadding: 0.12,
        },
        spline: {
          lineWidth: 2.5,
          marker: { radius: 3 },
        },
      },
      series: [
        {
          type: "column",
          name: "New Sales ARR",
          data: data.monthlyFlow.map((row) => row.newArr),
          color: "#6DDFA0",
        },
        {
          type: "column",
          name: "Churn ARR",
          data: data.monthlyFlow.map((row) => -row.endedArr),
          color: "#F7A85E",
        },
        {
          type: "spline",
          name: "Total ARR",
          data: data.monthlyFlow.map((row) => row.totalArr),
          color: "#8087E8",
        },
      ],
    });
  }, [currencyCode, data, months]);

  const subscriptionFlowOptions = React.useMemo(() => {
    if (!data) {
      return null;
    }

    return createBaseChartOptions({
      chart: { type: "column", animation: false, height: 320 },
      xAxis: { categories: months, tickLength: 0 },
      yAxis: {
        title: { text: undefined },
        labels: {
          formatter() {
            return Number(this.value).toLocaleString("en-US");
          },
        },
      },
      tooltip: {
        shared: true,
        formatter() {
          const points = this.points ?? [];
          const lines = points.map((point) => {
            const value = Number(point.y);
            const displayValue =
              point.series.name === "Ended Subs"
                ? Math.abs(value).toLocaleString("en-US")
                : value.toLocaleString("en-US");

            return `<span style="color:${String(point.color)}">●</span> ${point.series.name}: <b>${displayValue}</b>`;
          });

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
          borderWidth: 0,
          borderRadius: 3,
          pointPadding: 0.08,
          groupPadding: 0.12,
        },
        spline: {
          lineWidth: 2.5,
          marker: { radius: 3 },
        },
      },
      series: [
        {
          type: "column",
          name: "New Logos",
          data: data.monthlyFlow.map((row) => row.newSubscriptions),
          color: chartColor(0),
        },
        {
          type: "column",
          name: "Churned Subs",
          data: data.monthlyFlow.map((row) => -row.endedSubscriptions),
          color: chartColor(4),
        },
        {
          type: "spline",
          name: "Active Subs",
          data: data.monthlyFlow.map((row) => row.activeSubscriptions),
          color: "#8087E8",
        },
      ],
    });
  }, [data, months]);

  const runwayOptions = React.useMemo(() => {
    if (!data) {
      return null;
    }

    return createBaseChartOptions({
      chart: { type: "column", animation: false, height: 320 },
      xAxis: {
        categories: data.runway.map((row) => row.monthLabel),
        tickLength: 0,
      },
      yAxis: {
        title: { text: undefined },
        labels: {
          formatter() {
            return formatCompactCurrency(Number(this.value), currencyCode);
          },
        },
      },
      tooltip: {
        shared: true,
        formatter() {
          const points = this.points ?? [];
          const lines = points.map(
            (point) =>
              `<span style="color:${String(point.color)}">●</span> ${point.series.name}: <b>${formatFullCurrency(Number(point.y), currencyCode)}</b>`,
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
          borderWidth: 0,
          borderRadius: 3,
          pointPadding: 0.08,
          groupPadding: 0.12,
        },
      },
      series: [
        {
          type: "column",
          name: "Ending-Term ARR",
          data: data.runway.map((row) => row.endingArr),
          color: chartColor(1),
        },
        {
          type: "column",
          name: "Pending-Cancel ARR",
          data: data.runway.map((row) => row.pendingCancelArr),
          color: "#F7A85E",
        },
      ],
    });
  }, [currencyCode, data]);

  if (!data && state.error) {
    return (
      <Card className="gap-0 py-0">
        <CardContent className="flex min-h-[220px] items-center justify-center p-6 text-sm text-muted-foreground">
          {state.error}
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loadingWithoutData
          ? Array.from({ length: 6 }, (_, index) => <ArrLoadingCard key={index} />)
          : (
              <Card className="sm:col-span-2 xl:col-span-3">
                <CardContent className="flex min-h-[220px] items-center justify-center p-6 text-sm text-muted-foreground">
                  No ARR data is available yet.
                </CardContent>
              </Card>
            )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="gap-0 py-0">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8087E8]">
              Subscription ARR
            </p>
            <h3 className="mt-1 text-xl font-bold tracking-tight">
              Live Woo ARR engine
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Snapshot as of {data ? formatDateLabel(data.asOfDate) : "today"}.
              {" "}Latest full month: {data?.latestFullMonthLabel ?? "—"}.
            </p>
          </div>
          <div className="rounded-full border border-[#8087E8]/20 bg-[#8087E8]/8 px-3 py-1 text-xs font-medium text-muted-foreground">
            {state.loading && data ? "Refreshing live data..." : "Live Salesforce data"}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ArrKpiCard
          label="Total ARR"
          value={formatCompactCurrency(data.currentSnapshot.totalArr, currencyCode)}
          sub={`${formatPct(data.trailingTwelveMonths.totalArrGrowthPct)} TTM growth · ${formatPct(data.trailingTwelveMonths.organicArrGrowthPct)} organic`}
          accent="#8087E8"
        />
        <ArrKpiCard
          label="Active Subscriptions"
          value={data.currentSnapshot.activeSubscriptions.toLocaleString("en-US")}
          sub={`${data.currentSnapshot.activeCustomers.toLocaleString("en-US")} ARR-bearing customers`}
          accent="#6DDFA0"
        />
        <ArrKpiCard
          label="Pending-Cancel ARR"
          value={formatCompactCurrency(data.currentSnapshot.pendingCancelArr, currencyCode)}
          sub={`${data.currentSnapshot.pendingCancelSubscriptions.toLocaleString("en-US")} subscriptions currently flagged pending-cancel`}
          accent="#F7A85E"
        />
        <ArrKpiCard
          label={`${data.latestFullMonthLabel} New Sales ARR`}
          value={formatCompactCurrency(data.latestMonth.newArr, currencyCode)}
          sub={`${data.latestMonth.newSubscriptions.toLocaleString("en-US")} new logos · ${formatSignedCompactCurrency(data.latestMonth.newArrDiff, currencyCode)} vs ${data.previousMonthLabel}`}
          accent="#6DDFA0"
        />
        <ArrKpiCard
          label={`${data.latestFullMonthLabel} Churn ARR`}
          value={formatCompactCurrency(data.latestMonth.endedArr, currencyCode)}
          sub={`${data.latestMonth.endedSubscriptions.toLocaleString("en-US")} churned subscriptions · ${formatPct(data.latestMonth.arrChurnPct)} ARR churn`}
          accent="#F7A85E"
        />
        <ArrKpiCard
          label="TTM Net Revenue Retention"
          value={formatPct(data.trailingTwelveMonths.netRevenueRetentionPct)}
          sub={`${formatPct(data.trailingTwelveMonths.renewalRatePct)} renewal rate · ${formatPct(data.trailingTwelveMonths.recurringRevenuePct)} recurring revenue`}
          accent="#9198F0"
        />
        <ArrKpiCard
          label="ARR per Customer"
          value={formatCompactCurrency(data.currentSnapshot.arrPerCustomer, currencyCode)}
          sub={`${formatPct(data.currentSnapshot.topCustomerSharePct)} top customer share · ${formatPct(data.currentSnapshot.topIndustrySharePct)} top industry share`}
          accent="#4A7C59"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-0 pt-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Monthly ARR Flow
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              New sales ARR, churn ARR, and total ARR over the trailing 14 full months
            </p>
          </CardHeader>
          <CardContent className="p-0 pr-4 pb-4">
            <div className="h-[320px] p-4 pt-3">
              {arrFlowOptions ? (
                <DashboardHighchart options={arrFlowOptions} className={cn("h-full w-full", state.loading && "opacity-60")} />
              ) : (
                <HistoricalEmptyState loading={false} message={state.error ?? "No ARR flow data is available yet."} />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-0 pt-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Monthly Subscription Flow
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              New logos, churned subscriptions, and ending active subscription base
            </p>
          </CardHeader>
          <CardContent className="p-0 pr-4 pb-4">
            <div className="h-[320px] p-4 pt-3">
              {subscriptionFlowOptions ? (
                <DashboardHighchart options={subscriptionFlowOptions} className={cn("h-full w-full", state.loading && "opacity-60")} />
              ) : (
                <HistoricalEmptyState loading={false} message={state.error ?? "No subscription flow data is available yet."} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_1.35fr]">
        <Card className="gap-0 py-0">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Current Status Snapshot
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Snapshot distribution by current Woo subscription status
            </p>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 pt-0">
            {data.statusSnapshot.map((row) => (
              <StatusSnapshotRow
                key={row.status}
                row={row}
                totalSubscriptions={totalSubscriptions}
                currencyCode={currencyCode}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-0 pt-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              End-Date Runway
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Active-ish subscriptions with a current or future subscription end date
            </p>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-dashed bg-muted/25 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
                  Next 90 Days Ending-Term ARR
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight">
                  {formatCompactCurrency(runwaySummary.nextQuarterEndingArr, currencyCode)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {runwaySummary.nextQuarterEndingSubscriptions.toLocaleString("en-US")} subscriptions
                </p>
              </div>
              <div className="rounded-xl border border-dashed bg-muted/25 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
                  Next 90 Days Pending-Cancel ARR
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight">
                  {formatCompactCurrency(runwaySummary.nextQuarterPendingCancelArr, currencyCode)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {runwaySummary.nextQuarterPendingCancelSubscriptions.toLocaleString("en-US")} subscriptions
                </p>
              </div>
            </div>
            <div className="h-[320px]">
              {runwayOptions ? (
                <DashboardHighchart options={runwayOptions} className={cn("h-full w-full", state.loading && "opacity-60")} />
              ) : (
                <HistoricalEmptyState loading={false} message={state.error ?? "No runway data is available yet."} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Live Data Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4 pt-0">
          <div className="rounded-xl border border-dashed bg-muted/25 px-4 py-3">
            <p className="text-sm font-medium">
              Date-backed terminal coverage:{" "}
              <span className="font-bold">
                {data?.terminalDateCoverage.coveragePct.toFixed(1) ?? "0.0"}%
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {data?.terminalDateCoverage.datedCount.toLocaleString("en-US") ?? "0"} of{" "}
              {data?.terminalDateCoverage.statusCount.toLocaleString("en-US") ?? "0"} terminal or pending-cancel
              snapshot rows include a cancellation or end date; the remainder stay in the status snapshot but cannot be placed on a historical month.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border/60 bg-card px-3 py-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">TTM New Sales ARR:</span>{" "}
              {formatFullCurrency(data.trailingTwelveMonths.newSalesArr, currencyCode)}
            </div>
            <div className="rounded-lg border border-border/60 bg-card px-3 py-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">TTM Recurring Revenue:</span>{" "}
              {formatFullCurrency(data.trailingTwelveMonths.recurringRevenue, currencyCode)}
            </div>
            <div className="rounded-lg border border-border/60 bg-card px-3 py-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">TTM Total Revenue:</span>{" "}
              {formatFullCurrency(data.trailingTwelveMonths.totalRevenue, currencyCode)}
            </div>
            <div className="rounded-lg border border-border/60 bg-card px-3 py-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">LTV Proxy:</span>{" "}
              {formatFullCurrency(data.trailingTwelveMonths.ltvProxy, currencyCode)}
            </div>
          </div>
          <div className="grid gap-2">
            {data?.caveats.map((caveat) => (
              <div key={caveat} className="rounded-lg border border-border/60 bg-card px-3 py-2 text-xs text-muted-foreground">
                {caveat}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HistoricalEmptyState({
  loading,
  message,
}: {
  loading: boolean;
  message: string;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-3 w-56" />
        <Skeleton className="h-[240px] w-full" />
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed px-4 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
