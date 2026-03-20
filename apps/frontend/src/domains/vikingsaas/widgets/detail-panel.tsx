"use client";

import React from "react";
import { IconX } from "@tabler/icons-react";
import { type SfScorecardArrResponse } from "@contracts/sales";

import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import {
  DashboardHighchart,
  createBaseChartOptions,
  chartColor,
} from "@/shared/charts/highcharts";

import {
  HEX_TO_PANEL,
  PANEL_META,
  // ARR Growth
  totalArrWf, organicArrWf, arrGrowthBench,
  // Churn
  churnBySize, churnByIndustry,
  // Rule of 40
  rule40OurCo, rule40PeerA, rule40PeerB,
  // SaaS GM
  saasGmRows, type PlRow,
  // NRR
  nrrWf, nrrCohorts, nrrBench,
  // CAC
  cacPaybackTrend, cacCostTrend, cacEffTrend,
  // LTV/CAC
  ltvCacTrend, ltvTrend,
  // Concentration
  custConcentrationPie, indConcentrationPie, concentrationTrend,
  // S&M / R&D
  smPctTrend, rdPctTrend,
  // ARR/FTE
  arrFteTrend, empCostFteTrend,
} from "../data/vikingsaas.data";

// ─────────────────────────────────────────────────────────────────────────────
// Chart option factories
// ─────────────────────────────────────────────────────────────────────────────

const CHART_H = 260;   // default chart height px
const RED = "#e05555"; // negative / down colour for waterfall

function makeWaterfallOptions(
  data: Array<{ name: string; y?: number; isSum?: boolean }>,
) {
  return createBaseChartOptions({
    chart: { type: "waterfall", height: CHART_H },
    xAxis: {
      categories: data.map((d) => d.name),
      labels: { rotation: -30, style: { fontSize: "11px" } },
    },
    yAxis: {
      labels: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter(this: any) {
          return "$" + (this.value / 1000).toFixed(1) + "M";
        },
      },
    },
    legend: { enabled: false },
    tooltip: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter(this: any) {
        const v: number = this.point.y ?? 0;
        const abs = Math.abs(v);
        const sign = v > 0 ? "+" : v < 0 ? "−" : "";
        return `<b>${this.key}</b><br/>${sign}$${abs.toLocaleString()}K`;
      },
    },
    series: [
      {
        type: "waterfall",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: data as any,
        upColor: chartColor(1),   // mint green  — positive
        color: RED,               // red          — negative
        borderColor: "var(--border)",
        borderWidth: 1,
        dataLabels: {
          enabled: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter(this: any) {
            const v: number = this.point.y ?? 0;
            if (v === 0) return "";
            const sign = v > 0 ? "+" : "−";
            return sign + "$" + Math.abs(v) + "K";
          },
          style: { fontSize: "10px", textOutline: "none", color: "var(--foreground)", fontWeight: "500" },
          inside: false,
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    ],
  });
}

function makeLineOptions(
  data: { categories: string[]; series: Array<{ name: string; data: (number | null)[] }> },
  yFormat = "{value}",
) {
  return createBaseChartOptions({
    chart: { type: "line", height: CHART_H },
    xAxis: {
      categories: data.categories,
      labels: { rotation: -30, style: { fontSize: "11px" } },
    },
    yAxis: { labels: { format: yFormat } },
    plotOptions: {
      line: {
        marker: { enabled: true, radius: 3 },
        connectNulls: false,
      },
    },
    series: data.series.map((s, i) => ({
      type: "line" as const,
      name: s.name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: s.data as any,
      color: chartColor(i),
    })),
  });
}

function makeStackedBarOptions(
  data: { categories: string[]; series: Array<{ name: string; data: number[] }> },
) {
  return createBaseChartOptions({
    chart: { type: "column", height: CHART_H },
    xAxis: { categories: data.categories },
    yAxis: {
      labels: { format: "{value}%" },
      stackLabels: {
        enabled: true,
        style: { fontWeight: "bold", color: "var(--foreground)", fontSize: "11px", textOutline: "none" },
      },
    },
    plotOptions: {
      column: {
        stacking: "normal",
        dataLabels: {
          enabled: true,
          format: "{point.y}%",
          style: { fontSize: "10px", textOutline: "none", color: "var(--foreground)" },
        },
      },
    },
    series: data.series.map((s, i) => ({
      type: "column" as const,
      name: s.name,
      data: s.data,
      color: i === 0 ? chartColor(0) : chartColor(1),
    })),
  });
}

