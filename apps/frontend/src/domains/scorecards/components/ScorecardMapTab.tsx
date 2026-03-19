"use client";

import * as React from "react";
import { useTheme } from "next-themes";

import {
  REVENUE_CUSTOMER_CHANNEL_LABELS,
  REVENUE_CUSTOMER_CHANNEL_VALUES,
  REVENUE_SALES_CHANNEL_LABELS,
  REVENUE_SALES_CHANNEL_VALUES,
  SCORECARD_MAP_INTERVAL_LABELS,
  SCORECARD_MAP_INTERVAL_VALUES,
  type ScorecardMapInterval,
  type RevenueCustomerChannel,
  type RevenueSalesChannel,
  type SfScorecardMapCountry,
} from "@contracts/sales";

import { WorldMap, type WorldMapPin } from "@/domains/scorecards/components/WorldMap";
import type { ScorecardMapState } from "@/lib/sf/use-scorecard-map";
import { DashboardHighchart, createBaseChartOptions } from "@/shared/charts/highcharts";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Sheet, SheetContent } from "@/shared/ui/sheet";

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function fmtPct(n: number | null): string {
  if (n === null) {
    return "—";
  }

  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function fmtSharePct(n: number): string {
  return `${n.toFixed(1)}%`;
}

const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function fmtDateLabel(dateOnly: string): string {
  return DATE_LABEL_FORMATTER.format(new Date(`${dateOnly}T00:00:00Z`));
}

function fmtDateSpan(from: string, to: string): string {
  return `${fmtDateLabel(from)} to ${fmtDateLabel(to)}`;
}

const MAP_INTERVAL_OPTIONS = SCORECARD_MAP_INTERVAL_VALUES.map((value) => ({
  label: SCORECARD_MAP_INTERVAL_LABELS[value],
  value,
}));

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

type DetailKind = "topContinent" | "emergingMarkets" | "europe";

type DetailConfig = {
  title: string;
  subtitle: string;
  countries: SfScorecardMapCountry[];
};

function KpiCard({
  label,
  value,
  sub,
  detail,
  tone = "default",
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  detail: string;
  tone?: "default" | "positive";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-card px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:pointer-events-none",
        onClick ? "cursor-pointer" : "cursor-default",
      )}
      disabled={!onClick}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      <p className={cn("mt-2 text-xs font-semibold", tone === "positive" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
        {sub}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </button>
  );
}

export function ScorecardMapTab({
  interval,
  onIntervalChange,
  customerChannel,
  salesChannel,
  onCustomerChannelChange,
  onSalesChannelChange,
  state,
}: {
  interval: ScorecardMapInterval;
  onIntervalChange: (value: ScorecardMapInterval) => void;
  customerChannel: RevenueCustomerChannel;
  salesChannel: RevenueSalesChannel;
  onCustomerChannelChange: (value: RevenueCustomerChannel) => void;
  onSalesChannelChange: (value: RevenueSalesChannel) => void;
  state: ScorecardMapState;
}) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const [activeDetail, setActiveDetail] = React.useState<DetailKind | null>(null);

  React.useEffect(() => {
    setActiveDetail(null);
  }, [customerChannel, interval, salesChannel]);

  const intervalLabel = SCORECARD_MAP_INTERVAL_LABELS[interval];
  const intervalRevenueLabel =
    interval === "mtd" ? "month-to-date" : interval === "ytd" ? "year-to-date" : "last 12 months";
  const ordersLabel =
    interval === "mtd" ? "Orders MTD" : interval === "ytd" ? "Orders YTD" : "Orders 12M";
  const ordersGrowthLabel =
    interval === "mtd" ? "vs prior month" : interval === "ytd" ? "vs last year YTD" : "vs prior 12 months";
  const periodGrowthHeader =
    interval === "mtd" ? "MoM Growth" : interval === "ytd" ? "YTD Growth" : "12M Growth";

  const mapPins = React.useMemo<WorldMapPin[]>(
    () =>
      (state.data?.locationPins ?? []).map((pin) => ({
        label: pin.label,
        country: pin.country,
        state: pin.state ?? undefined,
        scope: pin.scope,
        users: pin.orders,
        revenue: pin.revenue,
      })),
    [state.data?.locationPins],
  );

  const ytdChartOptions = React.useMemo(() => {
    if (!state.data || state.data.ytdComparison.continents.length === 0) {
      return null;
    }

    const categories = state.data.ytdComparison.continents.map((row) => row.continent);
    const previousYearColor = dark ? "#5a6078" : "#cbd5e1";
    const currentYearColor = dark ? "#00e5a0" : "#10b981";

    return createBaseChartOptions({
      chart: {
        type: "column",
        height: 360,
        spacing: [12, 10, 12, 10],
      },
      legend: {
        enabled: true,
        align: "left",
        verticalAlign: "top",
        layout: "horizontal",
        itemStyle: { fontWeight: "500", fontSize: "12px" },
      },
      xAxis: {
        categories,
        tickLength: 0,
        lineWidth: 0,
        labels: {
          style: { fontSize: "12px" },
        },
      },
      yAxis: {
        title: {
          text: undefined,
        },
        labels: {
          format: "${value:,.0f}",
          style: { fontSize: "11px" },
        },
        gridLineDashStyle: "Dash",
      },
      tooltip: {
        shared: true,
        backgroundColor: "var(--popover)",
        borderWidth: 0,
        borderRadius: 8,
        shadow: false,
        style: { color: "var(--popover-foreground)" },
        pointFormat:
          '<span style="color:{series.color}">\u25CF</span> {series.name}: <b>${point.y:,.0f}</b><br/>',
      },
      plotOptions: {
        series: {
          animation: false,
        },
        column: {
          borderWidth: 0,
          borderRadius: 5,
          pointPadding: 0.08,
          groupPadding: 0.14,
        },
      },
      series: [
        {
          type: "column",
          name: state.data.ytdComparison.previousLabel,
          data: state.data.ytdComparison.continents.map((row) => row.previousRevenue),
          color: previousYearColor,
        },
        {
          type: "column",
          name: state.data.ytdComparison.currentLabel,
          data: state.data.ytdComparison.continents.map((row) => row.currentRevenue),
          color: currentYearColor,
        },
      ],
    });
  }, [dark, state.data]);

  const detailConfig = React.useMemo<DetailConfig | null>(() => {
    if (!state.data || !activeDetail) {
      return null;
    }

    if (activeDetail === "topContinent") {
      return {
        title: `${state.data.topContinent.continent} revenue`,
        subtitle: `${fmtCurrency(state.data.topContinent.revenue)} · ${fmtSharePct(state.data.topContinent.revenueSharePct)} of ${intervalRevenueLabel} revenue`,
        countries: state.data.topContinent.countries,
      };
    }

    if (activeDetail === "europe") {
      return {
        title: "Europe revenue",
        subtitle: `${fmtCurrency(state.data.europe.revenue)} · ${fmtSharePct(state.data.europe.revenueSharePct)} of ${intervalRevenueLabel} revenue`,
        countries: state.data.europe.countries,
      };
    }

    return {
      title: "Emerging markets",
      subtitle: `${fmtCurrency(state.data.emergingMarkets.revenue)} · ${fmtSharePct(state.data.emergingMarkets.revenueSharePct)} of ${intervalRevenueLabel} revenue`,
      countries: state.data.emergingMarkets.countries,
    };
  }, [activeDetail, intervalRevenueLabel, state.data]);

  const statusText = state.error
    ? state.error
    : !state.data && state.loading
      ? "Loading live Salesforce map data..."
      : state.loading
        ? "Refreshing Salesforce map data..."
        : "Live Salesforce map data";

  return (
    <div className="space-y-5">
      <Sheet open={activeDetail !== null} onOpenChange={(open) => !open && setActiveDetail(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          {detailConfig && (
            <div className="flex h-full flex-col">
              <div className="border-b border-border px-5 py-4">
                <p className="text-sm font-semibold">{detailConfig.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{detailConfig.subtitle}</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {detailConfig.countries.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-muted-foreground">
                    No countries matched the selected filters.
                  </div>
                ) : (
                  detailConfig.countries.map((country, index) => (
                    <div
                      key={`${country.country}-${country.continent}`}
                      className={cn(
                        "flex items-center justify-between gap-4 px-5 py-4",
                        index < detailConfig.countries.length - 1 && "border-b border-border",
                      )}
                    >
                      <div>
                        <p className="text-sm font-medium">{country.country}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {country.continent}
                          {country.surgeLabel && country.surgePct !== null
                            ? ` · ${country.surgeLabel} ${fmtPct(country.surgePct)}`
                            : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{fmtCurrency(country.revenue)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {fmtSharePct(country.revenueSharePct)} share
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Card className="gap-0 py-0">
        <CardHeader className="pb-3 pt-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Geographic Revenue
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {statusText}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <TogglePills
                options={MAP_INTERVAL_OPTIONS}
                value={interval}
                onChange={onIntervalChange}
              />
              <span className="h-5 w-px bg-border" />
              <TogglePills
                options={REVENUE_CUSTOMER_CHANNEL_VALUES.map((value) => ({
                  label: REVENUE_CUSTOMER_CHANNEL_LABELS[value],
                  value,
                }))}
                value={customerChannel}
                onChange={onCustomerChannelChange}
              />
              <span className="h-5 w-px bg-border" />
              <TogglePills
                options={REVENUE_SALES_CHANNEL_VALUES.map((value) => ({
                  label: REVENUE_SALES_CHANNEL_LABELS[value],
                  value,
                }))}
                value={salesChannel}
                onChange={onSalesChannelChange}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 px-4 pb-4 pt-0">
          {!state.data && state.loading ? (
            <div className="rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
              Loading live Salesforce map data...
            </div>
          ) : state.data ? (
            <div
              className={cn(
                "space-y-5 transition-opacity duration-300",
                state.loading ? "opacity-60" : "opacity-100",
              )}
            >
              <div className="grid gap-4 xl:grid-cols-4">
                <KpiCard
                  label={ordersLabel}
                  value={state.data.ordersThisMonth.toLocaleString("en-US")}
                  sub={`${fmtPct(state.data.ordersMoMGrowthPct)} ${ordersGrowthLabel}`}
                  detail={`${intervalLabel} orders`}
                  tone="positive"
                />
                <KpiCard
                  label="Top Continent"
                  value={state.data.topContinent.continent}
                  sub={fmtCurrency(state.data.topContinent.revenue)}
                  detail={`${fmtSharePct(state.data.topContinent.revenueSharePct)} of ${intervalLabel} revenue`}
                  onClick={() => setActiveDetail("topContinent")}
                />
                <KpiCard
                  label="Emerging Markets"
                  value={fmtCurrency(state.data.emergingMarkets.revenue)}
                  sub={`${state.data.emergingMarkets.countries.length} surged countries`}
                  detail={`${fmtSharePct(state.data.emergingMarkets.revenueSharePct)} of ${intervalLabel} revenue`}
                  tone="positive"
                  onClick={() => setActiveDetail("emergingMarkets")}
                />
                <KpiCard
                  label="Europe Revenue"
                  value={fmtCurrency(state.data.europe.revenue)}
                  sub={`${state.data.europe.countries.length} countries`}
                  detail={`${fmtSharePct(state.data.europe.revenueSharePct)} of ${intervalLabel} revenue`}
                  onClick={() => setActiveDetail("europe")}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
                <Card className="gap-0 py-0">
                  <CardHeader className="pb-0 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                          User Locations
                        </CardTitle>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {mapPins.length} visible markets
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-3">
                    <div className="h-[440px]">
                      <WorldMap pins={mapPins} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="gap-0 py-0">
                  <CardHeader className="pb-0 pt-4">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Continent Revenue {intervalLabel}
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {state.data.ytdComparison.currentLabel} ({fmtDateSpan(state.data.ytdComparison.currentPeriodStartDate, state.data.ytdComparison.currentPeriodEndDate)}) vs {state.data.ytdComparison.previousLabel} ({fmtDateSpan(state.data.ytdComparison.previousPeriodStartDate, state.data.ytdComparison.previousPeriodEndDate)})
                    </p>
                  </CardHeader>
                  <CardContent className="p-4 pt-3">
                    {ytdChartOptions ? (
                      <DashboardHighchart options={ytdChartOptions} className="h-[360px] w-full" />
                    ) : (
                      <div className="flex h-[360px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                        No {intervalLabel} continent revenue is available for the selected filters.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="gap-0 py-0">
                <CardHeader className="pb-0 pt-4">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Continent Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 pt-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Continent</th>
                          <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Revenue</th>
                          <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{periodGrowthHeader}</th>
                          <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">YoY Growth</th>
                          <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">% Revenue Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.data.continentTable.map((row, index) => (
                          <tr
                            key={row.continent}
                            className={cn(index < state.data!.continentTable.length - 1 && "border-b border-border/70")}
                          >
                            <td className="px-5 py-4 font-medium">{row.continent}</td>
                            <td className="px-5 py-4 text-right font-semibold">{fmtCurrency(row.revenue)}</td>
                            <td className={cn(
                              "px-5 py-4 text-right font-medium",
                              row.momGrowthPct !== null && row.momGrowthPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                            )}>
                              {fmtPct(row.momGrowthPct)}
                            </td>
                            <td className={cn(
                              "px-5 py-4 text-right font-medium",
                              row.yoyGrowthPct !== null && row.yoyGrowthPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                            )}>
                              {fmtPct(row.yoyGrowthPct)}
                            </td>
                            <td className="px-5 py-4 text-right text-muted-foreground">
                              {fmtSharePct(row.revenueSharePct)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
              No Salesforce map data is available for the selected filters yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
