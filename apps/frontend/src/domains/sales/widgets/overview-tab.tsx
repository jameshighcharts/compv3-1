"use client";

import * as React from "react";

import Highcharts from "@/shared/charts/highcharts-init";
import { DashboardHighchart, chartColor, createBaseChartOptions, mergeSeriesColors } from "@/shared/charts/highcharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

import { ArrKpiCard } from "./cards";
import {
  arrOverviewKpis,
  arrRevenueBreakdownData,
  arrSubscriptionsData,
} from "../data/sales-dashboard.data";

export function DashboardOverviewTab() {
  const arrRevenueChartOptions = React.useMemo(
    () =>
      createBaseChartOptions({
        chart: {
          type: "areaspline",
          height: 300,
          spacing: [12, 6, 8, 4],
        },
        legend: {
          enabled: true,
          align: "left",
          verticalAlign: "top",
          layout: "horizontal",
          itemStyle: { fontWeight: "500", fontSize: "12px" },
        },
        xAxis: {
          categories: arrRevenueBreakdownData.map((point) => point.month),
          tickLength: 0,
          lineWidth: 0,
          labels: { style: { fontSize: "12px" } },
        },
        yAxis: {
          title: { text: undefined },
          labels: { format: "${value}k", style: { fontSize: "12px" } },
          gridLineWidth: 0,
        },
        tooltip: {
          shared: true,
          backgroundColor: "var(--popover)",
          borderWidth: 0,
          borderRadius: 8,
          shadow: false,
          style: { color: "var(--popover-foreground)" },
          pointFormat:
            '<span style="color:{series.color}">\u25CF</span> {series.name}: <b>${point.y:,.0f}k</b><br/>',
        },
        plotOptions: {
          areaspline: {
            lineWidth: 1.5,
            marker: { enabled: false },
          },
          series: {
            animation: false,
          },
        },
        series: mergeSeriesColors(
          [
            {
              type: "areaspline" as const,
              name: "Annual ARR",
              data: arrRevenueBreakdownData.map((point) => point.annual),
              fillColor: {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                stops: [
                  [0, "rgba(128,135,232,0.38)"],
                  [1, "rgba(128,135,232,0)"],
                ],
              } as Highcharts.GradientColorObject,
            },
            {
              type: "areaspline" as const,
              name: "ADV ARR",
              data: arrRevenueBreakdownData.map((point) => point.adv),
              fillColor: {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                stops: [
                  [0, "rgba(241,158,83,0.38)"],
                  [1, "rgba(241,158,83,0)"],
                ],
              } as Highcharts.GradientColorObject,
            },
          ],
          [chartColor(0), chartColor(2)],
        ),
      }),
    [],
  );

  const arrSubscriptionsStackedOptions = React.useMemo(
    () =>
      createBaseChartOptions({
        chart: {
          type: "column",
          height: 300,
          spacing: [12, 6, 0, 4],
        },
        legend: {
          enabled: true,
          align: "left",
          verticalAlign: "top",
          layout: "horizontal",
        },
        xAxis: {
          categories: arrSubscriptionsData.map((point) => point.month),
          tickLength: 0,
        },
        yAxis: {
          title: {
            text: undefined,
          },
          labels: {
            format: "{value}",
          },
          gridLineDashStyle: "Dash",
        },
        tooltip: {
          shared: true,
        },
        plotOptions: {
          series: {
            animation: false,
          },
          column: {
            stacking: "normal",
            borderWidth: 0,
            borderRadius: 4,
            pointPadding: 0.15,
            groupPadding: 0.1,
          },
        },
        series: mergeSeriesColors(
          [
            {
              type: "column",
              name: "New",
              data: arrSubscriptionsData.map((point) => point.new),
            },
            {
              type: "column",
              name: "Renewed",
              data: arrSubscriptionsData.map((point) => point.renewed),
            },
          ],
          [chartColor(0), chartColor(1)],
        ),
      }),
    [],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {arrOverviewKpis.map((kpi) => (
          <ArrKpiCard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            subtitle={kpi.subtitle}
            trend={kpi.trend}
            positive={kpi.positive}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="gap-0 py-0 lg:col-span-3">
          <CardHeader className="p-6 pb-3">
            <CardTitle>Revenue</CardTitle>
            <CardDescription>ARR broken down in Annual and ADV over time.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <DashboardHighchart options={arrRevenueChartOptions} className="h-[300px] w-full" />
          </CardContent>
        </Card>

        <Card className="gap-0 py-0 lg:col-span-2">
          <CardHeader className="p-6 pb-3">
            <CardTitle>Subscriptions</CardTitle>
            <CardDescription>Stacked New and Renewed subscriptions over time.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <DashboardHighchart options={arrSubscriptionsStackedOptions} className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