function makePieOptions(
  data: Array<{ name: string; y: number }>,
) {
  return createBaseChartOptions({
    chart: { type: "pie", height: CHART_H },
    plotOptions: {
      pie: {
        dataLabels: {
          enabled: true,
          format: "<b>{point.name}</b>: {point.percentage:.0f}%",
          style: { fontSize: "11px", textOutline: "none", color: "var(--foreground)" },
          distance: 18,
        },
        showInLegend: false,
        size: "75%",
      },
    },
    series: [{
      type: "pie",
      data: data.map((d, i) => ({ ...d, color: chartColor(i) })),
    }],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ChartBox({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {title && <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>}
      {children}
    </div>
  );
}

function BenchmarkTable<T extends { isUs?: boolean }>({
  rows,
  columns,
}: {
  rows: T[];
  columns: { key: keyof T; label: string; align?: "left" | "right" }[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-border/60 bg-muted/40">
            {columns.map((c) => (
              <th
                key={String(c.key)}
                className={`px-3 py-2 font-semibold text-muted-foreground ${c.align === "right" ? "text-right" : "text-left"}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className={`border-b border-border/30 last:border-0 ${
                row.isUs
                  ? "bg-[#1a2e2a]/20 font-semibold dark:bg-[#1a2e2a]/40"
                  : "hover:bg-muted/30"
              }`}
            >
              {columns.map((c) => (
                <td
                  key={String(c.key)}
                  className={`px-3 py-2 ${c.align === "right" ? "text-right tabular-nums" : ""} ${
                    c.key === "company" && row.isUs ? "text-[#6DDFA0]" : ""
                  }`}
                >
                  {String(row[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PLTable({ rows }: { rows: PlRow[] }) {
  const fmt = (v: number | string) =>
    typeof v === "number" ? "$" + v.toLocaleString() + "K" : v;
  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-border/60 bg-muted/40">
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Line Item</th>
            <th className="px-3 py-2 text-right font-semibold text-muted-foreground">FY22</th>
            <th className="px-3 py-2 text-right font-semibold text-muted-foreground">FY23</th>
            <th className="px-3 py-2 text-right font-semibold text-muted-foreground">FY24</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className={`border-b border-border/30 last:border-0 ${
                row.highlight ? "bg-[#4a7c59]/10 dark:bg-[#4a7c59]/20" : "hover:bg-muted/30"
              }`}
            >
              <td
                className={`px-3 py-1.5 ${row.bold ? "font-semibold text-foreground" : "text-muted-foreground"} ${
                  row.indent ? "pl-7" : ""
                }`}
              >
                {row.label}
              </td>
              <td className={`px-3 py-1.5 text-right tabular-nums ${row.bold ? "font-semibold" : ""}`}>{fmt(row.fy22)}</td>
              <td className={`px-3 py-1.5 text-right tabular-nums ${row.bold ? "font-semibold" : ""}`}>{fmt(row.fy23)}</td>
              <td className={`px-3 py-1.5 text-right tabular-nums ${row.bold ? "font-semibold" : ""} ${row.highlight ? "text-[#6DDFA0]" : ""}`}>{fmt(row.fy24)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DefBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className="text-[13px] leading-relaxed text-foreground/80">{body}</p>
    </div>
  );
}

const toWaterfallK = (value: number): number => value / 1000;

// ─────────────────────────────────────────────────────────────────────────────
// Individual panel bodies
// ─────────────────────────────────────────────────────────────────────────────

function ArrGrowthPanel({ data }: { data?: SfScorecardArrResponse | null }) {
  if (data) {
    const totalBridge = [
      { name: "Opening ARR", y: toWaterfallK(data.bridges.totalArr.openingArr), isSum: true },
      { name: "New Sales", y: toWaterfallK(data.bridges.totalArr.newSalesArr) },
      { name: "Expansion", y: toWaterfallK(data.bridges.totalArr.expansionArr) },
      { name: "Contraction", y: -toWaterfallK(data.bridges.totalArr.contractionArr) },
      { name: "Churn", y: -toWaterfallK(data.bridges.totalArr.churnArr) },
      { name: "Closing ARR", y: 0, isSum: true },
    ];
    const organicBridge = [
      { name: "Opening ARR", y: toWaterfallK(data.bridges.organicArr.openingArr), isSum: true },
      { name: "Expansion", y: toWaterfallK(data.bridges.organicArr.expansionArr) },
      { name: "Contraction", y: -toWaterfallK(data.bridges.organicArr.contractionArr) },
      { name: "Churn", y: -toWaterfallK(data.bridges.organicArr.churnArr) },
      { name: "Closing ARR", y: 0, isSum: true },
    ];

    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ChartBox title={`Live Total ARR Bridge — TTM to ${data.latestFullMonthLabel}`}>
            <DashboardHighchart options={makeWaterfallOptions(totalBridge)} />
          </ChartBox>
          <ChartBox title={`Live Organic ARR Bridge — TTM to ${data.latestFullMonthLabel}`}>
            <DashboardHighchart options={makeWaterfallOptions(organicBridge)} />
          </ChartBox>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <DefBlock title="Rolling 12M ARR" body={`$${data.bridges.totalArr.closingArr.toLocaleString("en-US")} at the close of ${data.latestFullMonthLabel}. This is a closing ARR stock, not a 12-month sum.`} />
          <DefBlock title="Total ARR Growth" body={`${data.trailingTwelveMonths.totalArrGrowthPct.toFixed(1)}% versus the same month one year earlier.`} />
          <DefBlock title="Organic ARR Growth" body={`${data.trailingTwelveMonths.organicArrGrowthPct.toFixed(1)}% from the opening ARR-bearing cohort.`} />
          <DefBlock title="New Sales ARR Growth" body={`${data.trailingTwelveMonths.newSalesArrGrowthPct.toFixed(1)}% on annual new-logo ARR only.`} />
          <DefBlock title="% Recurring Revenue" body={`${data.trailingTwelveMonths.recurringRevenuePct.toFixed(1)}% of completed Woo order revenue came from renewal or upgrade activity.`} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <ChartBox title="Total ARR Bridge — FY23 → FY24">
          <DashboardHighchart options={makeWaterfallOptions(totalArrWf)} />
        </ChartBox>
        <ChartBox title="Organic ARR Bridge — FY23 → FY24">
          <DashboardHighchart options={makeWaterfallOptions(organicArrWf)} />
        </ChartBox>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Peer Benchmark Comparison
        </p>
        <BenchmarkTable
          rows={arrGrowthBench}
          columns={[
            { key: "company",     label: "Company" },
            { key: "totalGrowth", label: "Total ARR Growth", align: "right" },
            { key: "orgGrowth",   label: "Organic Growth",  align: "right" },
            { key: "nrr",         label: "NRR",             align: "right" },
            { key: "r40",         label: "Rule of 40",      align: "right" },
          ]}
        />
      </div>
    </div>
  );
}

function ChurnPanel({ data }: { data?: SfScorecardArrResponse | null }) {
  if (data) {
    const months = data.monthlyFlow.slice(-12);

    return (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <ChartBox title="Monthly ARR Churn vs Customer Churn">
          <DashboardHighchart
            options={makeLineOptions(
              {
                categories: months.map((row) => row.monthLabel),
                series: [
                  { name: "ARR Churn %", data: months.map((row) => row.arrChurnPct) },
                  { name: "Customer Churn %", data: months.map((row) => row.customerChurnPct) },
                ],
              },
              "{value}%",
            )}
          />
        </ChartBox>
        <ChartBox title="Monthly Renewal Rate vs Retention">
          <DashboardHighchart
            options={makeLineOptions(
              {
                categories: months.map((row) => row.monthLabel),
                series: [
                  { name: "Renewal Rate %", data: months.map((row) => row.renewalRatePct) },
                  { name: "Retention %", data: months.map((row) => row.retentionPct) },
                ],
              },
              "{value}%",
            )}
          />
        </ChartBox>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <ChartBox title="Monthly Churn by Customer Size (annualised %)">
        <DashboardHighchart options={makeLineOptions(churnBySize, "{value}%")} />
      </ChartBox>
      <ChartBox title="Monthly Churn by Industry (annualised %)">
        <DashboardHighchart options={makeLineOptions(churnByIndustry, "{value}%")} />
      </ChartBox>
    </div>
  );
}

function Rule40Panel() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      <ChartBox title="HC ARR — Our Company">
        <DashboardHighchart options={makeStackedBarOptions(rule40OurCo)} />
      </ChartBox>
      <ChartBox title="Peer A">
        <DashboardHighchart options={makeStackedBarOptions(rule40PeerA)} />
      </ChartBox>
      <ChartBox title="Peer B">
        <DashboardHighchart options={makeStackedBarOptions(rule40PeerB)} />
      </ChartBox>
    </div>
  );
}

function SaasGmPanel() {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Revenue & Gross Margin P&L ($K)
      </p>
      <PLTable rows={saasGmRows} />
    </div>
  );
}

function NrrPanel({ data }: { data?: SfScorecardArrResponse | null }) {
  if (data) {
    const bridge = [
      { name: "Beginning ARR", y: toWaterfallK(data.bridges.netRevenueRetention.openingArr), isSum: true },
      { name: "Expansion", y: toWaterfallK(data.bridges.netRevenueRetention.expansionArr) },
      { name: "Contraction", y: -toWaterfallK(data.bridges.netRevenueRetention.contractionArr) },
      { name: "Churn", y: -toWaterfallK(data.bridges.netRevenueRetention.churnArr) },
      { name: "Ending ARR", y: 0, isSum: true },
    ];
    const months = data.monthlyFlow.slice(-12);

    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ChartBox title={`NRR Bridge — TTM to ${data.latestFullMonthLabel}`}>
            <DashboardHighchart options={makeWaterfallOptions(bridge)} />
          </ChartBox>
          <ChartBox title="Monthly NRR Trend">
            <DashboardHighchart
              options={makeLineOptions(
                {
                  categories: months.map((row) => row.monthLabel),
                  series: [
                    { name: "Net Revenue Retention %", data: months.map((row) => row.netRevenueRetentionPct) },
                  ],
                },
                "{value}%",
              )}
            />
          </ChartBox>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <DefBlock title="TTM NRR" body={`${data.trailingTwelveMonths.netRevenueRetentionPct.toFixed(1)}% on the opening ARR cohort.`} />
          <DefBlock title="Renewal Rate" body={`${data.trailingTwelveMonths.renewalRatePct.toFixed(1)}% of due subscriptions renewed inside the 30-day window.`} />
          <DefBlock title="ARR Churn" body={`${data.trailingTwelveMonths.arrChurnPct.toFixed(1)}% ARR churn against the opening ARR base.`} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <ChartBox title="NRR Bridge — Existing Cohort ($K)">
          <DashboardHighchart options={makeWaterfallOptions(nrrWf)} />
        </ChartBox>
        <ChartBox title="Cohort Expansion — ARR as % of Starting ARR">
          <DashboardHighchart options={makeLineOptions(nrrCohorts, "{value}%")} />
        </ChartBox>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          NRR Peer Benchmarks
        </p>
        <BenchmarkTable
          rows={nrrBench}
          columns={[
            { key: "company",   label: "Company" },
            { key: "nrr",       label: "NRR",             align: "right" },
            { key: "grossRet",  label: "Gross Retention", align: "right" },
            { key: "expansion", label: "Expansion",       align: "right" },
            { key: "churn",     label: "Churn",           align: "right" },
          ]}
        />
      </div>
    </div>
  );
}

function CacPaybackPanel() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      <ChartBox title="CAC Payback Period (months)">
        <DashboardHighchart options={makeLineOptions(cacPaybackTrend, "{value} mo")} />
      </ChartBox>
      <ChartBox title="CAC per New Customer ($K)">
        <DashboardHighchart options={makeLineOptions(cacCostTrend, "${value}K")} />
      </ChartBox>
      <ChartBox title="S&M Spend / New ARR (%)">
        <DashboardHighchart options={makeLineOptions(cacEffTrend, "{value}%")} />
      </ChartBox>
    </div>
  );
}

function LtvCacPanel() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <ChartBox title="LTV / CAC Ratio (×)">
        <DashboardHighchart options={makeLineOptions(ltvCacTrend, "{value}×")} />
      </ChartBox>
      <ChartBox title="LTV vs CAC Trend ($K)">
        <DashboardHighchart options={makeLineOptions(ltvTrend, "${value}K")} />
      </ChartBox>
    </div>
  );
}

function SmPctPanel() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <ChartBox title="S&M % of ARR vs Peer Median">
        <DashboardHighchart options={makeLineOptions(smPctTrend, "{value}%")} />
      </ChartBox>
      <DefBlock
        title="What is S&M % of ARR?"
        body="Sales & Marketing spend as a percentage of Annual Recurring Revenue measures go-to-market efficiency. Best-in-class SaaS companies target <30% S&M/ARR once they reach product–market fit. Declining S&M/ARR alongside stable or improving ARR growth signals improving unit economics and scalable distribution."
      />
    </div>
  );
}

function RdPctPanel() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <ChartBox title="R&D % of ARR vs Peer Median">
        <DashboardHighchart options={makeLineOptions(rdPctTrend, "{value}%")} />
      </ChartBox>
      <DefBlock
        title="What is R&D % of ARR?"
        body="R&D spend as a percentage of ARR measures product investment intensity relative to revenue scale. Early-stage companies typically invest 30–50%+ of ARR in R&D. As companies scale, this ratio should decline, reflecting engineering leverage. A ratio converging toward 20–25% with sustained ARR growth is a hallmark of efficient, maturing SaaS businesses."
      />
    </div>
  );
}

function ConcentrationPanel({ data }: { data?: SfScorecardArrResponse | null }) {
  if (data) {
    const months = data.monthlyFlow.slice(-12);

    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ChartBox title="Customer ARR Concentration">
            <DashboardHighchart
              options={makePieOptions(
                data.concentration.customers.items.map((item) => ({
                  name: item.label,
                  y: item.sharePct,
                })),
              )}
            />
          </ChartBox>
          <ChartBox title="Industry ARR Concentration">
            <DashboardHighchart
              options={makePieOptions(
                data.concentration.industries.items.map((item) => ({
                  name: item.label,
                  y: item.sharePct,
                })),
              )}
            />
          </ChartBox>
        </div>
        <ChartBox title="Concentration Trend — Top 1 and Top 5 Customers">
          <DashboardHighchart
            options={makeLineOptions(
              {
                categories: months.map((row) => row.monthLabel),
                series: [
                  { name: "Top 1 Customer %", data: months.map((row) => row.topCustomerSharePct) },
                  { name: "Top 5 Customers %", data: months.map((row) => row.top5CustomerSharePct) },
                  { name: "Top Industry %", data: months.map((row) => row.topIndustrySharePct) },
                ],
              },
              "{value}%",
            )}
          />
        </ChartBox>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <DefBlock title="Top Customer Share" body={`${data.currentSnapshot.topCustomerSharePct.toFixed(1)}% of live ARR sits in the largest customer account.`} />
          <DefBlock title="Top Industry Share" body={`${data.currentSnapshot.topIndustrySharePct.toFixed(1)}% of live ARR sits in the largest industry bucket.`} />
          <DefBlock title="ARR per Customer" body={`$${data.currentSnapshot.arrPerCustomer.toLocaleString("en-US")} using the live ARR-bearing customer base.`} />
          <DefBlock title="Average Sales Price" body={`$${data.trailingTwelveMonths.averageSalesPrice.toLocaleString("en-US")} from trailing-12-month annual new-logo ARR.`} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <ChartBox title="Customer Revenue Concentration">
          <DashboardHighchart options={makePieOptions(custConcentrationPie)} />
        </ChartBox>
        <ChartBox title="Industry Revenue Concentration">
          <DashboardHighchart options={makePieOptions(indConcentrationPie)} />
        </ChartBox>
      </div>
      <ChartBox title="Concentration Trend — Top 1 & Top 5 Customers (% ARR)">
        <DashboardHighchart options={makeLineOptions(concentrationTrend, "{value}%")} />
      </ChartBox>
    </div>
  );
}

function ArrFtesPanel() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <ChartBox title="ARR per FTE ($K)">
        <DashboardHighchart options={makeLineOptions(arrFteTrend, "${value}K")} />
      </ChartBox>
      <ChartBox title="Employee Cost per FTE ($K)">
        <DashboardHighchart options={makeLineOptions(empCostFteTrend, "${value}K")} />
      </ChartBox>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel router
// ─────────────────────────────────────────────────────────────────────────────

const PANEL_BODY = (data?: SfScorecardArrResponse | null): Record<string, React.ReactNode> => ({
  "arr-growth":   <ArrGrowthPanel data={data} />,
  "churn":        <ChurnPanel data={data} />,
  "rule40":       <Rule40Panel />,
  "saas-gm":      <SaasGmPanel />,
  "nrr":          <NrrPanel data={data} />,
  "cac-payback":  <CacPaybackPanel />,
  "ltv-cac":      <LtvCacPanel />,
  "sm-pct":       <SmPctPanel />,
  "rd-pct":       <RdPctPanel />,
  "concentration":<ConcentrationPanel data={data} />,
  "arr-ftes":     <ArrFtesPanel />,
});

// ─────────────────────────────────────────────────────────────────────────────
// Public component
// ─────────────────────────────────────────────────────────────────────────────

export interface DetailPanelProps {
  hexId: number | null;
  onClose: () => void;
  data?: SfScorecardArrResponse | null;
}

export function DetailPanel({ hexId, onClose, data }: DetailPanelProps) {
  const panelId = hexId != null ? HEX_TO_PANEL[hexId] : undefined;
  if (!panelId) return null;

  const meta = PANEL_META[panelId];
  const body = PANEL_BODY(data)[panelId];
  if (!meta || !body) return null;

  return (
    <Card className="border-[#4a7c59]/40 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#6DDFA0]" aria-hidden="true" />
              <CardTitle className="text-base">{meta.title}</CardTitle>
            </div>
            <CardDescription className="text-[12px]">{meta.description}</CardDescription>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Close detail panel"
          >
            <IconX className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">{body}</CardContent>
    </Card>
  );
}
