"use client";

import * as React from "react";

import {
  type SfStrategyInitiativeSummary,
  type SfStrategyInitiativesResponse,
} from "@contracts/sales";

import { chartColor, createBaseChartOptions, DashboardHighchart } from "@/shared/charts/highcharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

import { useStrategyInitiatives } from "@/lib/sf/use-strategy-initiatives";

import { ArrKpiCard } from "../sales/widgets/cards";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const INITIATIVE_COLORS = {
  Woodes: "#d97706",
  Morningstar: "#0f766e",
  Grid: "#2563eb",
  Combined: chartColor(4),
  Prior: "#94a3b8",
} as const;

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatCompactCurrency(value: number): string {
  return compactCurrencyFormatter.format(value);
}

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatPct(value: number | null): string {
  if (value === null) {
    return "New";
  }

  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function buildMonthlyMixOptions(data: SfStrategyInitiativesResponse) {
  const categories = data.monthly.map((row) => row.monthLabel);

  return createBaseChartOptions({
    chart: {
      type: "areaspline",
      animation: false,
      height: 360,
    },
    xAxis: {
      categories,
      tickInterval: categories.length > 12 ? 2 : 1,
    },
    yAxis: {
      title: { text: "" },
      labels: {
        formatter: function () {
          return formatCompactCurrency(Number(this.value));
        },
      },
    },
    tooltip: {
      shared: true,
      formatter: function () {
        const points = this.points ?? [];
        const lines = points.map(
          (point) =>
            `<span style="color:${String(point.color)}">●</span> ${point.series.name}: <b>${formatCurrency(Number(point.y))}</b>`,
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
      areaspline: {
        stacking: "normal",
        fillOpacity: 0.14,
        lineWidth: 2.25,
        marker: { enabled: false },
      },
      series: {
        animation: false,
      },
    },
    series: [
      {
        type: "areaspline",
        name: "Woodes",
        data: data.monthly.map((row) => row.woodes),
        color: INITIATIVE_COLORS.Woodes,
      },
      {
        type: "areaspline",
        name: "Morningstar",
        data: data.monthly.map((row) => row.morningstar),
        color: INITIATIVE_COLORS.Morningstar,
      },
      {
        type: "areaspline",
        name: "Grid",
        data: data.monthly.map((row) => row.grid),
        color: INITIATIVE_COLORS.Grid,
      },
    ],
  });
}

function buildYearSeries(
  data: SfStrategyInitiativesResponse,
  year: number,
): number[] {
  const monthly = new Array<number>(data.ytdMonth).fill(0);

  for (const row of data.monthly) {
    if (row.year === year && row.month >= 1 && row.month <= data.ytdMonth) {
      monthly[row.month - 1] = row.combined;
    }
  }

  return monthly;
}

function toCumulative(values: readonly number[]): number[] {
  let running = 0;

  return values.map((value) => {
    running += value;
    return Math.round(running * 100) / 100;
  });
}

function buildCumulativeOptions(data: SfStrategyInitiativesResponse) {
  const categories = MONTH_NAMES.slice(0, data.ytdMonth);
  const currentSeries = toCumulative(buildYearSeries(data, data.currentYear));
  const previousSeries = toCumulative(buildYearSeries(data, data.previousYear));

  return createBaseChartOptions({
    chart: {
      type: "areaspline",
      animation: false,
      height: 360,
    },
    xAxis: {
      categories,
    },
    yAxis: {
      title: { text: "" },
      labels: {
        formatter: function () {
          return formatCompactCurrency(Number(this.value));
        },
      },
    },
    tooltip: {
      shared: true,
      formatter: function () {
        const points = this.points ?? [];
        const lines = points.map(
          (point) =>
            `<span style="color:${String(point.color)}">●</span> ${point.series.name}: <b>${formatCurrency(Number(point.y))}</b>`,
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
      areaspline: {
        fillOpacity: 0.1,
        lineWidth: 2.5,
        marker: { radius: 3 },
      },
      series: {
        animation: false,
      },
    },
    series: [
      {
        type: "areaspline",
        name: `${data.currentYear} cumulative`,
        data: currentSeries,
        color: INITIATIVE_COLORS.Combined,
      },
      {
        type: "areaspline",
        name: `${data.previousYear} cumulative`,
        data: previousSeries,
        color: INITIATIVE_COLORS.Prior,
        dashStyle: "ShortDash",
        fillOpacity: 0,
      },
    ],
  });
}

function getPaceLabel(data: SfStrategyInitiativesResponse): {
  label: string;
  positive: boolean;
} {
  if (data.ytdDiffPct === null) {
    return {
      label: "No comparable prior-year baseline yet",
      positive: true,
    };
  }

  if (data.ytdDiffRevenue > 0) {
    return {
      label: `${formatCurrency(data.ytdDiffRevenue)} ahead of ${data.previousYear}`,
      positive: true,
    };
  }

  if (data.ytdDiffRevenue < 0) {
    return {
      label: `${formatCurrency(Math.abs(data.ytdDiffRevenue))} behind ${data.previousYear}`,
      positive: false,
    };
  }

  return {
    label: `Tracking flat against ${data.previousYear}`,
    positive: true,
  };
}

function getTopInitiative(
  summaries: readonly SfStrategyInitiativeSummary[],
): SfStrategyInitiativeSummary | null {
  if (summaries.length === 0) {
    return null;
  }

  return summaries
    .slice()
    .sort((left, right) => right.totalRevenue - left.totalRevenue)[0] ?? null;
}

function getInitiativeTone(key: SfStrategyInitiativeSummary["key"]): string {
  if (key === "Woodes") {
    return "border-amber-200 bg-amber-50/50";
  }

  if (key === "Morningstar") {
    return "border-teal-200 bg-teal-50/50";
  }

  return "border-blue-200 bg-blue-50/50";
}

export function StrategyInitiativesView() {
  const state = useStrategyInitiatives();
  const data = state.data;

  const totalWindowRevenue = React.useMemo(
    () => data?.monthly.reduce((sum, row) => sum + row.combined, 0) ?? 0,
    [data],
  );
  const topInitiative = React.useMemo(
    () => getTopInitiative(data?.initiatives ?? []),
    [data],
  );
  const gridSummary = React.useMemo(
    () => data?.initiatives.find((item) => item.key === "Grid") ?? null,
    [data],
  );
  const ytdStatus = React.useMemo(
    () => (data ? getPaceLabel(data) : null),
    [data],
  );
  const monthlyMixOptions = React.useMemo(
    () => (data ? buildMonthlyMixOptions(data) : null),
    [data],
  );
  const cumulativeOptions = React.useMemo(
    () => (data ? buildCumulativeOptions(data) : null),
    [data],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Strategy Initiatives</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Live cross-object revenue view for Woodes, Morningstar, and Grid. Opportunity streams use closed-won
            revenue by lead source, while Grid comes from order-line revenue where the product name contains Grid.
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
          <div className="font-semibold text-foreground">Snapshot {data?.asOfDate ?? "loading"}</div>
          <div className="text-muted-foreground">
            Window {data?.fromMonth ?? "—"} to {data?.toMonth ?? "—"}
          </div>
        </div>
      </div>

      {state.error ? (
        <Card className="border-red-200 bg-red-50/70">
          <CardContent className="p-4 text-sm text-red-700">{state.error}</CardContent>
        </Card>
      ) : null}

      {state.loading && !data ? (
        <Card>
          <CardContent className="flex min-h-[240px] items-center justify-center p-6 text-center">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Loading strategy initiatives</p>
              <p className="text-sm text-muted-foreground">
                Pulling live Opportunity and order-line revenue streams from Salesforce.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ArrKpiCard
              title="YTD Strategy Revenue"
              value={formatCompactCurrency(data.ytdCurrentRevenue)}
              subtitle={`Combined ${data.currentYear} YTD revenue`}
              trend={ytdStatus?.label ?? "Awaiting comparison"}
              positive={ytdStatus?.positive ?? true}
            />
            <ArrKpiCard
              title={`Pace vs ${data.previousYear}`}
              value={formatPct(data.ytdDiffPct)}
              subtitle={formatCurrency(data.ytdPreviousRevenue)}
              trend={`${formatCurrency(data.ytdDiffRevenue)} versus prior-year YTD`}
              positive={data.ytdDiffRevenue >= 0}
            />
            <ArrKpiCard
              title="Display Window Revenue"
              value={formatCompactCurrency(totalWindowRevenue)}
              subtitle={`${data.monthly.length} months across all initiatives`}
              trend={
                topInitiative
                  ? `${topInitiative.label} leads at ${formatCompactCurrency(topInitiative.totalRevenue)}`
                  : "No initiative revenue in range"
              }
              positive={true}
            />
            <ArrKpiCard
              title="Grid Share"
              value={formatPct(
                totalWindowRevenue > 0 && gridSummary
                  ? (gridSummary.totalRevenue / totalWindowRevenue) * 100
                  : 0,
              )}
              subtitle="Share of displayed revenue from order lines"
              trend={
                gridSummary
                  ? `${gridSummary.recordCount} Grid line items in window`
                  : "No Grid activity in window"
              }
              positive={(gridSummary?.totalRevenue ?? 0) > 0}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-5">
            <Card className="xl:col-span-3">
              <CardHeader>
                <CardTitle>Monthly Initiative Mix</CardTitle>
                <CardDescription>
                  Stacked area revenue by initiative across the displayed window
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {monthlyMixOptions ? (
                  <DashboardHighchart options={monthlyMixOptions} className="h-[360px] w-full" />
                ) : null}
              </CardContent>
            </Card>

            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Cumulative YTD Pace</CardTitle>
                <CardDescription>
                  Combined cumulative revenue for {data.currentYear} versus {data.previousYear}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className={`rounded-xl border px-4 py-3 text-sm ${ytdStatus?.positive ? "border-emerald-200 bg-emerald-50/60 text-emerald-700" : "border-red-200 bg-red-50/60 text-red-700"}`}>
                  {ytdStatus?.label}
                </div>
                {cumulativeOptions ? (
                  <DashboardHighchart options={cumulativeOptions} className="h-[300px] w-full" />
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {data.initiatives.map((initiative) => (
              <Card key={initiative.key} className={getInitiativeTone(initiative.key)}>
                <CardHeader className="gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">{initiative.label}</CardTitle>
                    <span className="rounded-full border border-black/5 bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {initiative.sourceObject}
                    </span>
                  </div>
                  <CardDescription className="text-[13px] leading-5 text-foreground/75">
                    {initiative.rule}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-3 pt-0">
                  <div className="rounded-xl border border-white/70 bg-white/80 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Window
                    </div>
                    <div className="mt-2 text-xl font-bold">{formatCompactCurrency(initiative.totalRevenue)}</div>
                  </div>
                  <div className="rounded-xl border border-white/70 bg-white/80 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      YTD
                    </div>
                    <div className="mt-2 text-xl font-bold">{formatCompactCurrency(initiative.ytdRevenue)}</div>
                  </div>
                  <div className="rounded-xl border border-white/70 bg-white/80 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Records
                    </div>
                    <div className="mt-2 text-xl font-bold">{initiative.recordCount}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Data Contract</CardTitle>
              <CardDescription>
                The page is only using fields that are already present in the live Opportunity and order-line objects.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Woodes</div>
                <p className="mt-2 text-sm text-foreground">
                  Closed-won Opportunity revenue where <code>LeadSource</code> is <code>Woodes in breach</code> or{" "}
                  <code>Woodes no license</code>.
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Morningstar</div>
                <p className="mt-2 text-sm text-foreground">
                  Closed-won Opportunity revenue where <code>LeadSource</code> is <code>Referral from Morningstar</code>.
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Grid</div>
                <p className="mt-2 text-sm text-foreground">
                  <code>woo_OrderLine__c</code> revenue where <code>name__c</code> contains <code>Grid</code>, anchored on{" "}
                  <code>OrderEffectiveDate__c</code> and valued by <code>total__c</code>.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
