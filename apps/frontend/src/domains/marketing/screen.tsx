"use client";

import * as React from "react";
import { IconFileDescription } from "@tabler/icons-react";

import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import Highcharts from "@/shared/charts/highcharts-init";
import { DashboardHighchart, chartColor, createBaseChartOptions, mergeSeriesColors } from "@/shared/charts/highcharts";
import { HighchartsGridPro } from "@/shared/charts/highcharts-grid-pro";

import { DashboardTwoStatCard } from "./widgets/cards";
import {
  statCards,
  trafficWeekLabels,
  trafficOrganic, trafficDirect, trafficPaid, trafficReferral, trafficSocial,
  channelMixData, totalSessions,
  saasFlowFunnel, funnelConvRates,
  campaignLabels, campaignConversions, campaignCTR,
  campaignRows,
  geoData,
  conversionMonths, trialSignups, paidConversions,
  fmtK,
} from "./data/marketing.data";

export function DashboardTwoView() {

  // ── 1. Traffic Acquisition — stacked area, 5 channels ──────────────────────
  const trafficChartOptions = React.useMemo(
    () =>
      createBaseChartOptions({
        chart: { type: "area", height: 280 },
        xAxis: {
          categories: trafficWeekLabels,
          tickLength: 0,
          labels: { style: { fontSize: "11px" } },
        },
        yAxis: {
          title: { text: "" },
          gridLineDashStyle: "Dot",
          labels: {
            formatter: function () {
              return fmtK(Number((this as { value: number }).value));
            },
            style: { fontSize: "11px" },
          },
        },
        tooltip: { shared: true, valueSuffix: " sessions" },
        legend: { enabled: true, itemStyle: { fontSize: "12px" } },
        plotOptions: {
          area: {
            stacking: "normal",
            lineWidth: 0.5,
            marker: { enabled: false },
            fillOpacity: 0.6,
          },
          series: { animation: false },
        },
        series: mergeSeriesColors(
          [
            { type: "area", name: "Organic", data: trafficOrganic },
            { type: "area", name: "Direct", data: trafficDirect },
            { type: "area", name: "Paid Search", data: trafficPaid },
            { type: "area", name: "Referral", data: trafficReferral },
            { type: "area", name: "Social", data: trafficSocial },
          ],
          [chartColor(0), chartColor(1), chartColor(2), chartColor(3), chartColor(4)],
        ),
      }),
    [],
  );

  // ── 2. Channel Mix — donut ──────────────────────────────────────────────────
  const channelDonutOptions = React.useMemo(
    () =>
      createBaseChartOptions({
        chart: { type: "pie", height: 240 },
        title: {
          text: fmtK(totalSessions),
          align: "center",
          verticalAlign: "middle",
          y: 8,
          style: { color: "var(--foreground)", fontSize: "24px", fontWeight: "700" },
        },
        subtitle: {
          text: "Sessions",
          align: "center",
          verticalAlign: "middle",
          y: 32,
          style: { color: "var(--muted-foreground)", fontSize: "12px" },
        },
        legend: {
          enabled: true,
          layout: "horizontal",
          align: "center",
          verticalAlign: "bottom",
          itemStyle: { fontSize: "11px" },
        },
        tooltip: {
          pointFormat: "<b>{point.y:,.0f}</b> ({point.percentage:.1f}%)",
        },
        plotOptions: {
          series: { animation: false },
          pie: {
            innerSize: "60%",
            borderColor: "var(--card)",
            borderWidth: 4,
            dataLabels: { enabled: false },
            showInLegend: true,
          },
        },
        series: [{ type: "pie", name: "Sessions", data: channelMixData }],
      }),
    [],
  );

  // ── 3. SaaS Growth Funnel — Highcharts funnel series ────────────────────────
  const funnelChartOptions = React.useMemo(
    () =>
      createBaseChartOptions({
        chart: { height: 560, marginBottom: 50 },
        legend: { enabled: false },
        tooltip: {
          formatter: function () {
            const self = this as { key: unknown; y: unknown };
            return `<b>${String(self.key)}</b><br/>${fmtK(Number(self.y))} users`;
          },
        },
        plotOptions: {
          funnel: {
            width: "55%",
            neckWidth: "26%",
            neckHeight: "32%",
            dataLabels: {
              enabled: true,
              format:
                "<span style='font-size:12px;font-weight:600;color:var(--foreground)'>{point.name}</span>"
                + "<br/><span style='font-size:11px;color:var(--muted-foreground)'>{point.y:,.0f}</span>",
              softConnector: true,
              connectorColor: "var(--border)",
              style: { textOutline: "none" },
            },
          },
          series: { animation: false },
        },
        series: [
          {
            type: "funnel",
            name: "Users",
            data: saasFlowFunnel.map((s) => ({
              name: s.name,
              y: s.y,
              color: s.color,
            })),
          },
        ] as unknown as Highcharts.SeriesOptionsType[],
      }),
    [],
  );

  // ── 4. Campaign Performance — column + spline combo ─────────────────────────
  const campaignComboOptions = React.useMemo(
    () =>
      createBaseChartOptions({
        chart: { height: 280 },
        xAxis: {
          categories: campaignLabels,
          tickLength: 0,
          labels: { style: { fontSize: "10px" } },
        },
        yAxis: [
          {
            title: { text: "" },
            gridLineDashStyle: "Dot",
            labels: { style: { fontSize: "11px" } },
          },
          {
            title: { text: "" },
            opposite: true,
            labels: {
              formatter: function () {
                return `${(this as { value: number }).value}%`;
              },
              style: { fontSize: "11px" },
            },
            gridLineWidth: 0,
          },
        ],
        tooltip: { shared: true },
        legend: { enabled: true, itemStyle: { fontSize: "12px" } },
        plotOptions: {
          column: { borderWidth: 0, borderRadius: 4 },
          series: { animation: false },
        },
        series: [
          {
            type: "column",
            name: "Conversions",
            data: campaignConversions,
            color: chartColor(0),
            yAxis: 0,
          },
          {
            type: "spline",
            name: "CTR %",
            data: campaignCTR,
            color: chartColor(2),
            yAxis: 1,
            marker: { enabled: true, radius: 4 },
            lineWidth: 2,
          },
        ],
      }),
    [],
  );

  // ── 5. Geographic Distribution — donut ──────────────────────────────────────
  const geoDonutOptions = React.useMemo(
    () =>
      createBaseChartOptions({
        chart: { type: "pie", height: 240 },
        title: {
          text: "Global",
          align: "center",
          verticalAlign: "middle",
          y: 8,
          style: { color: "var(--foreground)", fontSize: "20px", fontWeight: "700" },
        },
        subtitle: {
          text: "Reach",
          align: "center",
          verticalAlign: "middle",
          y: 32,
          style: { color: "var(--muted-foreground)", fontSize: "12px" },
        },
        legend: {
          enabled: true,
          layout: "horizontal",
          align: "center",
          verticalAlign: "bottom",
          itemStyle: { fontSize: "11px" },
        },
        tooltip: {
          pointFormat: "<b>{point.percentage:.1f}%</b> of traffic",
        },
        plotOptions: {
          series: { animation: false },
          pie: {
            innerSize: "60%",
            borderColor: "var(--card)",
            borderWidth: 4,
            dataLabels: { enabled: false },
            showInLegend: true,
          },
        },
        series: [{ type: "pie", name: "Region", data: geoData }],
      }),
    [],
  );

  // ── 6. Trial → Paid — dual-axis line/area ────────────────────────────────────
  const conversionTrendOptions = React.useMemo(
    () =>
      createBaseChartOptions({
        chart: { height: 260 },
        xAxis: {
          categories: conversionMonths,
          tickLength: 0,
          labels: { style: { fontSize: "11px" } },
        },
        yAxis: [
          {
            title: { text: "" },
            gridLineDashStyle: "Dot",
            labels: { style: { fontSize: "11px" } },
          },
          {
            title: { text: "" },
            opposite: true,
            gridLineWidth: 0,
            labels: { style: { fontSize: "11px" } },
          },
        ],
        tooltip: { shared: true },
        legend: { enabled: true, itemStyle: { fontSize: "12px" } },
        plotOptions: {
          areaspline: { fillOpacity: 0.12, marker: { enabled: false } },
          spline: { marker: { enabled: false } },
          series: { animation: false },
        },
        series: [
          {
            type: "areaspline",
            name: "Trial Signups",
            data: trialSignups,
            color: chartColor(0),
            yAxis: 0,
            lineWidth: 2,
          },
          {
            type: "spline",
            name: "Paid Conversions",
            data: paidConversions,
            color: chartColor(1),
            yAxis: 1,
            lineWidth: 2,
            dashStyle: "Dash",
          },
        ],
      }),
    [],
  );

  // ── 7. Active Campaigns — Grid Pro ──────────────────────────────────────────
  const campaignsGridOptions = React.useMemo(
    () => ({
      accessibility: { enabled: false },
      pagination: { enabled: false },
      rendering: {
        theme: "hcg-theme-default",
        rows: { strictHeights: true, minVisibleRows: 7 },
        columns: { resizing: { enabled: false } },
      },
      credits: { enabled: false },
      columnDefaults: {
        sorting: { enabled: false },
        cells: { className: "ra-grid-cell" },
      },
      columns: [
        {
          id: "name",
          header: { format: "Campaign" },
          width: "30%",
          cells: { className: "ra-grid-cell ra-user-cell" },
        },
        {
          id: "channel",
          header: { format: "Channel" },
          width: "14%",
          cells: {
            className: "ra-grid-cell",
            formatter: function () {
              const ch = String((this as { value?: unknown }).value ?? "");
              const colors: Record<string, string> = {
                "Multi-channel": chartColor(0),
                "Email":         chartColor(1),
                "Paid Search":   chartColor(2),
                "Social":        chartColor(3),
                "Events":        chartColor(4),
                "Display":       chartColor(0),
                "Dev Ads":       chartColor(1),
              };
              const c = colors[ch] ?? "#94a3b8";
              return `<span style="background:${c}20;color:${c};border:1px solid ${c}50;border-radius:9999px;padding:2px 8px;font-size:10px;font-weight:700;white-space:nowrap;">${ch}</span>`;
            },
          },
        },
        {
          id: "budget",
          header: { format: "Budget" },
          width: "11%",
          cells: { className: "ra-grid-cell ra-amount-cell" },
        },
        {
          id: "impressions",
          header: { format: "Impressions" },
          width: "13%",
          cells: { className: "ra-grid-cell ra-meta-cell" },
        },
        {
          id: "ctr",
          header: { format: "CTR" },
          width: "8%",
          cells: { className: "ra-grid-cell ra-meta-cell" },
        },
        {
          id: "conversions",
          header: { format: "Conversions" },
          width: "12%",
          cells: { className: "ra-grid-cell ra-meta-cell" },
        },
        {
          id: "status",
          header: { format: "Status" },
          width: "12%",
          cells: {
            className: "ra-grid-cell",
            formatter: function () {
              const s = String((this as { value?: unknown }).value ?? "");
              const isActive = s === "Active";
              const c = isActive ? "#6DDFA0" : "#EBD95F";
              return `<span style="background:${c}20;color:${c};border:1px solid ${c}50;border-radius:9999px;padding:2px 8px;font-size:10px;font-weight:700;">${s}</span>`;
            },
          },
        },
      ],
      dataTable: {
        columns: {
          name:        campaignRows.map((r) => r.name),
          channel:     campaignRows.map((r) => r.channel),
          budget:      campaignRows.map((r) => r.budget),
          impressions: campaignRows.map((r) => r.impressions),
          ctr:         campaignRows.map((r) => r.ctr),
          conversions: campaignRows.map((r) => r.conversions),
          status:      campaignRows.map((r) => r.status),
        },
      },
    }),
    [],
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Header ── */}
      <div className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marketing Dashboard</h1>
          <p className="text-muted-foreground">Highcharts · Q4 2024 — Nov 1–21</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="30d">
            <SelectTrigger className="w-[130px]" aria-label="Date range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="ytd">Year to date</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm">
            <IconFileDescription className="mr-2 size-4" aria-hidden="true" />
            Export
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-6 items-stretch gap-5 lg:grid-cols-12">

        {/* ── Row 1: KPI Stat Cards (6) ── */}
        {statCards.map((card) => (
          <div key={card.title} className="col-span-3 lg:col-span-2">
            <DashboardTwoStatCard card={card} />
          </div>
        ))}

        {/* ── Row 2: Traffic Acquisition + Channel Mix ── */}
        <div className="col-span-6 lg:col-span-8">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle>Traffic Acquisition</CardTitle>
              <CardDescription>Weekly sessions by channel — last 12 weeks</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <DashboardHighchart options={trafficChartOptions} className="h-[280px] w-full" />
            </CardContent>
          </Card>
        </div>

        <div className="col-span-6 lg:col-span-4">
          <Card className="h-full">
            <CardHeader className="pb-0">
              <CardTitle>Channel Mix</CardTitle>
              <CardDescription>Month to date · {(totalSessions / 1000).toFixed(0)}K sessions</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <DashboardHighchart options={channelDonutOptions} className="h-[260px] w-full" />
            </CardContent>
          </Card>
        </div>

        {/* ── Row 3: SaaS Growth Funnel + Campaign Performance ── */}
        <div className="col-span-6 lg:col-span-7">
          <Card className="h-full">
            <CardHeader className="pb-1">
              <CardTitle>SaaS Growth Funnel</CardTitle>
              <CardDescription>Developer journey — discovery to paid · Nov MTD</CardDescription>
            </CardHeader>
            <CardContent className="pb-3">
              <DashboardHighchart options={funnelChartOptions} className="h-[560px] w-full" />

              {/* Conversion rate badges */}
              <div className="mt-3 flex flex-wrap gap-2">
                {funnelConvRates.map((rate) => (
                  <div
                    key={rate.label}
                    className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1"
                  >
                    <span className="text-[11px] text-muted-foreground">{rate.label}</span>
                    <span
                      className="text-[11px] font-bold"
                      style={{ color: rate.color }}
                    >
                      {rate.pct}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-6 lg:col-span-5">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle>Campaign Performance</CardTitle>
              <CardDescription>Conversions &amp; click-through rate by campaign</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <DashboardHighchart options={campaignComboOptions} className="h-[280px] w-full" />
            </CardContent>
          </Card>
        </div>

        {/* ── Row 4: Active Campaigns Table ── */}
        <div className="col-span-6 lg:col-span-12">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Active Campaigns</CardTitle>
                <CardDescription>7 campaigns · $107,600 total budget</CardDescription>
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-[120px]" aria-label="Filter by channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All channels</SelectItem>
                  <SelectItem value="active">Active only</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="pt-0">
              <HighchartsGridPro
                options={campaignsGridOptions}
                className="ra-activity-grid h-[310px]"
              />
            </CardContent>
          </Card>
        </div>

        {/* ── Row 5: Geographic Distribution + Trial → Paid Trend ── */}
        <div className="col-span-6 lg:col-span-4">
          <Card className="h-full">
            <CardHeader className="pb-0">
              <CardTitle>Geographic Distribution</CardTitle>
              <CardDescription>Traffic share by region</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <DashboardHighchart options={geoDonutOptions} className="h-[260px] w-full" />
            </CardContent>
          </Card>
        </div>

        <div className="col-span-6 lg:col-span-8">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle>Trial → Paid Conversion</CardTitle>
              <CardDescription>12-month · signups (left axis) vs paid conversions (right axis)</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <DashboardHighchart options={conversionTrendOptions} className="h-[260px] w-full" />
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
